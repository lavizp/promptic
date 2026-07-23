import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Note, NoteMeta } from '../types/note.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = path.resolve(__dirname, '../../notes');

type NoteRow = { id: string; title: string; tags: string; created_at: string; updated_at: string };

async function ensureNotesDir() {
  try { await fs.mkdir(NOTES_DIR, { recursive: true }); } catch {}
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function createNote(title: string, content: string = ''): Promise<Note> {
  await ensureNotesDir();
  const id = generateId();
  const now = new Date().toISOString();
  const frontmatter = `---\nid: ${id}\ntitle: ${title}\ntags: []\ncreated_at: ${now}\nupdated_at: ${now}\n---\n\n`;
  const filePath = path.join(NOTES_DIR, `${id}.md`);
  await fs.writeFile(filePath, frontmatter + content, 'utf-8');
  return (await getNoteById(id))!;
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  try {
    const filePath = path.join(NOTES_DIR, `${id}.md`);
    const raw = await fs.readFile(filePath, 'utf-8');
    return parseNoteFile(raw, id);
  } catch {
    return undefined;
  }
}

export async function getNoteByTitle(title: string): Promise<Note | undefined> {
  await ensureNotesDir();
  const files = await fs.readdir(NOTES_DIR);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const raw = await fs.readFile(path.join(NOTES_DIR, file), 'utf-8');
    const parsed = parseNoteFile(raw, file.replace('.md', ''));
    if (parsed?.meta.title === title) return parsed;
  }
  return undefined;
}

export async function getAllNotes(): Promise<Note[]> {
  await ensureNotesDir();
  const files = await fs.readdir(NOTES_DIR);
  const notes: Note[] = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const raw = await fs.readFile(path.join(NOTES_DIR, file), 'utf-8');
    const parsed = parseNoteFile(raw, file.replace('.md', ''));
    if (parsed) notes.push(parsed);
  }
  return notes;
}

export async function updateNoteContent(id: string, content: string): Promise<void> {
  const filePath = path.join(NOTES_DIR, `${id}.md`);
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function updateNoteTags(id: string, tags: string[]): Promise<void> {
  const note = await getNoteById(id);
  if (!note) throw new Error(`Note ${id} not found`);
  const filePath = path.join(NOTES_DIR, `${id}.md`);
  const raw = await fs.readFile(filePath, 'utf-8');
  const updated = raw.replace(/^tags:.*$/m, `tags: [${tags.join(', ')}]`);
  await fs.writeFile(filePath, updated, 'utf-8');
  note.meta.tags = tags;
}

function parseNoteFile(raw: string, id: string): Note | undefined {
  const metaMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!metaMatch) return undefined;
  const yaml = metaMatch[1]!;
  const content = metaMatch[2]!.trim();
  const title = yaml.match(/^title:\s*(.+)$/m)?.[1]?.trim() || 'Untitled';
  const tagsStr = yaml.match(/^tags:\s*\[(.*)\]/m)?.[1] || '';
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const created_at = yaml.match(/^created_at:\s*(.+)$/m)?.[1]?.trim() || '';
  const updated_at = yaml.match(/^updated_at:\s*(.+)$/m)?.[1]?.trim() || '';
  return {
    meta: { id, title, tags, created_at, updated_at },
    content,
    backlinks: [],
  };
}
