import { DOC_TYPES, type DocType, type EnrichedMeta } from './types.js';
import { isValidYmd } from '../dateUtil.js';
import { SUMMARY_MAX, truncateSummary } from './heuristic.js';

function asStringArray(value: unknown, limit: number, lowercase: boolean): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const clean = lowercase ? entry.trim().toLowerCase() : entry.trim();
    if (clean === '') continue;
    seen.add(clean);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

/**
 * Tolerantly parses the enrichment response, mirroring `parseReminderJson`'s
 * brace-slicing so a model that wraps its JSON in prose or fences still works.
 *
 * Every field is clamped rather than trusted: the model is free to return a
 * 400-char summary, `doc_type: "lecture"`, `keywords` as a comma string, or
 * `occurred_on: "2026-13-01"`. Returns null only when there is no usable
 * summary at all, which tells the caller to fall back to the heuristic.
 */
export function parseEnrichJson(text: string): EnrichedMeta | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

  const obj = parsed as Record<string, unknown>;

  const rawSummary = typeof obj['summary'] === 'string' ? obj['summary'].trim() : '';
  if (rawSummary === '') return null;

  const rawDocType = typeof obj['doc_type'] === 'string' ? obj['doc_type'].trim().toLowerCase() : '';
  const doc_type: DocType = (DOC_TYPES as readonly string[]).includes(rawDocType)
    ? (rawDocType as DocType)
    : 'other';

  const rawDate = typeof obj['occurred_on'] === 'string' ? obj['occurred_on'].trim() : '';
  const occurred_on = isValidYmd(rawDate) ? rawDate : null;

  return {
    summary: truncateSummary(rawSummary, SUMMARY_MAX),
    keywords: asStringArray(obj['keywords'], 10, true),
    entities: asStringArray(obj['entities'], 8, false),
    doc_type,
    occurred_on,
  };
}

/**
 * Keeps a long note inside the enrichment budget while preserving both ends.
 * The tail matters: conclusions and action items live at the bottom of a class
 * note, and a head-only truncation would drop exactly what makes it findable.
 */
export function truncateForEnrich(content: string, max = 4000): string {
  if (content.length <= max) return content;
  const head = Math.floor(max * 0.75);
  const tail = max - head;
  return `${content.slice(0, head)}\n…[truncated]…\n${content.slice(-tail)}`;
}
