import { getAllNotes } from './notesEngine.js';
import { getAllTodos } from './todoEngine.js';
import { getAllReminders } from './reminderEngine.js';
import {
  deleteIndexEntries,
  getIndexFingerprints,
  setMeta,
  upsertIndexEntry,
} from '../db/indexRepo.js';
import { hashContent } from './index/contentHash.js';
import { heuristicEnrich } from './index/heuristic.js';
import { parseEnrichJson, truncateForEnrich } from './index/enrichParse.js';
import { diffIndex, HEURISTIC_MODEL, LOCAL_MODEL, type SourceFingerprint } from './index/plan.js';
import { mapWithConcurrency, withRetry, withTimeout } from './index/pool.js';
import type { EnrichedMeta, IndexEntry, IndexKind } from './index/types.js';
import { toLocalYmd, normalizeSqliteIso, ymd } from './dateUtil.js';
import { generate } from './llm.js';
import { indexEnrichPrompt } from '../ai/prompts/system.js';
import { formatOffset } from './reminderTime.js';
import { resolveApiKey, resolveModel, resolveProviderName } from '../ai/settings.js';

/** One source item, normalised across the three tables. */
interface SourceItem extends SourceFingerprint {
  title: string;
  body: string;
  category: string;
  status: string | null;
  created_on: string;
  sort_at: string;
  /** Reminders know their date exactly; nothing needs to infer it. */
  occurred_on: string | null;
  /** Only notes are worth an LLM call. */
  enrichable: boolean;
}

// Groq's free tier rate-limits at 4 concurrent enrichments, so keep the pool
// narrow and lean on retries instead — a 429 is transient, and degrading to a
// heuristic summary because of one is throwing away a good summary.
export const ENRICH_CONCURRENCY = 2;
export const ENRICH_TIMEOUT_MS = 45_000;
/** Consecutive failures after which we stop calling the LLM for this run. */
export const CIRCUIT_BREAKER_THRESHOLD = 5;

function collectSources(now: Date): Promise<SourceItem[]> {
  return getAllNotes().then(notes => {
    const items: SourceItem[] = [];
    const fallbackDay = ymd(now);

    for (const note of notes) {
      items.push({
        kind: 'note',
        item_id: note.meta.id,
        title: note.meta.title,
        body: note.content,
        category: note.meta.category,
        status: null,
        created_on: toLocalYmd(note.meta.created_at) ?? fallbackDay,
        sort_at: normalizeSqliteIso(note.meta.updated_at),
        occurred_on: null,
        enrichable: true,
        content_hash: hashContent([note.meta.title, note.meta.category, note.content]),
      });
    }

    for (const todo of getAllTodos()) {
      items.push({
        kind: 'todo',
        item_id: String(todo.id),
        title: todo.description,
        body: '',
        category: todo.category,
        status: todo.status,
        created_on: toLocalYmd(todo.created_at) ?? fallbackDay,
        sort_at: normalizeSqliteIso(todo.created_at),
        occurred_on: null,
        // A todo IS the one-liner — an LLM adds latency and cost, not meaning.
        enrichable: false,
        content_hash: hashContent([todo.description, todo.category, todo.status]),
      });
    }

    for (const reminder of getAllReminders()) {
      items.push({
        kind: 'reminder',
        item_id: String(reminder.id),
        title: reminder.message,
        body: '',
        category: 'default',
        status: reminder.triggered ? 'triggered' : 'pending',
        created_on: toLocalYmd(reminder.created_at) ?? fallbackDay,
        sort_at: normalizeSqliteIso(reminder.scheduled_at),
        // Exact, not inferred.
        occurred_on: toLocalYmd(reminder.scheduled_at),
        enrichable: false,
        content_hash: hashContent([
          reminder.message,
          reminder.scheduled_at,
          String(reminder.triggered),
        ]),
      });
    }

    return items;
  });
}

async function enrichWithLlm(item: SourceItem, now: Date): Promise<EnrichedMeta> {
  const systemPrompt = indexEnrichPrompt(ymd(now), formatOffset(now));
  const prompt = [
    `TITLE: ${item.title}`,
    `CATEGORY: ${item.category}`,
    `CREATED: ${item.created_on}`,
    'CONTENT:',
    truncateForEnrich(item.body),
  ].join('\n');

  const raw = await withRetry(() =>
    withTimeout(
      generate(prompt, { systemPrompt }),
      ENRICH_TIMEOUT_MS,
      `enrichment of "${item.title}"`,
    ),
  );

  const parsed = parseEnrichJson(raw);
  if (!parsed) throw new Error('enrichment returned no usable JSON');
  return parsed;
}

