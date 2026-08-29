import { describe, it, expect } from 'vitest';
import { buildFtsQuery, tokenize } from './ftsQuery.js';

describe('buildFtsQuery', () => {
  it('strips FTS5 operators that would otherwise be syntax', () => {
    // Unescaped, each of these throws "fts5: syntax error" at query time.
    const q = buildFtsQuery('foo AND bar OR NOT baz NEAR qux')!;
    expect(q).not.toMatch(/\b(AND|OR NOT|NEAR)\b.*NEAR/);
    expect(q).toContain('"foo"*');
    expect(q).toContain('"qux"*');
  });

  it('handles punctuation-heavy input', () => {
    expect(buildFtsQuery('notes re: the API rewrite')).toBe('"notes"* OR "re"* OR "api"* OR "rewrite"*');
    expect(buildFtsQuery('C++ (pointers) "quoted" -dash')).toBe('"pointers"* OR "quoted"* OR "dash"*');
  });

  it('drops question-shaped stopwords', () => {
    expect(buildFtsQuery('what work do I have left today')).toBe('"work"* OR "left"* OR "today"*');
  });

  it('keeps stopwords rather than returning nothing when that is all there is', () => {
    expect(buildFtsQuery('what is it')).not.toBeNull();
  });

  it('returns null when nothing searchable remains', () => {
    expect(buildFtsQuery('???')).toBeNull();
    expect(buildFtsQuery('')).toBeNull();
    expect(buildFtsQuery('   ')).toBeNull();
  });

  it('dedupes repeated terms', () => {
    expect(buildFtsQuery('lens lens lens')).toBe('"lens"*');
  });

  it('caps term count so one huge paste cannot build a monstrous query', () => {
    const q = buildFtsQuery(Array.from({ length: 60 }, (_, i) => `term${i}`).join(' '))!;
    expect(q.split(' OR ')).toHaveLength(16);
  });
});

describe('tokenize', () => {
  it('drops single characters and trailing apostrophes', () => {
    expect(tokenize("a Snell's law")).toEqual(["snell's", 'law']);
  });
});
