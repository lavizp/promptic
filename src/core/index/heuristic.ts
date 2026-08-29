import type { DocType, EnrichInput, EnrichedMeta } from './types.js';
import { isValidYmd } from '../dateUtil.js';

export const SUMMARY_MAX = 140;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'had', 'was', 'were',
  'are', 'you', 'your', 'but', 'not', 'all', 'can', 'will', 'would', 'should', 'could',
  'about', 'into', 'than', 'then', 'them', 'they', 'their', 'there', 'here', 'what', 'when',
  'which', 'who', 'whom', 'how', 'why', 'its', 'it', 'been', 'being', 'more', 'most', 'some',
  'such', 'only', 'other', 'over', 'also', 'just', 'like', 'get', 'got', 'out', 'off',
  'per', 'via', 'one', 'two', 'new', 'use', 'used', 'using', 'make', 'made', 'need',
  'needs', 'want', 'wants', 'each', 'both', 'any', 'few', 'because', 'while', 'after',
  'before', 'between', 'during', 'through', 'under', 'above', 'again', 'once', 'very',
  'too', 'own', 'same', 'does', 'did', 'doing', 'done', 'were', 'our', 'his', 'her', 'him',
  'she', 'were', 'may', 'might', 'must', 'shall', 'let', 'lets',
]);

/** Strips the markdown that would otherwise leak into a one-line summary. */
export function stripMarkdown(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^\s*>\s?/, '')
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncates on a word boundary so a summary never ends mid-word. */
export function truncateSummary(text: string, max = SUMMARY_MAX): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * First line with actual prose in it. Headings and list bullets are skipped
 * where possible because "## Lecture 9" describes the note far less than the
 * sentence under it — but a heading is still better than nothing.
 */
function firstProseLine(body: string): string {
  const lines = body.split('\n').map(l => l.trim()).filter(l => l !== '');
  const prose = lines.find(l => !/^(#{1,6}\s|[-*+]\s|\d+[.)]\s|```|---|\|)/.test(l));
  const chosen = prose ?? lines.find(l => !/^(```|---)/.test(l)) ?? '';
  return stripMarkdown(chosen);
}

export function extractKeywords(text: string, limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) ?? []) {
    const word = raw.replace(/^['-]+|['-]+$/g, '');
    if (word.length < 3 || STOPWORDS.has(word) || /^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Capitalised words that aren't sentence-initial — a cheap proxy for people,
 * courses and projects. Wrong sometimes; useful often, and it costs nothing.
 */
export function extractEntities(text: string, limit = 6): string[] {
  const found = new Set<string>();
  for (const sentence of text.split(/(?<=[.!?\n])\s+/)) {
    const words = sentence.trim().split(/\s+/);
    words.forEach((word, i) => {
      const clean = word.replace(/[^A-Za-z0-9'-]/g, '');
      if (i === 0 || clean.length < 3) return;
      if (!/^[A-Z][a-z'-]+$/.test(clean)) return;
      if (STOPWORDS.has(clean.toLowerCase())) return;
      found.add(clean);
    });
  }
  return [...found].slice(0, limit);
}

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';

/** Only matches an explicit YYYY-MM-DD; anything vaguer is the LLM's job. */
export function findExplicitDate(text: string): string | null {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso?.[1] && isValidYmd(iso[1])) return iso[1];
  return null;
}

export function hasDateHint(text: string): boolean {
  return new RegExp(`\\b(${MONTHS})[a-z]*\\s+\\d{1,2}\\b`, 'i').test(text)
    || /\b\d{4}-\d{2}-\d{2}\b/.test(text);
}

function defaultDocType(kind: EnrichInput['kind']): DocType {
  if (kind === 'todo') return 'task';
  if (kind === 'reminder') return 'event';
  return 'other';
}

/**
 * The no-LLM path. Used for todos and reminders always (they are already
 * one-liners, so an LLM adds latency and cost but no information), and for
 * notes whenever enrichment fails or no API key is configured.
 */
export function heuristicEnrich(input: EnrichInput): EnrichedMeta {
  const { title, body, kind } = input;
  const summarySource = firstProseLine(body) || stripMarkdown(title);
  const haystack = `${title}\n${body}`;

  const titleWords = extractKeywords(title, 4);
  const bodyWords = extractKeywords(body, 8);
  const keywords = [...new Set([...titleWords, ...bodyWords])].slice(0, 8);

  return {
    summary: truncateSummary(summarySource || title || '(empty)'),
    keywords,
    entities: extractEntities(haystack),
    doc_type: defaultDocType(kind),
    occurred_on: findExplicitDate(haystack),
  };
}
