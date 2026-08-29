import { getDb } from './connection.js';
import { isFtsAvailable } from './tables.js';
import type { IndexEntry, IndexKind } from '../core/index/types.js';
import type { IndexedFingerprint } from '../core/index/plan.js';

/**
 * The only code that writes item_index / item_fts.
 *
 * Because indexing is manual there is no second writer to race with, which is
 * why the FTS table is a plain (not external-content) one with no triggers:
 * triggers would keep `body` in sync while leaving the LLM-authored `summary`
 * stale, so a row would *look* fresh while being wrong.
 */

export interface IndexRef {
  kind: IndexKind;
  item_id: string;
}

export function getIndexFingerprints(): IndexedFingerprint[] {
  const db = getDb();
  return db
    .prepare('SELECT kind, item_id, content_hash, model FROM item_index')
    .all() as IndexedFingerprint[];
}

export function countIndexed(): number {
  const db = getDb();
  const row = db.prepare('SELECT count(*) AS c FROM item_index').get() as { c: number };
  return row.c;
}

/** Insert-or-update one item, keeping both tables in one transaction. */
export function upsertIndexEntry(entry: IndexEntry): void {
  const db = getDb();
  const withFts = isFtsAvailable(db);

  db.transaction(() => {
    const existing = db
      .prepare('SELECT id FROM item_index WHERE kind = ? AND item_id = ?')
      .get(entry.kind, entry.item_id) as { id: number } | undefined;

    const values = [
      entry.title,
      entry.summary,
      entry.keywords.join(' '),
      entry.entities.join(', '),
      entry.doc_type,
      entry.category,
      entry.status,
      entry.occurred_on,
      entry.created_on,
      entry.sort_at,
      entry.content_hash,
      new Date().toISOString(),
      entry.model,
    ];

    let id: number;
    if (existing) {
      id = existing.id;
      db.prepare(
        `UPDATE item_index SET
           title = ?, summary = ?, keywords = ?, entities = ?, doc_type = ?,
           category = ?, status = ?, occurred_on = ?, created_on = ?, sort_at = ?,
           content_hash = ?, indexed_at = ?, model = ?
         WHERE id = ?`,
      ).run(...values, id);
    } else {
      const result = db.prepare(
        `INSERT INTO item_index
           (kind, item_id, title, summary, keywords, entities, doc_type,
            category, status, occurred_on, created_on, sort_at,
            content_hash, indexed_at, model)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(entry.kind, entry.item_id, ...values);
      id = Number(result.lastInsertRowid);
    }

    if (withFts) {
      // Delete-then-insert keyed on the shared rowid is what makes reindexing
      // the same item twice leave one FTS row rather than two.
      db.prepare('DELETE FROM item_fts WHERE rowid = ?').run(id);
      db.prepare(
        `INSERT INTO item_fts (rowid, title, summary, keywords, entities, body)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, entry.title, entry.summary, entry.keywords.join(' '), entry.entities.join(', '), entry.body);
    }
  })();
}

/** Removes entries whose source rows are gone. */
export function deleteIndexEntries(refs: IndexRef[]): void {
  if (refs.length === 0) return;
  const db = getDb();
  const withFts = isFtsAvailable(db);

  db.transaction(() => {
    for (const ref of refs) {
      const existing = db
        .prepare('SELECT id FROM item_index WHERE kind = ? AND item_id = ?')
        .get(ref.kind, ref.item_id) as { id: number } | undefined;
      if (!existing) continue;
      if (withFts) db.prepare('DELETE FROM item_fts WHERE rowid = ?').run(existing.id);
      db.prepare('DELETE FROM item_index WHERE id = ?').run(existing.id);
    }
  })();
}

export function clearIndex(): void {
  const db = getDb();
  const withFts = isFtsAvailable(db);
  db.transaction(() => {
    if (withFts) db.exec('DELETE FROM item_fts');
    db.exec('DELETE FROM item_index');
  })();
}

export function setMeta(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
}

export function getMeta(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}