function toEntry(item: SourceItem, meta: EnrichedMeta, model: string): IndexEntry {
  return {
    kind: item.kind,
    item_id: item.item_id,
    title: item.title,
    category: item.category,
    status: item.status,
    created_on: item.created_on,
    sort_at: item.sort_at,
    content_hash: item.content_hash,
    model,
    body: item.body,
    summary: meta.summary,
    keywords: meta.keywords,
    entities: meta.entities,
    doc_type: meta.doc_type,
    // A reminder's own schedule always beats an inferred date.
    occurred_on: item.occurred_on ?? meta.occurred_on,
  };
}

export interface ReindexResult {
  total: number;
  enriched: number;
  heuristic: number;
  skipped: number;
  deleted: number;
  failures: string[];
  /** Set when the circuit breaker tripped, explaining why. */
  llmDisabledReason: string | null;
}

export interface ReindexOptions {
  full?: boolean;
  /** Called after each batch so the TUI can update a live feed entry. */
  onProgress?: (done: number, total: number, label: string) => void;
  now?: Date;
}

/**
 * Rebuilds the retrieval index.
 *
 * Deliberately manual (there is no post-save hook), incremental by content
 * hash, and degradable: any item whose LLM enrichment fails falls back to the
 * local heuristic and is marked so the next run retries it.
 */
export async function reindexAll(options: ReindexOptions = {}): Promise<ReindexResult> {
  const now = options.now ?? new Date();
  const sources = await collectSources(now);
  const plan = diffIndex(sources, getIndexFingerprints(), { full: options.full === true });

  const byKey = new Map(sources.map(item => [`${item.kind}:${item.item_id}`, item]));
  const queue = plan.toEnrich
    .map(ref => byKey.get(`${ref.kind}:${ref.item_id}`))
    .filter((item): item is SourceItem => item !== undefined);

  deleteIndexEntries(plan.toDelete);

  const provider = resolveProviderName();
  const model = resolveModel(provider);
  let llmDisabledReason: string | null = resolveApiKey(provider)
    ? null
    : `no API key for ${provider} — indexed with local heuristics only`;

  let consecutiveFailures = 0;
  let enriched = 0;
  let heuristic = 0;
  let done = 0;
  const failures: string[] = [];

  const results = await mapWithConcurrency(queue, ENRICH_CONCURRENCY, async (item) => {
    // Todos and reminders never touch the LLM; notes stop once the breaker trips.
    const useLlm = item.enrichable && llmDisabledReason === null;

    let meta: EnrichedMeta;
    // Items we never send to an LLM are tagged LOCAL_MODEL, not HEURISTIC_MODEL,
    // so the retry rule does not rewrite every todo on every run.
    let usedModel = item.enrichable ? HEURISTIC_MODEL : LOCAL_MODEL;

    if (useLlm) {
      try {
        meta = await enrichWithLlm(item, now);
        usedModel = model;
        consecutiveFailures = 0;
        enriched++;
      } catch (err) {
        consecutiveFailures++;
        failures.push(`${item.title}: ${err instanceof Error ? err.message : String(err)}`);
        // Retryable errors already exhausted their backoff, so a run of them
        // means the provider is genuinely unavailable rather than momentarily busy.
        if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD && llmDisabledReason === null) {
          // Five failures in a row means the key, quota or network is broken,
          // not the note. Finish the run locally instead of timing out on
          // every remaining item.
          llmDisabledReason =
            `LLM unavailable after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures `
            + `(${err instanceof Error ? err.message : String(err)})`;
        }
        meta = heuristicEnrich(item);
        heuristic++;
      }
    } else {
      meta = heuristicEnrich(item);
      heuristic++;
    }

    upsertIndexEntry(toEntry(item, meta, usedModel));
    done++;
    options.onProgress?.(done, queue.length, item.title);
    return true;
  });

  for (const result of results) {
    if (!result.ok) {
      failures.push(result.error instanceof Error ? result.error.message : String(result.error));
    }
  }

  setMeta('index_dirty', '0');
  setMeta('indexed_at', now.toISOString());

  return {
    total: sources.length,
    enriched,
    heuristic,
    skipped: plan.toSkip.length,
    deleted: plan.toDelete.length,
    failures,
    llmDisabledReason,
  };
}

/** Human-readable one-liner for the feed. */
export function formatReindexResult(result: ReindexResult, elapsedMs: number): string {
  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  const parts = [
    `Indexed ${result.total} item${result.total === 1 ? '' : 's'} in ${seconds}s`,
    `${result.enriched} enriched`,
    `${result.heuristic} heuristic`,
    `${result.skipped} unchanged`,
  ];
  if (result.deleted > 0) parts.push(`${result.deleted} stale removed`);
  if (result.failures.length > 0) parts.push(`${result.failures.length} failed`);

  let line = parts.join(' · ');
  if (result.llmDisabledReason) {
    line += `\n⚠ ${result.llmDisabledReason}. Fix with /config, then run /reindex again.`;
  }
  return line;
}

export type { IndexKind };
