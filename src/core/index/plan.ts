import type { IndexKind } from './types.js';

export interface SourceFingerprint {
  kind: IndexKind;
  item_id: string;
  content_hash: string;
}

export interface IndexedFingerprint extends SourceFingerprint {
  model: string;
}

export interface IndexPlan {
  toEnrich: SourceFingerprint[];
  toSkip: SourceFingerprint[];
  toDelete: { kind: IndexKind; item_id: string }[];
}

/** A note whose LLM enrichment failed — retried on the next run. */
export const HEURISTIC_MODEL = 'heuristic';
/**
 * An item indexed locally on purpose (todos and reminders are already
 * one-liners). Distinct from HEURISTIC_MODEL so the self-healing retry does not
 * rewrite every todo on every run.
 */
export const LOCAL_MODEL = 'local';

function key(ref: { kind: IndexKind; item_id: string }): string {
  return `${ref.kind}:${ref.item_id}`;
}

/**
 * Decides what a reindex actually has to do.
 *
 * Pure so the whole policy is testable without a database. Rules:
 *  - hash changed or never indexed  -> enrich
 *  - hash matches but the last pass fell back to the heuristic -> enrich again,
 *    so an item indexed while the API key was missing heals itself on the next
 *    run instead of staying degraded forever
 *  - hash matches and a real model produced it -> skip
 *  - indexed but no longer in the source tables -> delete
 */
export function diffIndex(
  sources: SourceFingerprint[],
  indexed: IndexedFingerprint[],
  opts: { full?: boolean } = {},
): IndexPlan {
  const full = opts.full === true;
  const byKey = new Map(indexed.map(entry => [key(entry), entry]));

  const toEnrich: SourceFingerprint[] = [];
  const toSkip: SourceFingerprint[] = [];

  for (const source of sources) {
    const existing = byKey.get(key(source));
    if (full || !existing) {
      toEnrich.push(source);
    } else if (existing.content_hash !== source.content_hash) {
      toEnrich.push(source);
    } else if (existing.model === HEURISTIC_MODEL) {
      // Fell back last time (missing key, rate limit); try for a real summary.
      toEnrich.push(source);
    } else {
      toSkip.push(source);
    }
  }

  const liveKeys = new Set(sources.map(key));
  const toDelete = indexed
    .filter(entry => !liveKeys.has(key(entry)))
    .map(entry => ({ kind: entry.kind, item_id: entry.item_id }));

  return { toEnrich, toSkip, toDelete };
}
