import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/brain.sqlite');

const SCHEMA_VERSION = 4;

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    try {
      db = new Database(DB_PATH);
    } catch (err) {
      throw new Error(`Failed to open database at ${DB_PATH}: ${err}`);
    }
    db.exec('PRAGMA journal_mode = WAL');
    initSchema(db);
    migrate(db);
  }
  return db;
}

function initSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      name       TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS note_categories (
      name       TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

function migrate(db: Database) {
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

  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('schema_version', String(SCHEMA_VERSION));
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
