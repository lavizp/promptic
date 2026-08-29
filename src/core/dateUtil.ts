/**
 * Date helpers shared by the index and the agent tools.
 *
 * All pure and `now`-injectable so they can be tested without `bun:sqlite`
 * and without the clock moving under the test.
 */

/**
 * The two timestamp formats in this database are not interchangeable.
 *
 *   notes.created_at      `new Date().toISOString()`  -> '2026-08-27T10:00:00.000Z'
 *   todos/reminders       SQLite `datetime('now')`    -> '2026-08-27 10:00:00'
 *
 * The second is UTC but carries no `Z`, so `new Date(...)` parses it as *local*
 * time. Left alone, every todo created in the evening in a positive-offset zone
 * lands on the wrong local day and "what's left today" silently returns the
 * wrong set. Normalize before any date math.
 */
export function normalizeSqliteIso(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return trimmed;
  // 'YYYY-MM-DD HH:MM:SS' (optionally fractional) with no zone marker.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}Z`;
  }
  // Bare date: treat as UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00Z`;
  return trimmed;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local-calendar YYYY-MM-DD for a Date. */
export function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local-calendar YYYY-MM-DD for a stored timestamp of either format. */
export function toLocalYmd(timestamp: string): string | null {
  const date = new Date(normalizeSqliteIso(timestamp));
  return Number.isNaN(date.getTime()) ? null : ymd(date);
}

/** Rejects both malformed strings and impossible dates like 2026-02-30. */
export function isValidYmd(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export interface DateRange {
  from: string;
  to: string;
}

/**
 * Resolves a date token to an inclusive local YYYY-MM-DD range.
 *
 * Accepts the relative keywords as well as a literal date, so the agent gets
 * the right answer whether it resolves "yesterday" itself or passes it through.
 */
export function resolveDateRange(token: string, now: Date): DateRange | null {
  const key = token.trim().toLowerCase();

  if (isValidYmd(key)) return { from: key, to: key };

  switch (key) {
    case 'today':
      return { from: ymd(now), to: ymd(now) };
    case 'yesterday': {
      const day = addDays(now, -1);
      return { from: ymd(day), to: ymd(day) };
    }
    case 'tomorrow': {
      const day = addDays(now, 1);
      return { from: ymd(day), to: ymd(day) };
    }
    case 'this_week': {
      // Weeks start Monday: getDay() is 0 for Sunday.
      const offset = (now.getDay() + 6) % 7;
      const start = addDays(now, -offset);
      return { from: ymd(start), to: ymd(addDays(start, 6)) };
    }
    case 'last_week': {
      const offset = (now.getDay() + 6) % 7;
      const start = addDays(now, -offset - 7);
      return { from: ymd(start), to: ymd(addDays(start, 6)) };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: ymd(start), to: ymd(end) };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: ymd(start), to: ymd(end) };
    }
    default:
      return null;
  }
}
