import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/schema.js';
import type { Database } from 'bun:sqlite';
import type { Note, NoteMeta } from '../types/note.js';
import type { Category } from '../types/todo.js';
import { parseNoteFile, serializeNote, DEFAULT_NOTE_CATEGORY } from './noteFile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = path.resolve(__dirname, '../../notes');

const filePath = (id: string) => path.join(NOTES_DIR, `${id}.md`);

async function ensureNotesDir() {
  await fs.mkdir(NOTES_DIR, { recursive: true });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function ensureNoteCategory(db: Database, category: string): void {
  db.prepare('INSERT OR IGNORE INTO note_categories (name) VALUES (?)').run(category);
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
  await ensureNotesDir();
  ensureNoteCategory(getDb(), category);
  const id = generateId();
  const now = new Date().toISOString();
  const meta: NoteMeta = { id, title, category, tags: [], created_at: now, updated_at: now };
  await fs.writeFile(filePath(id), serializeNote(meta, content), 'utf-8');
  return (await getNoteById(id))!;
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  try {
    const raw = await fs.readFile(filePath(id), 'utf-8');
    return parseNoteFile(raw, id);
  } catch {
    return undefined;
  }
}

export async function getNoteByTitle(title: string): Promise<Note | undefined> {
  await ensureNotesDir();
  for (const file of await fs.readdir(NOTES_DIR)) {
    if (!file.endsWith('.md')) continue;
    const parsed = parseNoteFile(await fs.readFile(path.join(NOTES_DIR, file), 'utf-8'), file.replace('.md', ''));
    if (parsed?.meta.title === title) return parsed;
  }
  return undefined;
}

export async function getAllNotes(): Promise<Note[]> {
  await ensureNotesDir();
  const notes: Note[] = [];
  for (const file of await fs.readdir(NOTES_DIR)) {
    if (!file.endsWith('.md')) continue;
    const parsed = parseNoteFile(await fs.readFile(path.join(NOTES_DIR, file), 'utf-8'), file.replace('.md', ''));
    if (parsed) notes.push(parsed);
  }
  notes.sort((a, b) => b.meta.updated_at.localeCompare(a.meta.updated_at));
  return notes;
}

export interface NoteUpdate {
  title?: string;
  category?: string;
  content?: string;
  tags?: string[];
}

export async function updateNote(id: string, changes: NoteUpdate): Promise<Note> {
  const note = await getNoteById(id);
  if (!note) throw new Error(`Note ${id} not found`);
  if (changes.category) ensureNoteCategory(getDb(), changes.category);
  const meta: NoteMeta = {
    ...note.meta,
    title: changes.title?.trim() || note.meta.title,
    category: changes.category ?? note.meta.category,
    tags: changes.tags ?? note.meta.tags,
    updated_at: new Date().toISOString(),
  };
  const content = changes.content ?? note.content;
  await fs.writeFile(filePath(id), serializeNote(meta, content), 'utf-8');
  return (await getNoteById(id))!;
}

export async function updateNoteTags(id: string, tags: string[]): Promise<void> {
  await updateNote(id, { tags });
}

export async function deleteNote(id: string): Promise<void> {
  await fs.unlink(filePath(id));
}
