import { getDb } from '../db/schema.js';

export function addLink(sourceNoteId: string, targetNoteId: string): void {
  const db = getDb();
  db.prepare(
    'INSERT OR IGNORE INTO links (source_note_id, target_note_id) VALUES (?, ?)'
  ).run(sourceNoteId, targetNoteId);
}

export function getBacklinks(noteId: string): string[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT source_note_id FROM links WHERE target_note_id = ?'
  ).all(noteId) as { source_note_id: string }[];
  return rows.map(r => r.source_note_id);
}

export function getOutlinks(noteId: string): string[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT target_note_id FROM links WHERE source_note_id = ?'
  ).all(noteId) as { target_note_id: string }[];
  return rows.map(r => r.target_note_id);
}
