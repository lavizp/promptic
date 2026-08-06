export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export interface TimeParts {
  hours: number;
  minutes: number;
}

export type DateTimeResult =
  | { ok: true; iso: string }
  | { ok: false; error: string };

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function parseDateField(value: string, now: Date): DateParts | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v === 'today') {
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
  if (v === 'tomorrow') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const year = parseInt(m[1]!, 10);
  const month = parseInt(m[2]!, 10);
  const day = parseInt(m[3]!, 10);
  if (!isValidDate(year, month, day)) return null;
  return { year, month, day };
}

export function parseTimeField(value: string): TimeParts | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const hm = v.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const hours = parseInt(hm[1]!, 10);
    const minutes = parseInt(hm[2]!, 10);
    if (hours > 23 || minutes > 59) return null;
    return { hours, minutes };
  }
  const ampm = v.match(/^(\d{1,2})\s*(am|pm)$/);
  if (ampm) {
    let hours = parseInt(ampm[1]!, 10);
    const meridiem = ampm[2];
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return { hours, minutes: 0 };
  }
  return null;
}

/**
 * Resolve date/time parts into a UTC ISO timestamp.
 * - Neither → error
 * - Date only → start of that date (midnight, local)
 * - Time only → today at that time
 * - Both → that date and time
 */
export function resolveDateTime(date: DateParts | null, time: TimeParts | null, now: Date): DateTimeResult {
  if (!date && !time) {
    return { ok: false, error: 'Please include a date or time (or both).' };
  }
  const year = date ? date.year : now.getFullYear();
  const month = date ? date.month : now.getMonth() + 1;
  const day = date ? date.day : now.getDate();
  const hours = time ? time.hours : 0;
  const minutes = time ? time.minutes : 0;
  const local = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return { ok: true, iso: local.toISOString() };
}

export function toDateInput(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function toTimeInput(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatReminderTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatOffset(date: Date): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

export interface ParsedReminder {
  message: string;
  date: string | null;
  time: string | null;
}

/** Tolerantly parses the AI's strict-JSON reminder response. */
export function parseReminderJson(text: string): ParsedReminder | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (typeof obj !== 'object' || obj === null) return null;
    return {
      message: typeof obj.message === 'string' ? obj.message.trim() : '',
      date: typeof obj.date === 'string' && obj.date.trim() !== '' ? obj.date.trim() : null,
      time: typeof obj.time === 'string' && obj.time.trim() !== '' ? obj.time.trim() : null,
    };
  } catch {
    return null;
  }
}
