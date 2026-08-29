import { getDb } from '../db/index.js';
import { isFtsAvailable } from '../db/tables.js';
import { buildFtsQuery, tokenize } from './index/ftsQuery.js';
import { resolveDateRange } from './dateUtil.js';
import type { SQLQueryBindings } from 'bun:sqlite';
import type { IndexKind, SearchHit } from './index/types.js';

export interface SearchOptions {
  query: string;
  kinds?: IndexKind[];
  /** YYYY-MM-DD, or a keyword like today / yesterday / this_week. */
  from?: string;
  to?: string;
  status?: string;
  category?: string;
  limit?: number;
}

interface SearchRow {
  kind: IndexKind;
  item_id: string;
  title: string;
  summary: string;
  category: string;
  status: string | null;
  effective_date: string;
  score: number;
}

export const DEFAULT_SEARCH_LIMIT = 8;
export const MAX_SEARCH_LIMIT = 20;

function toHit(row: SearchRow): SearchHit {
  return {
    ref: `${row.kind}:${row.item_id}`,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    category: row.category,
    status: row.status,
    date: row.effective_date,
    score: Number(row.score.toFixed(4)),
  };
}

/**
 * Turns the caller's date inputs into an inclusive YYYY-MM-DD range.
 * Accepts keywords on either end so "yesterday" works whether the agent
 * resolved it or passed it through verbatim.
 */
function resolveBounds(
  from: string | undefined,
  to: string | undefined,
  now: Date,
): { from: string; to: string } | null {
  if (!from && !to) return null;
  const start = from ? resolveDateRange(from, now) : null;
  const end = to ? resolveDateRange(to, now) : null;
  if (!start && !end) return null;
  return {
    from: start?.from ?? end!.from,
    // A single keyword like `this_week` carries its own end date, so only fall
    // back to the start's end when no explicit `to` was given.
    to: end?.to ?? start!.to,
  };
}

/**
 * Ranked search across notes, todos and reminders.
 *
 * bm25 weights put the title above the summary above keywords, matching how a
 * person scans a list. Filtering uses COALESCE(occurred_on, created_on) so a
 * note about yesterday's class is found by date even if it was typed today.
 */
export function searchIndex(options: SearchOptions, now: Date = new Date()): SearchHit[] {
  const db = getDb();
  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_SEARCH_LIMIT), MAX_SEARCH_LIMIT);

  const where: string[] = [];
  const params: SQLQueryBindings[] = [];

  if (options.kinds && options.kinds.length > 0) {
    where.push(`i.kind IN (${options.kinds.map(() => '?').join(', ')})`);
    params.push(...options.kinds);
  }
  if (options.status) {
    where.push('i.status = ?');
    params.push(options.status);
  }
  if (options.category) {
    where.push('i.category = ?');
    params.push(options.category);
  }

  const bounds = resolveBounds(options.from, options.to, now);
  if (bounds) {
    where.push('COALESCE(i.occurred_on, i.created_on) BETWEEN ? AND ?');
    params.push(bounds.from, bounds.to);
  }

  // Structural filters alone are a meaningful query: "pending todos" needs no
  // text match at all.
  const hasFilters = where.length > 0;

  const match = buildFtsQuery(options.query);
  if (isFtsAvailable(db) && match !== null) {
    const clause = hasFilters ? `AND ${where.join(' AND ')}` : '';
    const rows = db.prepare(
      `SELECT i.kind, i.item_id, i.title, i.summary, i.category, i.status,
              COALESCE(i.occurred_on, i.created_on) AS effective_date,
              bm25(item_fts, 4.0, 3.0, 2.0, 1.5, 1.0) AS score
       FROM item_fts
       JOIN item_index i ON i.id = item_fts.rowid
       WHERE item_fts MATCH ? ${clause}
       ORDER BY score ASC, i.sort_at DESC
       LIMIT ?`,
    ).all(match, ...params, limit) as SearchRow[];

    if (rows.length > 0) return rows.map(toHit);

    // No lexical hit, but the caller narrowed by kind/status/date — return that
    // slice rather than nothing. This is what makes "what work do I have left
    // today" work: none of those words appear in a todo called "dsa", yet the
    // pending-todo filter is exactly the right answer.
    if (hasFilters) return listByFilters(where, params, limit);
    return [];
  }

  // FTS unavailable, or the query reduced to nothing searchable (e.g. "???").
  // A LIKE scan over the metadata is the honest fallback.
  const terms = tokenize(options.query).slice(0, 6);
  if (terms.length > 0) {
    const haystack = "(i.title || ' ' || i.summary || ' ' || i.keywords || ' ' || i.entities)";
    where.push(`(${terms.map(() => `lower(${haystack}) LIKE ?`).join(' OR ')})`);
    params.push(...terms.map(term => `%${term}%`));
  }
  return listByFilters(where, params, limit);
}

/** Filter-only listing, newest first. */
function listByFilters(where: string[], params: SQLQueryBindings[], limit: number): SearchHit[] {
  const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const rows = getDb().prepare(
    `SELECT i.kind, i.item_id, i.title, i.summary, i.category, i.status,
            COALESCE(i.occurred_on, i.created_on) AS effective_date,
            0.0 AS score
     FROM item_index i
     ${clause}
     ORDER BY i.sort_at DESC
     LIMIT ?`,
  ).all(...params, limit) as SearchRow[];
  return rows.map(toHit);
}

/** Recent items by date, for "what did I write yesterday" style questions. */
export function listRecent(
  options: Omit<SearchOptions, 'query'>,
  now: Date = new Date(),
): SearchHit[] {
  return searchIndex({ ...options, query: '' }, now);
}
