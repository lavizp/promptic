import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/brain.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    try {
      db = new Database(DB_PATH);
    } catch (err) {
      throw new Error(`Failed to open database at ${DB_PATH}: ${err}`);
    }
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      category    TEXT NOT NULL CHECK(category IN ('work','fitness','personal')),
      type        TEXT NOT NULL CHECK(type IN ('daily','backlog')) DEFAULT 'daily',
      status      TEXT NOT NULL CHECK(status IN ('pending','completed')) DEFAULT 'pending',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      message     TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      triggered   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS links (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      source_note_id TEXT NOT NULL,
      target_note_id TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
