import type { Dispatch, SetStateAction } from "react";
import type { AppState, HistoryEntry } from "../types/app.js";
import * as todoEngine from "../core/todoEngine.js";
import * as reminderEngine from "../core/reminderEngine.js";
import {
  formatOffset,
  formatReminderTime,
  parseDateField,
  parseReminderJson,
  parseTimeField,
  resolveDateTime,
} from "../core/reminderTime.js";
import { generate } from "../core/llm.js";
import { reminderParsePrompt } from "../ai/prompts/system.js";

let historyIdCounter = 1;

function addEntry(state: AppState, command: string, output: string): Partial<AppState> {
  const entry: HistoryEntry = {
    id: historyIdCounter++,
    command,
    output,
    timestamp: new Date().toISOString(),
  };
  return { history: [...state.history, entry] };
}

export async function parseCommand(
  input: string,
  state: AppState,
  setState: Dispatch<SetStateAction<AppState>>
) {
  const trimmed = input.trim();
  if (!trimmed) return;

  // Non-slash commands default to /hey
  const cmdText = trimmed.startsWith('/') ? trimmed : `/hey ${trimmed}`;
  const [cmd, ...args] = cmdText.slice(1).split(/\s+/);
  const argStr = args.join(' ');

  switch (cmd) {
    case 'hey': {
      setState(s => ({ ...s, currentView: 'chat', chatStream: '', isProcessing: true, error: null }));
      try {
        const response = await generate(argStr);
        setState(s => ({
          ...s,
          chatStream: response,
          isProcessing: false,
          currentView: 'feed',
          ...addEntry(s, input, response),
        }));
      } catch (err: any) {
        setState(s => ({ ...s, isProcessing: false, error: err.message }));
      }
      break;
    }

    case 'todos': {
      const todos = todoEngine.getAllTodos();
      setState(s => ({ ...s, currentView: 'todos', activeTodoList: todos, error: null }));
      break;
    }

    case 'notes': {
      setState(s => ({ ...s, currentView: 'notes', error: null }));
      break;
    }

    case 'reminders': {
      setState(s => ({ ...s, currentView: 'reminders', error: null }));
      break;
    }

    case 'remind-me': {
      if (!argStr) {
        setState(s => ({ ...s, ...addEntry(s, input, 'Usage: /remind-me [text] - e.g. Remind me to call Bill tomorrow at 4PM') }));
        return;
      }
      const now = new Date();
      try {
        const raw = await generate(argStr, {
          systemPrompt: reminderParsePrompt(now.toISOString(), formatOffset(now)),
        });
        const parsed = parseReminderJson(raw);
        if (!parsed) {
          setState(s => ({ ...s, ...addEntry(s, input, 'Could not parse a reminder from the response. Please include a date and/or time.') }));
          return;
        }
        const dateParts = parsed.date ? parseDateField(parsed.date, now) : null;
        const timeParts = parsed.time ? parseTimeField(parsed.time) : null;
        if (parsed.date && !dateParts) {
          setState(s => ({ ...s, ...addEntry(s, input, `Invalid date from AI: ${parsed.date}`) }));
          return;
        }
        if (parsed.time && !timeParts) {
          setState(s => ({ ...s, ...addEntry(s, input, `Invalid time from AI: ${parsed.time}`) }));
          return;
        }
        const resolved = resolveDateTime(dateParts, timeParts, now);
        if (!resolved.ok) {
          setState(s => ({ ...s, ...addEntry(s, input, resolved.error) }));
          return;
        }
        const reminder = reminderEngine.addReminder(parsed.message, resolved.iso);
        setState(s => ({ ...s, ...addEntry(s, input, `Reminder set for ${formatReminderTime(reminder.scheduled_at)}: ${reminder.message}`) }));
      } catch (err: any) {
        setState(s => ({ ...s, error: err.message }));
      }
      break;
    }

    case 'config': {
      setState(s => ({ ...s, currentView: 'config', error: null }));
      break;
    }

    case 'help': {
      const helpText = [
        'Available commands:',
        '  /hey [prompt]        - Ask AI a question',
        '  /todos               - Open the todos view (add/edit/open/move/delete)',
        '  /notes               - Open the notes view (add/edit/move/delete)',
        '  /reminders           - Open the reminders view (add/edit/done/delete)',
        '  /remind-me [text]    - Add a reminder from natural language (e.g. call Bill tomorrow at 4PM)',
        '  /config              - Configure AI provider & keys',
        '  /clear               - Clear history',
        '  /help                - Show this help',
        '  (any other text)     - Treated as /hey',
        '',
        'In any view: Esc returns to the feed.',
        'Todos view: ↑/↓ move · space toggle · a add · e edit · enter open · m move · d delete · c new category',
        'Notes view: ↑/↓ move · a add · e title · enter edit (tab preview · ctrl+s save) · m move · d delete · c new category',
        'Reminders: ↑/↓ move · space done · a add · e edit · d delete',
      ].join('\n');
      setState(s => ({ ...s, ...addEntry(s, input, helpText) }));
      break;
    }

    case 'clear': {
      setState(s => ({ ...s, history: [], error: null }));
      break;
    }

    default: {
      setState(s => ({ ...s, ...addEntry(s, input, `Unknown command: /${cmd}. Type /help for available commands.`) }));
    }
  }
}
