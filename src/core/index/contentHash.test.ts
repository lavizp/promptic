import { describe, it, expect } from 'vitest';
import { hashContent } from './contentHash.js';

describe('hashContent', () => {
  it('is deterministic', () => {
    expect(hashContent(['a', 'b'])).toBe(hashContent(['a', 'b']));
  });

  it('changes when any part changes', () => {
    expect(hashContent(['a', 'b'])).not.toBe(hashContent(['a', 'c']));
  });

  it('is order sensitive', () => {
    expect(hashContent(['a', 'b'])).not.toBe(hashContent(['b', 'a']));
  });

  it('notices whitespace-only edits', () => {
    expect(hashContent(['hello world'])).not.toBe(hashContent(['hello  world']));
  });

  it('handles unicode and empty input', () => {
    expect(hashContent(['日本語 — ✓'])).toMatch(/^[0-9a-f]{8}:\d+$/);
    expect(hashContent([])).toMatch(/^[0-9a-f]{8}:0$/);
  });
});
