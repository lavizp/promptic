# Second Brain CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `promptic` into a persistent TUI Second Brain CLI using OpenTUI.

**Architecture:** Replace the Commander/inquirer CLI with an OpenTUI React app (Flexbox layout). Keep existing `src/ai/` providers. Add SQLite database for todos/reminders/links and local Markdown files for notes. Route commands via a central `CommandParser`.

**Tech Stack:** OpenTUI React (`@opentui/react`), React 19, Yoga Flexbox, better-sqlite3, TypeScript, existing AI providers (OpenAI/Anthropic/Gemini/Groq).

## Global Constraints

- All new UI components use OpenTUI JSX elements (`<box>`, `<text>`, `<input>`, `<scrollbox>`) — NOT HTML
- Domain types defined locally in `src/types/` — no shared package
- AI provider code in `src/ai/` is kept as-is, wrapped by `src/core/llm.ts`
- Config storage uses existing `src/config/envConfig/EnvStore`
- Note files stored as `.md` with YAML frontmatter in a `notes/` directory
- Database path: `db/brain.sqlite` (gitignored)
- Entry point: `bin/cli.js` stays, imports `../dist/index.js`

---

## Task 1: Dependencies & Project Setup

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Working install of `better-sqlite3`; `.gitignore` excludes `db/`

- [ ] **Install better-sqlite3**

```bash
cd /home/lavizp/Documents/projects/promptic && bun add better-sqlite3 && bun add -d @types/better-sqlite3
```

- [ ] **Update tsconfig.json** to set OpenTUI as JSX import source

Edit `tsconfig.json` — add `jsxImportSource`:
```json
{
  "compilerOptions": {
    // ... existing options ...
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react",
    // ...
  }
}
```

- [ ] **Update .gitignore** to exclude database dir

Edit `.gitignore` — add `db/` line:
```gitignore
node_modules/
.env
dist/
db/
```

---

## Task 2: Domain Types & Database Schema

**Files:**
- Create: `src/types/todo.ts`
- Create: `src/types/note.ts`
- Create: `src/types/reminder.ts`
- Create: `src/types/app.ts`
- Create: `src/db/schema.ts`

**Interfaces:**
- Produces: All type definitions consumed by engines, views, and command parser

- [ ] **Create `src/types/todo.ts`**

```typescript
export type TodoCategory = 'work' | 'fitness' | 'personal';
export type TodoType = 'daily' | 'backlog';
export type TodoStatus = 'pending' | 'completed';

export interface Todo {
  id: number;
  description: string;
  category: TodoCategory;
  type: TodoType;
  status: TodoStatus;
  created_at: string;
  completed_at: string | null;
}
```

- [ ] **Create `src/types/note.ts`**

```typescript
export interface NoteMeta {
  id: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Note {
  meta: NoteMeta;
  content: string;
  backlinks: string[]; // titles of notes linking to this one
}
```

- [ ] **Create `src/types/reminder.ts`**

```typescript
export interface Reminder {
  id: number;
  message: string;
  scheduled_at: string;
  created_at: string;
  triggered: boolean;
}
```

- [ ] **Create `src/types/app.ts`**

```typescript
import type { Todo } from './todo.js';
import type { Note } from './note.js';

export type ViewType = 'feed' | 'todos' | 'note' | 'chat' | 'config';

export interface HistoryEntry {
  id: number;
  command: string;
  output: string;
  timestamp: string;
}

export interface AppState {
  currentView: ViewType;
  history: HistoryEntry[];
  activeTodoList: Todo[];
  activeNote: Note | null;
  chatStream: string;
  isProcessing: boolean;
  error: string | null;
  provider: string;
}
```

