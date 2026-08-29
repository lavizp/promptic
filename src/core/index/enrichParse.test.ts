import { describe, it, expect } from 'vitest';
import { parseEnrichJson, truncateForEnrich } from './enrichParse.js';

const good = JSON.stringify({
  summary: 'Optics lecture on Snell’s law and the thin lens equation.',
  keywords: ['Snell', 'Optics', 'lens'],
  entities: ['Prof Rao'],
  doc_type: 'class',
  occurred_on: '2026-08-27',
});

describe('parseEnrichJson', () => {
  it('parses a clean response', () => {
    const result = parseEnrichJson(good);
    expect(result?.doc_type).toBe('class');
    expect(result?.occurred_on).toBe('2026-08-27');
    expect(result?.entities).toEqual(['Prof Rao']);
  });

  it('lowercases and dedupes keywords', () => {
    expect(parseEnrichJson(good)?.keywords).toEqual(['snell', 'optics', 'lens']);
  });

  it('survives markdown fences and a prose preamble', () => {
    expect(parseEnrichJson('Here you go:\n```json\n' + good + '\n```')?.doc_type).toBe('class');
  });

  it('falls back to "other" for an invented doc_type', () => {
    // Models reliably invent plausible-but-unlisted categories.
    expect(parseEnrichJson(JSON.stringify({ summary: 's', doc_type: 'lecture' }))?.doc_type)
      .toBe('other');
  });

  it('nulls an invalid occurred_on rather than trusting it', () => {
    expect(parseEnrichJson(JSON.stringify({ summary: 's', occurred_on: '2026-13-01' }))?.occurred_on)
      .toBeNull();
    expect(parseEnrichJson(JSON.stringify({ summary: 's', occurred_on: 'yesterday' }))?.occurred_on)
      .toBeNull();
  });

  it('ignores keywords that are not an array', () => {
    expect(parseEnrichJson(JSON.stringify({ summary: 's', keywords: 'a,b' }))?.keywords).toEqual([]);
  });

  it('drops non-string array members', () => {
    const parsed = parseEnrichJson(JSON.stringify({ summary: 's', keywords: ['ok', 3, null, 'ok'] }));
    expect(parsed?.keywords).toEqual(['ok']);
  });

  it('clamps an over-long summary to 140 characters', () => {
    const parsed = parseEnrichJson(JSON.stringify({ summary: 'word '.repeat(80) }));
    expect(parsed!.summary.length).toBeLessThanOrEqual(140);
  });

  it('returns null when there is no usable summary, so the caller falls back', () => {
    expect(parseEnrichJson(JSON.stringify({ summary: '   ', keywords: ['a'] }))).toBeNull();
    expect(parseEnrichJson(JSON.stringify({ keywords: ['a'] }))).toBeNull();
  });

  it('returns null on malformed or absent JSON', () => {
    expect(parseEnrichJson('not json at all')).toBeNull();
    expect(parseEnrichJson('{ broken')).toBeNull();
    expect(parseEnrichJson('')).toBeNull();
    expect(parseEnrichJson('[1,2,3]')).toBeNull();
  });
});

describe('truncateForEnrich', () => {
  it('leaves short content untouched', () => {
    expect(truncateForEnrich('short')).toBe('short');
  });

  it('keeps both ends, because action items live at the bottom', () => {
    const body = `START${'x'.repeat(9000)}END`;
    const out = truncateForEnrich(body, 1000);
    expect(out.startsWith('START')).toBe(true);
    expect(out.endsWith('END')).toBe(true);
    expect(out).toContain('[truncated]');
    expect(out.length).toBeLessThan(1100);
  });
});
