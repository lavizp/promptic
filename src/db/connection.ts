import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSchema } from './tables.js';
import { migrate } from './migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/brain.sqlite');

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

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