- [ ] **Create `src/db/schema.ts`**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../db/brain.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      category    TEXT NOT NULL CHECK(category IN ('work','fitness','personal')),
      type        TEXT NOT NULL CHECK(type IN ('daily','backlog')) DEFAULT 'daily',
      status      TEXT NOT NULL CHECK(status IN ('pending','completed')) DEFAULT 'pending',
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      message     TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      triggered   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS links (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      source_note_id TEXT NOT NULL,
      target_note_id TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
```

---

## Task 3: Core Engines (Todo, Link, Reminder)

**Files:**
- Create: `src/core/todoEngine.ts`
- Create: `src/core/linkEngine.ts`
- Create: `src/core/reminderEngine.ts`

**Interfaces:**
- Produces: `todoEngine` (addTodo, getTodosByCategory, rolloverDaily, toggleTodo), `linkEngine` (addLink, getBacklinks), `reminderEngine` (addReminder, getPendingReminders)

- [ ] **Create `src/core/todoEngine.ts`**

```typescript
import { getDb } from '../db/schema.js';
import type { Todo, TodoCategory, TodoStatus } from '../types/todo.js';

export function addTodo(description: string, category: TodoCategory): Todo {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO todos (description, category) VALUES (?, ?)'
  );
  const result = stmt.run(description, category);
  return getTodo(result.lastInsertRowid as number)!;
}

export function getTodo(id: number): Todo | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
}

export function getAllTodos(): Todo[] {
  const db = getDb();
  return db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all() as Todo[];
}

export function getTodosByCategory(): Record<TodoCategory, Todo[]> {
  const todos = getAllTodos();
  const result: Record<TodoCategory, Todo[]> = { work: [], fitness: [], personal: [] };
  for (const todo of todos) {
    result[todo.category].push(todo);
  }
  return result;
}

export function toggleTodo(id: number): Todo | undefined {
  const db = getDb();
  const todo = getTodo(id);
  if (!todo) return undefined;
  if (todo.status === 'pending') {
    db.prepare("UPDATE todos SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(id);
  } else {
    db.prepare("UPDATE todos SET status = 'pending', completed_at = NULL WHERE id = ?").run(id);
  }
  return getTodo(id);
}

export function rolloverDaily(): number {
  const db = getDb();
  const lastRun = db.prepare("SELECT value FROM meta WHERE key = 'last_run_date'").get() as { value: string } | undefined;
  const today = new Date().toISOString().slice(0, 10);
  if (lastRun?.value === today) return 0;
  const result = db.prepare(
    "UPDATE todos SET type = 'backlog' WHERE type = 'daily' AND status = 'pending'"
  ).run();
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('last_run_date', today);
  return result.changes;
}
```

- [ ] **Create `src/core/linkEngine.ts`**

```typescript
import { getDb } from '../db/schema.js';

export function addLink(sourceNoteId: string, targetNoteId: string): void {
  const db = getDb();
  db.prepare(
    'INSERT OR IGNORE INTO links (source_note_id, target_note_id) VALUES (?, ?)'
  ).run(sourceNoteId, targetNoteId);
}

export function getBacklinks(noteId: string): string[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT source_note_id FROM links WHERE target_note_id = ?'
  ).all(noteId) as { source_note_id: string }[];
  return rows.map(r => r.source_note_id);
}

export function getOutlinks(noteId: string): string[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT target_note_id FROM links WHERE source_note_id = ?'
  ).all(noteId) as { target_note_id: string }[];
  return rows.map(r => r.target_note_id);
}
```

- [ ] **Create `src/core/reminderEngine.ts`**

```typescript
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
```

---

## Task 4: Notes Engine

**Files:**
- Create: `src/core/notesEngine.ts`

**Interfaces:**
- Produces: `notesEngine` (createNote, getNote, editNote, updateTags)

- [ ] **Create `src/core/notesEngine.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Note, NoteMeta } from '../types/note.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = path.resolve(__dirname, '../../notes');

type NoteRow = { id: string; title: string; tags: string; created_at: string; updated_at: string };

async function ensureNotesDir() {
  try { await fs.mkdir(NOTES_DIR, { recursive: true }); } catch {}
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function createNote(title: string, content: string = ''): Promise<Note> {
  await ensureNotesDir();
  const id = generateId();
  const now = new Date().toISOString();
  const frontmatter = `---\nid: ${id}\ntitle: ${title}\ntags: []\ncreated_at: ${now}\nupdated_at: ${now}\n---\n\n`;
  const filePath = path.join(NOTES_DIR, `${id}.md`);
  await fs.writeFile(filePath, frontmatter + content, 'utf-8');
  return getNoteById(id)!;
}

export async function getNoteById(id: string): Promise<Note | undefined> {
  try {
    const filePath = path.join(NOTES_DIR, `${id}.md`);
    const raw = await fs.readFile(filePath, 'utf-8');
    return parseNoteFile(raw, id);
  } catch {
    return undefined;
  }
}

export async function getNoteByTitle(title: string): Promise<Note | undefined> {
  await ensureNotesDir();
  const files = await fs.readdir(NOTES_DIR);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const raw = await fs.readFile(path.join(NOTES_DIR, file), 'utf-8');
    const parsed = parseNoteFile(raw, file.replace('.md', ''));
    if (parsed?.meta.title === title) return parsed;
  }
  return undefined;
}

