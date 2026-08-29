import { describe, it, expect } from 'vitest';
import { appendEntry, makeEntry, nextEntryId, progressBar, updateEntry } from './feed.js';

const entry = (id: number, output: string) => ({ ...makeEntry(id, 'cmd', output) });

describe('nextEntryId', () => {
  it('hands out increasing ids', () => {
    expect(nextEntryId()).toBeLessThan(nextEntryId());
  });
});

describe('appendEntry', () => {
  it('does not mutate the original array', () => {
    const history = [entry(1, 'a')];
    const next = appendEntry(history, entry(2, 'b'));
    expect(history).toHaveLength(1);
    expect(next).toHaveLength(2);
  });
});

describe('updateEntry', () => {
  it('rewrites only the matching entry', () => {
    const history = [entry(1, 'a'), entry(2, 'b')];
    const next = updateEntry(history, 2, 'updated');
    expect(next[0]!.output).toBe('a');
    expect(next[1]!.output).toBe('updated');
  });

  it('does not mutate the original', () => {
    const history = [entry(1, 'a')];
    updateEntry(history, 1, 'changed');
    expect(history[0]!.output).toBe('a');
  });

  it('is a no-op for a missing id, e.g. after /clear mid-run', () => {
    const history = [entry(1, 'a')];
    expect(updateEntry(history, 99, 'x')).toBe(history);
  });
});

describe('progressBar', () => {
  it('renders empty, partial and full states', () => {
    expect(progressBar(0, 10, 10)).toBe('[░░░░░░░░░░]');
    expect(progressBar(5, 10, 10)).toBe('[█████░░░░░]');
    expect(progressBar(10, 10, 10)).toBe('[██████████]');
  });

  it('returns nothing when there is no work', () => {
    expect(progressBar(0, 0)).toBe('');
  });
});
