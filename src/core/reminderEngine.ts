import { getDb } from '../db/schema.js';
import type { Reminder } from '../types/reminder.js';

export function addReminder(message: string, scheduledAt: string): Reminder {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO reminders (message, scheduled_at) VALUES (?, ?)'
  ).run(message, scheduledAt);
  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid) as Reminder;
}

export function getPendingReminders(): Reminder[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM reminders WHERE triggered = 0 AND scheduled_at <= datetime('now')"
  ).all() as Reminder[];
}

export function markTriggered(id: number): void {
  const db = getDb();
  db.prepare("UPDATE reminders SET triggered = 1 WHERE id = ?").run(id);
}