export async function getAllNotes(): Promise<Note[]> {
  await ensureNotesDir();
  const files = await fs.readdir(NOTES_DIR);
  const notes: Note[] = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const raw = await fs.readFile(path.join(NOTES_DIR, file), 'utf-8');
    const parsed = parseNoteFile(raw, file.replace('.md', ''));
    if (parsed) notes.push(parsed);
  }
  return notes;
}

export async function updateNoteContent(id: string, content: string): Promise<void> {
  const filePath = path.join(NOTES_DIR, `${id}.md`);
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function updateNoteTags(id: string, tags: string[]): Promise<void> {
  const note = await getNoteById(id);
  if (!note) throw new Error(`Note ${id} not found`);
  const filePath = path.join(NOTES_DIR, `${id}.md`);
  const raw = await fs.readFile(filePath, 'utf-8');
  const updated = raw.replace(/^tags:.*$/m, `tags: [${tags.join(', ')}]`);
  await fs.writeFile(filePath, updated, 'utf-8');
  note.meta.tags = tags;
}

function parseNoteFile(raw: string, id: string): Note | undefined {
  const metaMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!metaMatch) return undefined;
  const yaml = metaMatch[1]!;
  const content = metaMatch[2]!.trim();
  const title = yaml.match(/^title:\s*(.+)$/m)?.[1]?.trim() || 'Untitled';
  const tagsStr = yaml.match(/^tags:\s*\[(.*)\]/m)?.[1] || '';
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const created_at = yaml.match(/^created_at:\s*(.+)$/m)?.[1]?.trim() || '';
  const updated_at = yaml.match(/^updated_at:\s*(.+)$/m)?.[1]?.trim() || '';
  return {
    meta: { id, title, tags, created_at, updated_at },
    content,
    backlinks: [],
  };
}
```

---

## Task 5: LLM Wrapper

**Files:**
- Create: `src/core/llm.ts`

**Interfaces:**
- Produces: `llm.generate(prompt, options?)` — returns `AsyncIterable<string>` for streaming

- [ ] **Create `src/core/llm.ts`**

```typescript
import { getAIProvider } from '../ai/index.js';
import type { GenerateInput, GenerateResult } from '../ai/types.js';
import { envStore } from '../config/envConfig/envConfig.js';
import aiConfig from '../ai/config.js';
import { normalPrompt } from '../ai/prompts/system.js';

/** Normalizes provider names — existing config may use 'open_ai' */
function normalizeProvider(p: string): string {
  const map: Record<string, string> = {
    'open_ai': 'openai', 'openai': 'openai',
    'anthropic': 'anthropic',
    'gemini': 'gemini',
    'groq': 'groq',
  };
  return map[p] || 'openai';
}

export interface LLMOptions {
  systemPrompt?: string;
  provider?: string;
  model?: string;
}

export async function* generateStream(
  prompt: string,
  options: LLMOptions = {}
): AsyncGenerator<string> {
  const rawProvider = options.provider || envStore.get('ai_provider') || 'openai';
  const provider = normalizeProvider(rawProvider);
  const generate = getAIProvider(provider);
  const systemPrompt = options.systemPrompt || normalPrompt;

  const result: GenerateResult = await generate({
    prompt,
    systemPrompt,
  } as GenerateInput);

  yield result.content;
}

export async function generate(
  prompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const rawProvider = options.provider || envStore.get('ai_provider') || 'openai';
  const provider = normalizeProvider(rawProvider);
  const generate = getAIProvider(provider);
  const systemPrompt = options.systemPrompt || normalPrompt;

  const result: GenerateResult = await generate({
    prompt,
    systemPrompt,
  } as GenerateInput);

  return result.content;
}
```

Note: The current `src/ai/index.ts` providers return `GenerateResult` (not streaming). For now, `generateStream` yields the full response as a single chunk. Streaming can be added later by modifying the AI providers.

---

## Task 6: App Entry Point & Main Layout

**Files:**
- Create: `src/index.tsx`
- Create: `src/App.tsx`
- Create: `src/components/layout/OutputPane.tsx`
- Create: `src/components/layout/InputPrompt.tsx`

**Interfaces:**
- Produces: The React entry that creates the renderer and mounts `<App />`

- [ ] **Create `src/index.tsx`**

```tsx
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App.js";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  screenMode: "main-screen",
});

