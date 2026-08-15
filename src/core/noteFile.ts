import type { Note } from '../types/note.js';

export const DEFAULT_NOTE_CATEGORY = 'default';

export function parseNoteFile(raw: string, id: string): Note | undefined {
  const metaMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!metaMatch) return undefined;
  const yaml = metaMatch[1]!;
  const content = metaMatch[2]!.trim();
  const title = yaml.match(/^title:\s*(.+)$/m)?.[1]?.trim() || 'Untitled';
  const category = yaml.match(/^category:\s*(.+)$/m)?.[1]?.trim() || DEFAULT_NOTE_CATEGORY;
  const created_at = yaml.match(/^created_at:\s*(.+)$/m)?.[1]?.trim() || '';
  const updated_at = yaml.match(/^updated_at:\s*(.+)$/m)?.[1]?.trim() || '';
  return {
    meta: { id, title, category, created_at, updated_at },
    content,
  };
}
