export type IndexKind = 'note' | 'todo' | 'reminder';

export const DOC_TYPES = [
  'class', 'meeting', 'idea', 'journal', 'reference', 'task', 'event', 'other',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** The metadata an enricher produces — LLM or heuristic. */
export interface EnrichedMeta {
  summary: string;
  keywords: string[];
  entities: string[];
  doc_type: DocType;
  /** The date the item is ABOUT. Null when nothing in the text implies one. */
  occurred_on: string | null;
}

/** What the enricher is given. */
export interface EnrichInput {
  kind: IndexKind;
  title: string;
  body: string;
  category: string;
}

/** A fully-resolved row ready to write to item_index + item_fts. */
export interface IndexEntry extends EnrichedMeta {
  kind: IndexKind;
  item_id: string;
  title: string;
  category: string;
  status: string | null;
  /** Local YYYY-MM-DD the item was created. Never null — the fallback for occurred_on. */
  created_on: string;
  /** ISO timestamp used for recency ranking. */
  sort_at: string;
  content_hash: string;
  /** Model id that produced the summary, or 'heuristic'. */
  model: string;
  /** Full text indexed for recall; not stored in item_index. */
  body: string;
}

/** One search result, deliberately compact — these go into an LLM context. */
export interface SearchHit {
  ref: string;
  kind: IndexKind;
  title: string;
  summary: string;
  category: string;
  status: string | null;
  date: string;
  score: number;
}