const root = createRoot(renderer);
root.render(<App />);

// Handle shutdown
process.on('SIGINT', () => {
  renderer.destroy();
  process.exit(0);
});
```

- [ ] **Create `src/App.tsx`**

```tsx
import { useState, useCallback } from "react";
import type { AppState, ViewType, HistoryEntry } from "./types/app.js";
import type { Todo } from "./types/todo.js";
import type { Note } from "./types/note.js";
import { OutputPane } from "./components/layout/OutputPane.js";
import { InputPrompt } from "./components/layout/InputPrompt.js";
import { parseCommand } from "./controllers/commandParser.js";
import { rolloverDaily } from "./core/todoEngine.js";

const initialHistory: HistoryEntry[] = [];
if (rolloverDaily() > 0) {
  initialHistory.push({
    id: 0,
    command: 'system',
    output: `Rolled over ${rolloverDaily()} uncompleted daily tasks to backlog.`,
    timestamp: new Date().toISOString(),
  });
}

export function App() {
  const [state, setState] = useState<AppState>({
    currentView: 'feed',
    history: initialHistory,
    activeTodoList: [],
    activeNote: null,
    chatStream: '',
    isProcessing: false,
    error: null,
    provider: 'openai',
  });

  const handleCommand = useCallback((input: string) => {
    parseCommand(input, state, setState);
  }, [state]);

  return (
    <box flexDirection="column" height="100%" width="100%">
      <box flexGrow={1} overflow="hidden">
        <OutputPane
          currentView={state.currentView}
          history={state.history}
          activeTodoList={state.activeTodoList}
          activeNote={state.activeNote}
          chatStream={state.chatStream}
          isProcessing={state.isProcessing}
          error={state.error}
          provider={state.provider}
        />
      </box>
      <box height={3} borderStyle="single" borderColor="gray">
        <InputPrompt onSubmit={handleCommand} isProcessing={state.isProcessing} />
      </box>
    </box>
  );
}
```

- [ ] **Create `src/components/layout/OutputPane.tsx`**

```tsx
import type { ViewType, HistoryEntry } from "../../types/app.js";
import type { Todo } from "../../types/todo.js";
import type { Note } from "../../types/note.js";
import { FeedView } from "../views/FeedView.js";
import { TodoView } from "../views/TodoView.js";
import { NoteView } from "../views/NoteView.js";
import { ChatView } from "../views/ChatView.js";
import { ConfigView } from "../views/ConfigView.js";
import { ErrorBox } from "../shared/ErrorBox.js";

interface OutputPaneProps {
  currentView: ViewType;
  history: HistoryEntry[];
  activeTodoList: Todo[];
  activeNote: Note | null;
  chatStream: string;
  isProcessing: boolean;
  error: string | null;
  provider: string;
}

export function OutputPane(props: OutputPaneProps) {
  const { currentView, error } = props;

  if (error) {
    return <ErrorBox message={error} />;
  }

  switch (currentView) {
    case 'todos':
      return <TodoView />;
    case 'note':
      return props.activeNote ? <NoteView note={props.activeNote} /> : <FeedView history={props.history} />;
    case 'chat':
      return <ChatView stream={props.chatStream} isProcessing={props.isProcessing} />;
    case 'config':
      return <ConfigView />;
    case 'feed':
    default:
      return <FeedView history={props.history} />;
  }
}
```

- [ ] **Create `src/components/layout/InputPrompt.tsx`**

```tsx
import { useState, useCallback } from "react";

interface InputPromptProps {
  onSubmit: (command: string) => void;
  isProcessing: boolean;
}

