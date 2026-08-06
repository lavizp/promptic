import { useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { ScrollBoxRenderable } from "@opentui/core";
import {
  addReminder,
  deleteReminder,
  getAllReminders,
  toggleReminder,
  updateReminder,
} from "../../core/reminderEngine.js";
import {
  formatReminderTime,
  parseDateField,
  parseTimeField,
  resolveDateTime,
  toDateInput,
  toTimeInput,
} from "../../core/reminderTime.js";
import type { Reminder } from "../../types/reminder.js";
import { ShortcutBar } from "../shared/ShortcutBar.js";

type Mode =
  | { name: 'browse' }
  | { name: 'add' }
  | { name: 'edit'; reminderId: number };

type FormStep = 'message' | 'date' | 'time';

interface FormState {
  step: FormStep;
  message: string;
  date: string;
  time: string;
  error: string | null;
}

const INITIAL_FORM: FormState = { step: 'message', message: '', date: '', time: '', error: null };

interface RemindersViewProps {
  onExit: () => void;
}

export function RemindersView({ onExit }: RemindersViewProps) {
  const [reminders, setReminders] = useState<Reminder[]>(() => getAllReminders());
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>({ name: 'browse' });
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [formDraft, setFormDraft] = useState('');
  const listRef = useRef<ScrollBoxRenderable>(null);

  const refresh = () => setReminders(getAllReminders());

  const current = reminders[cursor];

  useEffect(() => {
    if (cursor >= reminders.length) {
      setCursor(Math.max(0, reminders.length - 1));
    }
  }, [reminders.length, cursor]);

  useEffect(() => {
    listRef.current?.scrollChildIntoView(`reminder-row-${cursor}`);
  }, [cursor]);

  const isFormMode = mode.name === 'add' || mode.name === 'edit';

  const startAdd = () => {
    setForm(INITIAL_FORM);
    setFormDraft('');
    setMode({ name: 'add' });
  };

  const startEdit = (id: number) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    setForm({
      step: 'message',
      message: reminder.message,
      date: toDateInput(reminder.scheduled_at),
      time: toTimeInput(reminder.scheduled_at),
      error: null,
    });
    setFormDraft(reminder.message);
    setMode({ name: 'edit', reminderId: id });
  };

  const handleFormSubmit = (value: string) => {
    if (form.step === 'message') {
      const next: FormState = { ...form, message: value.trim(), error: null, step: 'date' };
      setForm(next);
      setFormDraft(next.date);
      return;
    }

    if (form.step === 'date') {
      const dateStr = value.trim();
      if (dateStr !== '' && parseDateField(dateStr, new Date()) === null) {
        setForm({ ...form, date: dateStr, error: `Invalid date '${dateStr}' — use YYYY-MM-DD, today, or tomorrow` });
        return;
      }
      const next: FormState = { ...form, date: dateStr, error: null, step: 'time' };
      setForm(next);
      setFormDraft(next.time);
      return;
    }

    // time step
    const timeStr = value.trim();
    if (timeStr !== '' && parseTimeField(timeStr) === null) {
      setForm({ ...form, time: timeStr, error: `Invalid time '${timeStr}' — use HH:MM or 4pm` });
      return;
    }
    const dateParts = form.date.trim() === '' ? null : parseDateField(form.date, new Date());
    const timeParts = timeStr === '' ? null : parseTimeField(timeStr);
    const resolved = resolveDateTime(dateParts, timeParts, new Date());
    if (!resolved.ok) {
      setForm({ ...form, time: timeStr, error: resolved.error, step: 'date' });
      setFormDraft(form.date);
      return;
    }

    if (mode.name === 'add') {
      addReminder(form.message, resolved.iso);
    } else if (mode.name === 'edit') {
      updateReminder(mode.reminderId, { message: form.message, scheduled_at: resolved.iso });
    }
    refresh();
    setMode({ name: 'browse' });
  };

  useKeyboard((key) => {
    if (key.ctrl || key.meta) return;

    if (isFormMode) {
      if (key.name === 'escape') setMode({ name: 'browse' });
      return;
    }

    switch (key.name) {
      case 'up':
      case 'k':
        setCursor(i => Math.max(0, i - 1));
        break;
      case 'down':
      case 'j':
        setCursor(i => Math.min(reminders.length - 1, i + 1));
        break;
      case 'space':
      case 'x':
        if (current) {
          toggleReminder(current.id);
          refresh();
        }
        break;
      case 'a':
        startAdd();
        break;
      case 'e':
        if (current) startEdit(current.id);
        break;
      case 'd':
        if (current) {
          deleteReminder(current.id);
          refresh();
        }
        break;
      case 'escape':
        onExit();
        break;
    }
  });

  const placeholder = form.step === 'message'
    ? 'Reminder message…'
    : form.step === 'date'
      ? 'YYYY-MM-DD · today · tomorrow'
      : 'HH:MM · 4pm';

  return (
    <box flexDirection="column" flexGrow={1}>
      <scrollbox ref={listRef} scrollY flexGrow={1} padding={1}>
        {reminders.length === 0 && <text fg="gray">No reminders yet. Press a to add one.</text>}
        {reminders.map((reminder, i) => {
          const selected = cursor === i;
          const done = reminder.triggered === 1;
          const style = selected
            ? { fg: 'black' as const, bg: 'cyan' as const }
            : done
              ? { fg: 'gray' as const }
              : {};
          return (
            <box key={reminder.id} id={`reminder-row-${i}`}>
              <text {...style}>
                {selected ? '▸ ' : '  '}
                {done ? '☑' : '☐'} {formatReminderTime(reminder.scheduled_at)} — {reminder.message}
              </text>
            </box>
          );
        })}
      </scrollbox>

      {isFormMode && (
        <>
          <box marginTop={1} flexDirection="row">
            <text fg="cyan">[{form.step}]</text>
            <input
              value={formDraft}
              onInput={(v) => setFormDraft(v)}
              onSubmit={(v) => handleFormSubmit(String(v))}
              placeholder={placeholder}
              focused
            />
          </box>
          {form.error && <text fg="red">{form.error}</text>}
        </>
      )}

      {mode.name === 'browse' && (
        <ShortcutBar hints={[
          { key: '↑/↓', label: 'move' },
          { key: 'space', label: 'done' },
          { key: 'a', label: 'add' },
          { key: 'e', label: 'edit' },
          { key: 'd', label: 'delete' },
          { key: 'esc', label: 'back' },
        ]} />
      )}
      {isFormMode && (
        <ShortcutBar hints={[
          { key: 'enter', label: form.step === 'time' ? 'save' : 'next' },
          { key: 'esc', label: 'cancel' },
        ]} />
      )}
    </box>
  );
}
