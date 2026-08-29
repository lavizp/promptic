import { describe, it, expect } from 'vitest';
import {
  isValidYmd,
  normalizeSqliteIso,
  resolveDateRange,
  toLocalYmd,
  ymd,
} from './dateUtil.js';

describe('normalizeSqliteIso', () => {
  it("adds the Z that SQLite's datetime('now') omits", () => {
    // todos/reminders store this shape; without the Z it parses as local time,
    // which shifts the day for anyone not on UTC.
    expect(normalizeSqliteIso('2026-08-27 10:00:00')).toBe('2026-08-27T10:00:00Z');
  });

  it('leaves an already-ISO timestamp alone', () => {
    expect(normalizeSqliteIso('2026-08-27T10:00:00.000Z')).toBe('2026-08-27T10:00:00.000Z');
  });

  it('treats a bare date as UTC midnight', () => {
    expect(normalizeSqliteIso('2026-08-27')).toBe('2026-08-27T00:00:00Z');
  });

  it('handles fractional seconds without a zone', () => {
    expect(normalizeSqliteIso('2026-08-27 10:00:00.500')).toBe('2026-08-27T10:00:00.500Z');
  });
});

describe('toLocalYmd', () => {
  it('agrees across the two stored formats for the same instant', () => {
    // The whole point of normalizing: a note and a todo written in the same
    // second must land on the same local day.
    expect(toLocalYmd('2026-08-27 10:00:00')).toBe(toLocalYmd('2026-08-27T10:00:00.000Z'));
  });

  it('returns null for an unparseable value', () => {
    expect(toLocalYmd('not a date')).toBeNull();
  });
});

describe('isValidYmd', () => {
  it('rejects impossible calendar dates', () => {
    expect(isValidYmd('2026-02-30')).toBe(false);
    expect(isValidYmd('2026-13-01')).toBe(false);
    expect(isValidYmd('2026-00-10')).toBe(false);
  });

  it('accepts a real date and a leap day', () => {
    expect(isValidYmd('2026-08-27')).toBe(true);
    expect(isValidYmd('2024-02-29')).toBe(true);
  });

  it('rejects malformed shapes', () => {
    expect(isValidYmd('26-08-27')).toBe(false);
    expect(isValidYmd('2026/08/27')).toBe(false);
    expect(isValidYmd('')).toBe(false);
  });
});

describe('resolveDateRange', () => {
  // Friday 28 August 2026, local noon.
  const now = new Date(2026, 7, 28, 12, 0, 0);

  it('resolves today and yesterday', () => {
    expect(resolveDateRange('today', now)).toEqual({ from: '2026-08-28', to: '2026-08-28' });
    expect(resolveDateRange('yesterday', now)).toEqual({ from: '2026-08-27', to: '2026-08-27' });
  });

  it('is case- and whitespace-insensitive', () => {
    expect(resolveDateRange('  YESTERDAY ', now)).toEqual({ from: '2026-08-27', to: '2026-08-27' });
  });

  it('runs weeks Monday to Sunday', () => {
    expect(resolveDateRange('this_week', now)).toEqual({ from: '2026-08-24', to: '2026-08-30' });
    expect(resolveDateRange('last_week', now)).toEqual({ from: '2026-08-17', to: '2026-08-23' });
  });

  it('handles a Sunday without rolling into the next week', () => {
    const sunday = new Date(2026, 7, 30, 12, 0, 0);
    expect(resolveDateRange('this_week', sunday)).toEqual({ from: '2026-08-24', to: '2026-08-30' });
  });

  it('covers whole months', () => {
    expect(resolveDateRange('this_month', now)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(resolveDateRange('last_month', now)).toEqual({ from: '2026-07-01', to: '2026-07-31' });
  });

  it('passes a literal date through as a single day', () => {
    expect(resolveDateRange('2026-01-15', now)).toEqual({ from: '2026-01-15', to: '2026-01-15' });
  });

  it('returns null for anything it does not understand', () => {
    expect(resolveDateRange('sometime last spring', now)).toBeNull();
    expect(resolveDateRange('2026-02-30', now)).toBeNull();
  });
});

describe('ymd', () => {
  it('zero-pads month and day', () => {
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
