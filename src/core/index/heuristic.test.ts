import { describe, it, expect } from 'vitest';
import { extractKeywords, heuristicEnrich, stripMarkdown, truncateSummary } from './heuristic.js';

describe('stripMarkdown', () => {
  it('unwraps emphasis, code, links and list markers', () => {
    expect(stripMarkdown('- **bold** and `code` and [text](http://x)')).toBe('bold and code and text');
    expect(stripMarkdown('## Heading')).toBe('Heading');
    expect(stripMarkdown('> quoted')).toBe('quoted');
  });
});

describe('truncateSummary', () => {
  it('leaves short text alone', () => {
    expect(truncateSummary('short')).toBe('short');
  });

  it('cuts on a word boundary, never mid-word', () => {
    const source = 'alpha beta gamma delta epsilon';
    const out = truncateSummary(source, 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith('…')).toBe(true);
    // Every retained word must be a whole word from the source.
    const kept = out.slice(0, -1).trim().split(' ');
    const words = source.split(' ');
    expect(kept.every((w, i) => w === words[i])).toBe(true);
  });

  it('hard-cuts a single unbroken word rather than returning nothing', () => {
    const out = truncateSummary('x'.repeat(50), 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('extractKeywords', () => {
  it('removes stopwords and ranks by frequency', () => {
    const words = extractKeywords('The lens and the lens and the prism with the lens');
    expect(words[0]).toBe('lens');
    expect(words).not.toContain('the');
  });
});

describe('heuristicEnrich', () => {
  it('summarises from the first prose line, not the heading', () => {
    const meta = heuristicEnrich({
      kind: 'note',
      title: 'Optics lecture',
      category: 'college',
      body: '# Optics lecture\n\nProf Rao covered Snell law and total internal reflection.',
    });
    expect(meta.summary).toBe('Prof Rao covered Snell law and total internal reflection.');
    expect(meta.keywords).toContain('optics');
  });

  it('finds an explicit ISO date but never guesses one', () => {
    expect(heuristicEnrich({ kind: 'note', title: 't', category: 'c', body: 'met on 2026-08-27 about it' }).occurred_on)
      .toBe('2026-08-27');
    expect(heuristicEnrich({ kind: 'note', title: 't', category: 'c', body: 'met yesterday' }).occurred_on)
      .toBeNull();
  });

  it('types todos and reminders without an LLM', () => {
    expect(heuristicEnrich({ kind: 'todo', title: 'Buy milk', category: 'c', body: '' }).doc_type).toBe('task');
    expect(heuristicEnrich({ kind: 'reminder', title: 'Call Bill', category: 'c', body: '' }).doc_type).toBe('event');
  });

  it('falls back to the title when the body is empty', () => {
    expect(heuristicEnrich({ kind: 'todo', title: 'Buy milk', category: 'c', body: '' }).summary).toBe('Buy milk');
  });

  it('never returns an empty summary', () => {
    expect(heuristicEnrich({ kind: 'note', title: '', category: 'c', body: '' }).summary).toBe('(empty)');
  });
});
