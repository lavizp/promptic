import type { Database } from 'bun:sqlite';

export function initSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      name       TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS note_categories (
      name       TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      category   TEXT NOT NULL DEFAULT 'default',
      content    TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      description  TEXT NOT NULL,
      category     TEXT NOT NULL DEFAULT 'default',
      status       TEXT NOT NULL CHECK(status IN ('pending','completed')) DEFAULT 'pending',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      message     TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      triggered   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- One retrieval index across all three item types, so a single search
    -- serves notes, todos and reminders together.
    --
    -- Three date columns rather than one, because they answer different
    -- questions: occurred_on is what the item is ABOUT (nullable — null means
    -- the text implied no date), created_on is when it was written, and
    -- sort_at drives recency. Filtering uses COALESCE(occurred_on, created_on),
    -- which keeps "notes about last Friday's class, typed on Sunday" correct.
    CREATE TABLE IF NOT EXISTS item_index (
      id           INTEGER PRIMARY KEY,
      kind         TEXT NOT NULL CHECK(kind IN ('note','todo','reminder')),
      item_id      TEXT NOT NULL,
      title        TEXT NOT NULL DEFAULT '',
      summary      TEXT NOT NULL DEFAULT '',
      keywords     TEXT NOT NULL DEFAULT '',
      entities     TEXT NOT NULL DEFAULT '',
      doc_type     TEXT NOT NULL DEFAULT 'other',
      category     TEXT NOT NULL DEFAULT 'default',
      status       TEXT,
      occurred_on  TEXT,
      created_on   TEXT NOT NULL,
      sort_at      TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      indexed_at   TEXT NOT NULL DEFAULT (datetime('now')),
      model        TEXT NOT NULL DEFAULT 'heuristic',
      UNIQUE(kind, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_item_index_kind_sort ON item_index(kind, sort_at DESC);
    CREATE INDEX IF NOT EXISTS idx_item_index_dates     ON item_index(occurred_on, created_on);
    CREATE INDEX IF NOT EXISTS idx_item_index_status    ON item_index(kind, status);

    -- The base tables have never had indexes; the agent's list tools hit them
    -- on every turn.
    CREATE INDEX IF NOT EXISTS idx_todos_status_created ON todos(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reminders_sched      ON reminders(triggered, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_notes_updated        ON notes(updated_at DESC);
  `);

  initFts(db);
}

/**
 * FTS5 is compiled into Bun's SQLite, but a hand-built or stripped SQLite would
 * not have it — and `getDb()` running at startup must never throw. The result
 * is recorded so the search layer can fall back to LIKE scanning.
 *
 * `item_fts.rowid` mirrors `item_index.id`, which is what lets a single
 * `DELETE FROM item_fts WHERE rowid = ?` keep reindexing idempotent.
 */
export function initFts(db: Database): boolean {
  let available = false;
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS item_fts USING fts5(
        title, summary, keywords, entities, body,
        tokenize = 'porter unicode61'
      );
    `);
    available = true;
  } catch {
    available = false;
  }
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
    .run('fts_available', available ? '1' : '0');
  return available;
}

export function isFtsAvailable(db: Database): boolean {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'fts_available'").get() as
    | { value: string }
    | undefined;
  return row?.value === '1';
}
