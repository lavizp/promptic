import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/index.js';
import type { Database } from 'bun:sqlite';
import type { Note, NoteMeta } from '../types/note.js';
import type { Category } from '../types/todo.js';
import { parseNoteFile, DEFAULT_NOTE_CATEGORY } from './noteFile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = path.resolve(__dirname, '../../notes');

interface NoteRow {
  id: string;
  title: string;
  category: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  const meta: NoteMeta = {
    id: row.id,
    title: row.title,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  return { meta, content: row.content };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function ensureNoteCategory(db: Database, category: string): void {
  db.prepare('INSERT OR IGNORE INTO note_categories (name) VALUES (?)').run(category);
}

/** One-time import of legacy /notes/*.md files into the database. */
function migrateNotesFromDisk(db: Database): void {
  if (db.prepare("SELECT value FROM meta WHERE key = 'notes_imported'").get()) return;

  const dir = NOTES_DIR;
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  } catch {
    files = [];
  }

  for (const file of files) {
    const id = file.replace('.md', '');
    const parsed = parseNoteFile(fs.readFileSync(path.join(dir, file), 'utf-8'), id);
    if (!parsed) continue;
    ensureNoteCategory(db, parsed.meta.category);
    db.prepare(
      'INSERT OR IGNORE INTO notes (id, title, category, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      parsed.meta.id,
      parsed.meta.title,
      parsed.meta.category,
      parsed.content,
      parsed.meta.created_at,
      parsed.meta.updated_at,
    );
    fs.unlinkSync(path.join(dir, file));
  }

  if (files.length > 0) {
    try {
      fs.rmdirSync(dir);
    } catch {
      // Not empty or already gone — leave it.
    }
  }

  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('notes_imported', '1');
}

export function getNoteCategories(): Category[] {
  const db = getDb();
  return db.prepare('SELECT * FROM note_categories ORDER BY created_at ASC, name ASC').all() as Category[];
}

export function addNoteCategory(name: string): Category | undefined {
  const db = getDb();
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  ensureNoteCategory(db, trimmed);
  return db.prepare('SELECT * FROM note_categories WHERE name = ?').get(trimmed) as Category | undefined;
}

export async function removeNoteCategory(name: string): Promise<void> {
  const db = getDb();
  if (name === DEFAULT_NOTE_CATEGORY) return;
  for (const note of await getAllNotes()) {
    if (note.meta.category === name) {
      await updateNote(note.meta.id, { category: DEFAULT_NOTE_CATEGORY });
    }
  }
  db.prepare('DELETE FROM note_categories WHERE name = ?').run(name);
}

export async function createNote(title: string, category: string = DEFAULT_NOTE_CATEGORY, content: string = ''): Promise<Note> {
  const db = getDb();
  migrateNotesFromDisk(db);
  ensureNoteCategory(db, category);
  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO notes (id, title, category, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, title.trim() || 'Untitled', category, content, now, now);
  return (await getNoteById(id))!;
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined;
  return row ? toNote(row) : undefined;
}

export async function getAllNotes(): Promise<Note[]> {
  const db = getDb();
  migrateNotesFromDisk(db);
  const rows = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all() as NoteRow[];
  return rows.map(toNote);
}

export interface NoteUpdate {
  title?: string;
  category?: string;
  content?: string;
}

export async function updateNote(id: string, changes: NoteUpdate): Promise<Note> {
  const db = getDb();
  const note = await getNoteById(id);
  if (!note) throw new Error(`Note ${id} not found`);
  if (changes.category) ensureNoteCategory(db, changes.category);
  db.prepare(
    'UPDATE notes SET title = ?, category = ?, content = ?, updated_at = ? WHERE id = ?'
  ).run(
    changes.title?.trim() || note.meta.title,
    changes.category ?? note.meta.category,
    changes.content ?? note.content,
    new Date().toISOString(),
    id,
  );
  return (await getNoteById(id))!;
}

export async function deleteNote(id: string): Promise<void> {
  const db = getDb();
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
}
