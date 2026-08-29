import { describe, it, expect } from 'vitest';
import { diffIndex, HEURISTIC_MODEL, LOCAL_MODEL } from './plan.js';

const src = (id: string, hash: string) => ({ kind: 'note' as const, item_id: id, content_hash: hash });
const idx = (id: string, hash: string, model = 'gpt') =>
  ({ kind: 'note' as const, item_id: id, content_hash: hash, model });

describe('diffIndex', () => {
  it('enriches items that were never indexed', () => {
    const plan = diffIndex([src('a', 'h1')], []);
    expect(plan.toEnrich.map(i => i.item_id)).toEqual(['a']);
  });

  it('skips items whose content has not changed', () => {
    const plan = diffIndex([src('a', 'h1')], [idx('a', 'h1')]);
    expect(plan.toEnrich).toEqual([]);
    expect(plan.toSkip.map(i => i.item_id)).toEqual(['a']);
  });

  it('re-enriches when the content hash changed', () => {
    const plan = diffIndex([src('a', 'h2')], [idx('a', 'h1')]);
    expect(plan.toEnrich.map(i => i.item_id)).toEqual(['a']);
  });

  it('retries a heuristic row even when the hash matches', () => {
    // Self-healing: an item indexed while the API key was missing must not stay
    // degraded forever.
    const plan = diffIndex([src('a', 'h1')], [idx('a', 'h1', HEURISTIC_MODEL)]);
    expect(plan.toEnrich.map(i => i.item_id)).toEqual(['a']);
  });

  it('deletes index rows whose source is gone', () => {
    const plan = diffIndex([src('a', 'h1')], [idx('a', 'h1'), idx('gone', 'h9')]);
    expect(plan.toDelete).toEqual([{ kind: 'note', item_id: 'gone' }]);
  });

  it('re-enriches everything under --full', () => {
    const plan = diffIndex([src('a', 'h1'), src('b', 'h2')], [idx('a', 'h1'), idx('b', 'h2')], { full: true });
    expect(plan.toEnrich).toHaveLength(2);
    expect(plan.toSkip).toEqual([]);
  });

  it('keys on kind as well as id, since todo:1 and note:1 can coexist', () => {
    const sources = [
      { kind: 'note' as const, item_id: '1', content_hash: 'h' },
      { kind: 'todo' as const, item_id: '1', content_hash: 'h' },
    ];
    const plan = diffIndex(sources, [{ kind: 'note' as const, item_id: '1', content_hash: 'h', model: 'gpt' }]);
    expect(plan.toSkip).toHaveLength(1);
    expect(plan.toEnrich.map(i => i.kind)).toEqual(['todo']);
    expect(plan.toDelete).toEqual([]);
  });
});

describe('local vs heuristic models', () => {
  it('does not retry items indexed locally on purpose', () => {
    // Todos and reminders never go to an LLM; re-indexing them every run is
    // pointless DB churn.
    const plan = diffIndex([src('a', 'h1')], [idx('a', 'h1', LOCAL_MODEL)]);
    expect(plan.toEnrich).toEqual([]);
    expect(plan.toSkip.map(i => i.item_id)).toEqual(['a']);
  });
});
