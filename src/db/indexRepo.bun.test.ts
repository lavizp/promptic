/**
 * DB-backed tests. These import `bun:sqlite`, so they run under `bun test`
 * (`npm run test:db`), not Vitest — hence the `.bun.test.ts` suffix.
 */
import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema, isFtsAvailable } from './tables.js';
import { migrate, SCHEMA_VERSION } from './migrations.js';

let db: Database;

function freshDb(): Database {
  const database = new Database(':memory:');
  initSchema(database);
  migrate(database);
  return database;
}

beforeEach(() => { db = freshDb(); });
afterAll(() => { db?.close(); });

describe('migration v6', () => {
  it('creates the index tables and records the version', () => {
    const version = db.prepare("SELECT value FROM meta WHERE key='schema_version'").get() as { value: string };
    expect(Number(version.value)).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(6);

    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[])
      .map(r => r.name);
    expect(tables).toContain('item_index');
    expect(tables).toContain('item_fts');
  });

  it('detects FTS5 and flags an existing brain as needing indexing', () => {
    expect(isFtsAvailable(db)).toBe(true);
    const dirty = db.prepare("SELECT value FROM meta WHERE key='index_dirty'").get() as { value: string };
    expect(dirty.value).toBe('1');
  });

  it('is idempotent when run twice', () => {
    expect(() => { initSchema(db); migrate(db); }).not.toThrow();
  });
});

describe('FTS5 behaviour the indexer depends on', () => {
  const insert = (id: number, title: string, summary: string, keywords: string, body: string) => {
    db.prepare('DELETE FROM item_fts WHERE rowid = ?').run(id);
    db.prepare(
      'INSERT INTO item_fts (rowid, title, summary, keywords, entities, body) VALUES (?,?,?,?,?,?)',
    ).run(id, title, summary, keywords, '', body);
  };

  it('leaves one row after indexing the same item twice', () => {
    // Delete-then-insert on the shared rowid is what makes /reindex idempotent;
    // without the delete, every run would duplicate every document.
    insert(1, 'Optics', 'Snell law', 'lens optics', 'body');
    insert(1, 'Optics', 'Snell law', 'lens optics', 'body');
    const count = db.prepare('SELECT count(*) c FROM item_fts').get() as { c: number };
    expect(count.c).toBe(1);
  });

  it('ranks the title above the body via weighted bm25', () => {
    insert(1, 'Optics lecture', 'unrelated', '', 'nothing here');
    insert(2, 'Shopping list', 'unrelated', '', 'optics mentioned once in passing');
    const rows = db.prepare(
      `SELECT rowid, bm25(item_fts, 4.0, 3.0, 2.0, 1.5, 1.0) s
       FROM item_fts WHERE item_fts MATCH ? ORDER BY s ASC`,
    ).all('"optics"*') as { rowid: number }[];
    expect(rows[0]!.rowid).toBe(1);
  });

  it('matches prefixes through the porter tokenizer', () => {
    insert(1, 'Optics', 'thin lenses and refraction', 'lens', 'body');
    const rows = db.prepare('SELECT rowid FROM item_fts WHERE item_fts MATCH ?').all('"lens"*');
    expect(rows).toHaveLength(1);
  });
});
