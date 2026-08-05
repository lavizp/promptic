import type { Note, NoteMeta } from '../types/note.js';

export const DEFAULT_NOTE_CATEGORY = 'default';

export function parseNoteFile(raw: string, id: string): Note | undefined {
  const metaMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!metaMatch) return undefined;
  const yaml = metaMatch[1]!;
  const content = metaMatch[2]!.trim();
  const title = yaml.match(/^title:\s*(.+)$/m)?.[1]?.trim() || 'Untitled';
  const category = yaml.match(/^category:\s*(.+)$/m)?.[1]?.trim() || DEFAULT_NOTE_CATEGORY;
  const tagsStr = yaml.match(/^tags:\s*\[(.*)\]/m)?.[1] || '';
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const created_at = yaml.match(/^created_at:\s*(.+)$/m)?.[1]?.trim() || '';
  const updated_at = yaml.match(/^updated_at:\s*(.+)$/m)?.[1]?.trim() || '';
  return {
    meta: { id, title, category, tags, created_at, updated_at },
    content,
    backlinks: [],
  };
}

export function serializeNote(meta: NoteMeta, content: string): string {
  const frontmatter = [
    '---',
    `id: ${meta.id}`,
    `title: ${meta.title}`,
    `category: ${meta.category}`,
    `tags: [${meta.tags.join(', ')}]`,
    `created_at: ${meta.created_at}`,
    `updated_at: ${meta.updated_at}`,
    '---',
    '',
  ].join('\n');
  return frontmatter + content;
}
