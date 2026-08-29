import type { HistoryEntry } from '../types/app.js';

let historyIdCounter = 1;

/** Reserve an id up front so a long-running command can rewrite its own entry. */
export function nextEntryId(): number {
  return historyIdCounter++;
}

export function makeEntry(id: number, command: string, output: string): HistoryEntry {
  return { id, command, output, timestamp: new Date().toISOString() };
}

export function appendEntry(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [...history, entry];
}

/**
 * Replaces one entry's output in place. This is how `/reindex` reports progress:
 * it reserves an id, appends once, then rewrites that line as batches complete,
 * rather than flooding the feed with one entry per item.
 *
 * A missing id is a no-op — the user may have run `/clear` mid-run.
 */
export function updateEntry(
  history: HistoryEntry[],
  id: number,
  output: string,
): HistoryEntry[] {
  let found = false;
  const next = history.map(entry => {
    if (entry.id !== id) return entry;
    found = true;
    return { ...entry, output };
  });
  return found ? next : history;
}

/** A simple text progress bar for feed output. */
export function progressBar(done: number, total: number, width = 16): string {
  if (total <= 0) return '';
  const filled = Math.round((done / total) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}]`;
}
