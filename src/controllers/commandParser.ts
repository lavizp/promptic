import type { Dispatch, SetStateAction } from "react";
import type { AppState, HistoryEntry } from "../types/app.js";
import * as todoEngine from "../core/todoEngine.js";
import * as notesEngine from "../core/notesEngine.js";
import * as linkEngine from "../core/linkEngine.js";
import * as reminderEngine from "../core/reminderEngine.js";
import { generate } from "../core/llm.js";

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

    case 'tag': {
      const [noteId, ...tagParts] = args;
      const tag = tagParts.join(' ');
      if (!noteId || !tag) {
        setState(s => ({ ...s, ...addEntry(s, input, 'Usage: /tag [note_id] [tag_name]') }));
        return;
      }
      try {
        const note = await notesEngine.getNoteById(noteId);
        if (!note) {
          setState(s => ({ ...s, ...addEntry(s, input, `Note not found: ${noteId}`) }));
          return;
        }
        const newTags = [...new Set([...note.meta.tags, tag])];
        await notesEngine.updateNoteTags(noteId, newTags);
        setState(s => ({ ...s, ...addEntry(s, input, `Tagged note ${noteId} with #${tag}`) }));
      } catch (err: any) {
        setState(s => ({ ...s, error: err.message }));
      }
      break;
    }

    case 'link': {
      const [sourceId, targetId] = args;
      if (!sourceId || !targetId) {
        setState(s => ({ ...s, ...addEntry(s, input, 'Usage: /link [source_note_id] [target_note_id]') }));
        return;
      }
      try {
        linkEngine.addLink(sourceId, targetId);
        setState(s => ({ ...s, ...addEntry(s, input, `Linked ${sourceId} → ${targetId}`) }));
      } catch (err: any) {
        setState(s => ({ ...s, error: err.message }));
      }
      break;
    }

    case 'reminder': {
      if (!argStr) {
        setState(s => ({ ...s, ...addEntry(s, input, 'Usage: /reminder [message] - Sets a reminder for 1 hour from now.') }));
        return;
      }
      const scheduledAt = new Date(Date.now() + 3600000).toISOString();
      const reminder = reminderEngine.addReminder(argStr, scheduledAt);
      setState(s => ({ ...s, ...addEntry(s, input, `Reminder set for ${new Date(reminder.scheduled_at).toLocaleString()}: ${reminder.message}`) }));
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
        '  /notes               - Open the notes view (add/edit/open/move/delete)',
        '  /tag [note_id] [tag] - Add a tag to a note',
        '  /link [source] [target] - Link two notes',
        '  /reminder [message]  - Set a reminder',
        '  /config              - Configure AI provider & keys',
        '  /clear               - Clear history',
        '  /help                - Show this help',
        '  (any other text)     - Treated as /hey',
        '',
        'In any view: Esc returns to the feed.',
        'Todos view: ↑/↓ move · space toggle · a add · e edit · enter open · m move · d delete · c new category',
        'Notes view: ↑/↓ move · a add · e title · enter edit (tab preview · ctrl+s save) · m move · d delete · c new category',
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
