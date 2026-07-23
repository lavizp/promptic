# Second Brain CLI — Design Spec

## Overview

Transform the existing `promptic` project into a persistent Terminal User Interface (TUI) REPL built with OpenTUI (`@opentui/react`). The CLI acts as an interactive "Second Brain" interface that stays open (like OpenCode or Claude Code) and processes slash commands without exiting the process.

## Tech Stack

- **UI Framework:** OpenTUI (`@opentui/react`, React 19, Yoga Flexbox)
- **Runtime:** Node.js + TypeScript (`tsx`)
- **Data Persistence:** better-sqlite3 for todos, reminders, links, metadata
- **Note Storage:** Local Markdown files with YAML frontmatter
- **AI Providers:** Reuse existing `src/ai/` (OpenAI, Anthropic, Gemini, Groq)

## Project Structure

```
src/
├── index.tsx              # Entry: init OpenTUI renderer, mount <App />
├── App.tsx                # Root Flexbox layout + state management
├── components/
│   ├── layout/
│   │   ├── OutputPane.tsx  # Scrollable view area (routes by currentView)
│   │   └── InputPrompt.tsx # Fixed bottom bar, auto-focus, onSubmit
│   ├── views/
│   │   ├── FeedView.tsx    # Default: scrollable command history
│   │   ├── TodoView.tsx    # Split: daily (left) + backlog (right)
│   │   ├── NoteView.tsx    # Markdown + tag pills + backlinks
│   │   └── ChatView.tsx    # Streaming /hey response with spinner
│   └── shared/
│       ├── Tag.tsx         # Styled tag pill component
│       └── ErrorBox.tsx    # Error state wrapper
├── controllers/
│   └── commandParser.ts    # Parses "/cmd arg" → handler + view switch
├── core/
│   ├── llm.ts              # Wrapper around src/ai/ providers
│   ├── notesEngine.ts      # Markdown CRUD + YAML frontmatter parsing
│   ├── todoEngine.ts       # SQLite queries + daily rollover
│   ├── linkEngine.ts       # Bidirectional [[wiki]] links
│   └── reminderEngine.ts   # Persist reminders to SQLite
├── types/
│   ├── todo.ts             # Todo, TodoCategory, TodoType interfaces
│   ├── note.ts             # Note, NoteMeta (frontmatter) interfaces
│   └── reminder.ts         # Reminder interface
├── ai/                     # KEPT from current project
├── integrations/           # KEPT from current project (Tavily)
├── config/                 # KEPT from current project (envStore)
└── db/
    └── schema.ts           # SQLite table creation / migrations
```

## Layout

Flexbox column layout filling 100% of terminal height/width:

```
┌─────────────────────────────────┐
│                                 │
│   OutputPane (flexGrow: 1)      │
│   - Routes by currentView       │
│   - Scrollable history          │
│                                 │
├─────────────────────────────────┤
│ InputPrompt (height: 3, border) │  ← always focused
└─────────────────────────────────┘
```

Top pane renders one of: FeedView (default), TodoView, NoteView, ChatView — controlled by `currentView` state.

## State Management

Single React context at `App.tsx`:

```ts
interface AppState {
  currentView: 'feed' | 'todos' | 'note' | 'chat';
  history: HistoryEntry[];       // { command, output }[]
  activeTodoList: Todo[];
  activeNote: Note | null;
  chatStream: string;
  isProcessing: boolean;
  error: string | null;
}
```

## Views

### FeedView (default)
Scrollable history of past commands and their outputs, newest at bottom.

### TodoView
Split layout (`flexDirection: "row"`):
- Left: Daily todos grouped by category (work | fitness | personal)
- Right: Backlog (uncompleted daily tasks from previous days)
- Keyboard: Arrow keys to navigate, Spacebar to toggle completion

### NoteView
- Top: Tag pills rendered from YAML frontmatter
- Middle: Rendered markdown content
- Bottom: Divider + "Linked Mentions" (backlinks from linkEngine)

### ChatView
- Loading spinner while `isProcessing`
- Streaming text as response arrives
- Appends result to `history[]` on completion

## Database Schema (SQLite via better-sqlite3)

```sql
CREATE TABLE todos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  category    TEXT NOT NULL CHECK(category IN ('work','fitness','personal')),
  type        TEXT NOT NULL CHECK(type IN ('daily','backlog')) DEFAULT 'daily',
  status      TEXT NOT NULL CHECK(status IN ('pending','completed')) DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE reminders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  message     TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  triggered   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE links (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_note_id TEXT NOT NULL,
  target_note_id TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Daily rollover: On boot, check `meta.last_run_date` — if different from today, migrate pending daily todos to backlog.

## Command Reference

| Command | Handler | Action |
|---------|---------|--------|
| `/hey [prompt]` | `handleHey` | Stateless LLM call, stream response, no context loaded |
| `/note create [title]` | `handleNote` | Create .md file, open $EDITOR |
| `/note view [id]` | `handleNote` | Display note + tags + backlinks |
| `/note edit [id]` | `handleNote` | Spawn system editor for .md file |
| `/todo add [category] [desc]` | `handleTodoAdd` | Create new daily todo |
| `/todos` | `handleTodos` | Switch to interactive TodoView |
| `/tag [note_id] [tag]` | `handleTag` | Update YAML frontmatter + sync db |
| `/link [source] [target]` | `handleLink` | Append [[Target]] to source + update links table |
| `/reminder [message]` | `handleReminder` | Parse scheduled time, persist to db |
| `/help` | `handleHelp` | Show available commands |
| `/clear` | `handleClear` | Clear history |
| (unrecognized) | default | Treat as `/hey` with full input |

## AI Layer Reuse

The existing `src/ai/` modules are kept as-is. A new `src/core/llm.ts` wraps them:

```ts
import { getAIProvider } from '../ai/index.js';
// reads provider/key from envStore, calls generate(), returns stream
```

Optional: `/hey --web` includes Tavily search results in the prompt (reuses `src/integrations/tavily.ts`).

## Dependencies

**Add:**
- `better-sqlite3` + `@types/better-sqlite3`

**Remove:**
- `inquirer` / `@inquirer/prompts` / `@types/inquirer`
- `commander`
- `marked` / `marked-terminal` / `@types/marked-terminal`
- `conf`
- `chalk` (if unused after refactor)

**Keep:**
- All AI SDKs, `@tavily/core`, `dotenv`, `@opentui/core`, `@opentui/react`, `react`, `@types/react`

## What Changes

**Replaced:**
- `src/index.ts` — from Commander CLI → OpenTUI entry point
- `src/cli/` — removed entirely (inquirer flow)
- `src/core/` — questionBuilder.ts, promptBuilder.ts removed; new engines added
- `src/output/` — removed (markdown rendering via OpenTUI components)
- `src/utils/` — removed entirely

**Kept unchanged:**
- `src/ai/` (all files)
- `src/integrations/tavily.ts`
- `src/config/envConfig/` (envStore)
- `bin/cli.js` (entry point stays, imports `../dist/index.js`)
- `tsconfig.json` (already has `jsx: "react-jsx"`)