export function InputPrompt({ onSubmit, isProcessing }: InputPromptProps) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback((inputValue: string) => {
    if (!inputValue.trim() || isProcessing) return;
    onSubmit(inputValue.trim());
    setValue('');
  }, [onSubmit, isProcessing]);

  return (
    <input
      value={value}
      onChange={(v: string) => setValue(v)}
      onSubmit={(v: string) => handleSubmit(v)}
      placeholder={isProcessing ? "Processing..." : "Type a command (/help for list)..."}
      focused
    />
  );
}
```

---

## Task 7: Command Parser

**Files:**
- Create: `src/controllers/commandParser.ts`

**Interfaces:**
- Consumes: `todoEngine`, `notesEngine`, `linkEngine`, `reminderEngine`, `llm.generate`
- Produces: `parseCommand(input, state, setState)` — routes input to handler

- [ ] **Create `src/controllers/commandParser.ts`**

```typescript
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

    case 'todo': {
      const subCmd = args[0];
      if (subCmd !== 'add' || !args[1]) {
        setState(s => ({ ...s, ...addEntry(s, input, 'Usage: /todo add [work|fitness|personal] [description]') }));
        return;
      }
      const rest = args.slice(1).join(' ');
      const todoMatch = rest.match(/^(work|fitness|personal)\s+(.+)/);
      if (!todoMatch) {
        setState(s => ({ ...s, ...addEntry(s, input, 'Usage: /todo add [work|fitness|personal] [description]') }));
        return;
      }
      const category = todoMatch[1] as 'work' | 'fitness' | 'personal';
      const desc = todoMatch[2]!;
      const todo = todoEngine.addTodo(desc, category);
      setState(s => ({
        ...s,
        activeTodoList: todoEngine.getAllTodos(),
        ...addEntry(s, input, `Added todo: [${todo.category}] ${todo.description}`),
      }));
      break;
    }

    case 'todos': {
      const todos = todoEngine.getAllTodos();
      setState(s => ({ ...s, currentView: 'todos', activeTodoList: todos, error: null }));
      break;
    }

    case 'note': {
      const action = args[0];
      const noteArgs = args.slice(1).join(' ');
      switch (action) {
        case 'create': {
          try {
            const note = await notesEngine.createNote(noteArgs || 'Untitled');
            setState(s => ({ ...s, currentView: 'note', activeNote: await notesEngine.getNoteById(note.meta.id)!, ...addEntry(s, input, `Created note: ${note.meta.title} (${note.meta.id})`) }));
          } catch (err: any) {
            setState(s => ({ ...s, error: err.message }));
          }
          break;
        }
        case 'view': {
          try {
            const note = noteArgs ? await notesEngine.getNoteById(noteArgs) || await notesEngine.getNoteByTitle(noteArgs) : undefined;
            if (note) {
              const backlinks = linkEngine.getBacklinks(note.meta.id);
              note.backlinks = backlinks;
              setState(s => ({ ...s, currentView: 'note', activeNote: note }));
            } else {
              setState(s => ({ ...s, ...addEntry(s, input, `Note not found: ${noteArgs}`) }));
            }
          } catch (err: any) {
            setState(s => ({ ...s, error: err.message }));
          }
          break;
        }
        case 'edit': {
          setState(s => ({ ...s, ...addEntry(s, input, 'Edit via $EDITOR not supported in TUI yet. Use /note view to read, or edit the .md file directly.') }));
          break;
        }
        default: {
          setState(s => ({ ...s, ...addEntry(s, input, 'Usage: /note create [title] | /note view [id|title] | /note edit [id]') }));
        }
      }
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
        setState(s => ({ ...s, ...addEntry(s, input, 'Usage: /reminder [message] - Sets a reminder for 1 hour from now.' }) });
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
        '  /todo add [cat] [desc] - Add a todo (cat: work|fitness|personal)',
        '  /todos               - Show todo dashboard',
        '  /note create [title] - Create a new note',
        '  /note view [id]      - View a note',
        '  /note edit [id]      - Edit a note',
        '  /tag [note_id] [tag] - Add a tag to a note',
        '  /link [source] [target] - Link two notes',
        '  /reminder [message]  - Set a reminder',
        '  /config              - Configure AI provider & keys',
        '  /clear               - Clear history',
        '  /help                - Show this help',
        '  (any other text)     - Treated as /hey',
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
```

---

## Task 8: View Components

**Files:**
- Create: `src/components/views/FeedView.tsx`
- Create: `src/components/views/TodoView.tsx`
- Create: `src/components/views/NoteView.tsx`
- Create: `src/components/views/ChatView.tsx`
- Create: `src/components/shared/Tag.tsx`
- Create: `src/components/shared/ErrorBox.tsx`

**Interfaces:**
- Consumes: AppState slices (history, todos, notes, chat stream)

- [ ] **Create `src/components/shared/Tag.tsx`**

```tsx
interface TagProps {
  label: string;
}

export function Tag({ label }: TagProps) {
  return <text backgroundColor="blue" color="white">{` #${label} `}</text>;
}
```

- [ ] **Create `src/components/shared/ErrorBox.tsx`**

```tsx
interface ErrorBoxProps {
  message: string;
}

export function ErrorBox({ message }: ErrorBoxProps) {
  return (
    <box borderStyle="single" borderColor="red" padding={1}>
      <text color="red">Error: {message}</text>
    </box>
  );
}
```

- [ ] **Create `src/components/views/FeedView.tsx`**

```tsx
import type { HistoryEntry } from "../../types/app.js";

interface FeedViewProps {
  history: HistoryEntry[];
}

export function FeedView({ history }: FeedViewProps) {
  if (history.length === 0) {
    return (
      <box padding={1}>
        <text color="gray">Welcome to Second Brain CLI. Type /help to see available commands.</text>
      </box>
    );
  }

  return (
    <scrollbox scrollY padding={1}>
      {history.map((entry) => (
        <box key={entry.id} marginBottom={1}>
          {entry.command !== 'system' && (
            <text color="cyan">{`> ${entry.command}`}</text>
          )}
          <text>{entry.output}</text>
        </box>
      ))}
    </scrollbox>
  );
}
```

- [ ] **Create `src/components/views/TodoView.tsx`**

```tsx
import { useState, useEffect } from "react";
import { getAllTodos, toggleTodo, getTodosByCategory } from "../../core/todoEngine.js";
import type { TodoCategory } from "../../types/todo.js";

export function TodoView() {
  const [todos, setTodos] = useState(getAllTodos());
  const categories: TodoCategory[] = ['work', 'fitness', 'personal'];

  const grouped = getTodosByCategory();
  const daily = categories.map(cat => grouped[cat].filter(t => t.type === 'daily'));
  const backlog = getAllTodos().filter(t => t.type === 'backlog');

  const handleToggle = (id: number) => {
    toggleTodo(id);
    setTodos(getAllTodos());
  };

  return (
    <box flexDirection="row" padding={1}>
      <box flexGrow={1} flexDirection="column">
        <text bold>Daily Tasks</text>
        {categories.map(cat => (
          <box key={cat} marginTop={1}>
            <text color="yellow">{cat.toUpperCase()}</text>
            {grouped[cat].filter(t => t.type === 'daily').length === 0 && (
              <text color="gray">  No tasks</text>
            )}
            {grouped[cat].filter(t => t.type === 'daily').map(todo => (
              <box key={todo.id} marginLeft={1}>
                <text>{todo.status === 'completed' ? '☑' : '☐'} {todo.description}</text>
              </box>
            ))}
          </box>
        ))}
      </box>
      <box flexGrow={1} flexDirection="column" marginLeft={2}>
        <text bold>Backlog</text>
        {backlog.length === 0 && <text color="gray">  No backlog tasks</text>}
        {backlog.map(todo => (
          <box key={todo.id}>
            <text color="gray">{todo.description}</text>
          </box>
        ))}
      </box>
    </box>
  );
}
```

- [ ] **Create `src/components/views/NoteView.tsx`**

```tsx
import type { Note } from "../../types/note.js";
import { Tag } from "../shared/Tag.js";

interface NoteViewProps {
  note: Note;
}

export function NoteView({ note }: NoteViewProps) {
  return (
    <scrollbox scrollY padding={1}>
      <box flexDirection="row" gap={1} marginBottom={1}>
        {note.meta.tags.map(tag => (
          <Tag key={tag} label={tag} />
        ))}
      </box>
      <text bold>{note.meta.title}</text>
      <text>{note.content}</text>
      {note.backlinks.length > 0 && (
        <>
          <text color="gray">---</text>
          <text bold>Linked Mentions</text>
          {note.backlinks.map(link => (
            <text key={link} color="cyan">{link}</text>
          ))}
        </>
      )}
    </scrollbox>
  );
}
```

- [ ] **Create `src/components/views/ChatView.tsx`**

```tsx
interface ChatViewProps {
  stream: string;
  isProcessing: boolean;
}

export function ChatView({ stream, isProcessing }: ChatViewProps) {
  return (
    <scrollbox scrollY padding={1}>
      {isProcessing && !stream && <text color="gray">Thinking...</text>}
      {stream && <text>{stream}</text>}
    </scrollbox>
  );
}
```

---

## Task 9: Config View

**Files:**
- Create: `src/components/views/ConfigView.tsx`

- [ ] **Create `src/components/views/ConfigView.tsx`**

```tsx
import { useState } from "react";
import { envStore } from "../../config/envConfig/envConfig.js";

const PROVIDER_OPTIONS = [
  { name: 'OpenAI', description: 'gpt-4o-mini', value: 'openai' },
  { name: 'Anthropic', description: 'claude-3-5-haiku-latest', value: 'anthropic' },
  { name: 'Gemini', description: 'gemini-2.0-flash', value: 'gemini' },
  { name: 'Groq', description: 'llama-3.3-70b-versatile', value: 'groq' },
];

export function ConfigView() {
  const currentProvider = envStore.get('ai_provider') || 'openai';
  const initialIdx = PROVIDER_OPTIONS.findIndex(o => o.value === currentProvider);
  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  const handleProviderChange = (index: number) => {
    const option = PROVIDER_OPTIONS[index];
    if (option) {
      setSelectedProvider(option.value);
      envStore.set('ai_provider', option.value);
      setStatus(`Provider set to ${option.value}`);
    }
  };

  const API_KEY_NAMES: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY',
    groq: 'GROQ_API_KEY',
  };

  const handleSetKey = () => {
    if (!apiKey.trim()) return;
    const keyName = API_KEY_NAMES[selectedProvider];
    if (keyName) {
      envStore.set(keyName, apiKey.trim());
      setStatus(`API key updated for ${selectedProvider}`);
    }
    setApiKey('');
  };

  return (
    <scrollbox scrollY padding={1}>
      <text bold color="green">Configuration</text>

      <box marginTop={1}>
        <text bold>AI Provider:</text>
        <select
          options={PROVIDER_OPTIONS}
          selectedIndex={initialIdx}
          onChange={handleProviderChange}
          focused
        />
      </box>

      <box marginTop={1}>
        <text bold>Set API Key for {selectedProvider}:</text>
        <input
          value={apiKey}
          onChange={(v: string) => setApiKey(v)}
          onSubmit={(v: string) => { setApiKey(v); handleSetKey(); }}
          placeholder="Enter API key..."
        />
      </box>

      {status && <text color="green">{status}</text>}
    </scrollbox>
  );
}
```

---

## Task 10: Cleanup Old Code

**Files:**
- Remove: `src/index.ts`
- Remove: `src/cli/` (entire directory)
- Remove: `src/commands/config.ts`
- Remove: `src/core/questionBuilder.ts`
- Remove: `src/core/promptBuilder.ts`
- Remove: `src/core/types.ts`
- Remove: `src/output/` (entire directory)
- Remove: `src/utils/` (entire directory)
- Modify: `package.json` (remove unused deps)

- [ ] **Remove old source files**

```bash
rm -rf /home/lavizp/Documents/projects/promptic/src/cli /home/lavizp/Documents/projects/promptic/src/commands /home/lavizp/Documents/projects/promptic/src/output /home/lavizp/Documents/projects/promptic/src/utils
rm /home/lavizp/Documents/projects/promptic/src/index.ts
rm /home/lavizp/Documents/projects/promptic/src/core/questionBuilder.ts /home/lavizp/Documents/projects/promptic/src/core/promptBuilder.ts /home/lavizp/Documents/projects/promptic/src/core/types.ts
```

- [ ] **Remove unused dependencies from package.json**

Edit `package.json`:
- Remove `inquirer`, `@inquirer/prompts`, `@types/inquirer`
- Remove `commander`
- Remove `marked`, `marked-terminal`, `@types/marked-terminal`
- Keep `conf` (required by `src/config/envConfig/EnvStore`)
- Remove `chalk`

- [ ] **Build and verify**

```bash
cd /home/lavizp/Documents/projects/promptic && bun run build
```

Expected: Compiles successfully with no errors.

- [ ] **Run existing AI provider tests to verify they still pass**

```bash
cd /home/lavizp/Documents/projects/promptic && bun test
```

Expected: Remaining tests pass (AI provider tests, envStore tests).
