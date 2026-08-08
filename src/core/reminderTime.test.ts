import { describe, it, expect } from "vitest";
import {
  parseDateField,
  parseTimeField,
  resolveDateTime,
  toDateInput,
  toTimeInput,
  parseReminderJson,
  formatOffset,
} from "./reminderTime.ts";

const now = new Date(2026, 7, 6, 12, 0); // 2026-08-06 12:00 local

describe("parseDateField", () => {
  it("parses explicit dates", () => {
    expect(parseDateField('2026-08-07', now)).toEqual({ year: 2026, month: 8, day: 7 });
    expect(parseDateField('2026-1-2', now)).toEqual({ year: 2026, month: 1, day: 2 });
  });

  it("resolves today and tomorrow relative to now", () => {
    expect(parseDateField('today', now)).toEqual({ year: 2026, month: 8, day: 6 });
    expect(parseDateField('tomorrow', now)).toEqual({ year: 2026, month: 8, day: 7 });
  });

  it("returns null for blank or invalid values", () => {
    expect(parseDateField('', now)).toBeNull();
    expect(parseDateField('2026-13-01', now)).toBeNull();
    expect(parseDateField('2026-02-30', now)).toBeNull();
    expect(parseDateField('someday', now)).toBeNull();
  });
});

describe("parseTimeField", () => {
  it("parses 24-hour times", () => {
    expect(parseTimeField('16:00')).toEqual({ hours: 16, minutes: 0 });
    expect(parseTimeField('09:05')).toEqual({ hours: 9, minutes: 5 });
  });

  it("parses 12-hour times", () => {
    expect(parseTimeField('4pm')).toEqual({ hours: 16, minutes: 0 });
    expect(parseTimeField('9 am')).toEqual({ hours: 9, minutes: 0 });
    expect(parseTimeField('12am')).toEqual({ hours: 0, minutes: 0 });
    expect(parseTimeField('12pm')).toEqual({ hours: 12, minutes: 0 });
  });

  it("returns null for blank or invalid values", () => {
    expect(parseTimeField('')).toBeNull();
    expect(parseTimeField('25:00')).toBeNull();
    expect(parseTimeField('13pm')).toBeNull();
    expect(parseTimeField('sometime')).toBeNull();
  });
});

describe("resolveDateTime", () => {
  it("errors when both date and time are missing", () => {
    const res = resolveDateTime(null, null, now);
    expect(res.ok).toBe(false);
  });

  it("date only → start of that date (midnight)", () => {
    const res = resolveDateTime({ year: 2026, month: 8, day: 7 }, null, now);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(toDateInput(res.iso)).toBe('2026-08-07');
      expect(toTimeInput(res.iso)).toBe('00:00');
    }
  });

  it("time only → today at that time", () => {
    const res = resolveDateTime(null, { hours: 16, minutes: 0 }, now);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(toDateInput(res.iso)).toBe('2026-08-06');
      expect(toTimeInput(res.iso)).toBe('16:00');
    }
  });

  it("both → that date and time", () => {
    const res = resolveDateTime({ year: 2026, month: 8, day: 9 }, { hours: 9, minutes: 30 }, now);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(toDateInput(res.iso)).toBe('2026-08-09');
      expect(toTimeInput(res.iso)).toBe('09:30');
    }
  });
});

describe("parseReminderJson", () => {
  it("parses clean JSON", () => {
    expect(parseReminderJson('{"message": "call Bill", "date": "2026-08-07", "time": "16:00"}'))
      .toEqual({ message: 'call Bill', date: '2026-08-07', time: '16:00' });
  });

  it("tolerates markdown fences and surrounding text", () => {
    expect(parseReminderJson('Here you go:\n```json\n{"message":"call Bill","date":null,"time":"16:00"}\n```'))
      .toEqual({ message: 'call Bill', date: null, time: '16:00' });
  });

  it("returns null for garbage", () => {
    expect(parseReminderJson('no json here')).toBeNull();
    expect(parseReminderJson('{"message":}')).toBeNull();
  });
});

describe("formatOffset", () => {
  it("produces a sign-prefixed HH:MM offset", () => {
    const offset = formatOffset(now);
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
  });
});
