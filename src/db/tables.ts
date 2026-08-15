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
  `);
}
