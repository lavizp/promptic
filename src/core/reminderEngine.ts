import { getDb } from '../db/index.js';
import type { Reminder } from '../types/reminder.js';

export function addReminder(message: string, scheduledAt: string): Reminder {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO reminders (message, scheduled_at) VALUES (?, ?)'
  ).run(message, scheduledAt);
  return getReminder(result.lastInsertRowid as number)!;
}

export function getReminder(id: number): Reminder | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Reminder | undefined;
}

export function getAllReminders(): Reminder[] {
  const db = getDb();
  return db.prepare('SELECT * FROM reminders ORDER BY scheduled_at ASC').all() as Reminder[];
}

export interface ReminderUpdate {
  message?: string;
  scheduled_at?: string;
}

export function updateReminder(id: number, changes: ReminderUpdate): Reminder | undefined {
  const db = getDb();
  const current = getReminder(id);
  if (!current) return undefined;
  db.prepare('UPDATE reminders SET message = ?, scheduled_at = ? WHERE id = ?').run(
    changes.message ?? current.message,
    changes.scheduled_at ?? current.scheduled_at,
    id,
  );
  return getReminder(id);
}

export function deleteReminder(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
}

export function toggleReminder(id: number): Reminder | undefined {
  const db = getDb();
  const current = getReminder(id);
  if (!current) return undefined;
  db.prepare('UPDATE reminders SET triggered = ? WHERE id = ?').run(current.triggered === 1 ? 0 : 1, id);
  return getReminder(id);
}

export function getPendingReminders(): Reminder[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM reminders WHERE triggered = 0 AND julianday(scheduled_at) <= julianday('now')"
  ).all() as Reminder[];
}

export function markTriggered(id: number): void {
  const db = getDb();
  db.prepare('UPDATE reminders SET triggered = 1 WHERE id = ?').run(id);
}
