import type { Database } from 'bun:sqlite';

export const SCHEMA_VERSION = 6;

export function migrate(db: Database) {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value: string } | undefined;
  const version = row ? Number.parseInt(row.value, 10) : 0;
  if (version >= SCHEMA_VERSION) return;

  if (version < 2) {
    // Categories replace the hardcoded work|fitness|personal CHECK and the
    // daily/backlog type. Preserve existing categories and their todos.
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        name       TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO categories (name) VALUES ('default');
      INSERT OR IGNORE INTO categories (name) SELECT DISTINCT category FROM todos WHERE category IS NOT NULL;

      CREATE TABLE todos_new (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        description  TEXT NOT NULL,
        category     TEXT NOT NULL DEFAULT 'default',
        status       TEXT NOT NULL CHECK(status IN ('pending','completed')) DEFAULT 'pending',
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );

      INSERT INTO todos_new (id, description, category, status, created_at, completed_at)
        SELECT id, description, category, status, created_at, completed_at FROM todos;

      DROP TABLE todos;
      ALTER TABLE todos_new RENAME TO todos;
    `);
  }

  if (version < 3) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS note_categories (
        name       TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO note_categories (name) VALUES ('default');
    `);
  }

  if (version < 4) {
    // The link/wiki feature was removed.
    db.exec(`DROP TABLE IF EXISTS links;`);
  }

  if (version < 5) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id         TEXT PRIMARY KEY,
        title      TEXT NOT NULL,
        category   TEXT NOT NULL DEFAULT 'default',
        content    TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  if (version < 6) {
    // initSchema already created item_index, item_fts and the new indexes with
    // IF NOT EXISTS, so there is nothing to add here. What an *existing* user
    // needs is a nudge: they have notes, todos and reminders but an empty
    // index, and indexing is manual. HomeView reads this flag.
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('index_dirty', '1');
  }

  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('schema_version', String(SCHEMA_VERSION));
}
