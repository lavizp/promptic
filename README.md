# promptic-cli

A keyboard-driven terminal "second brain" — chat with AI, manage todos, notes, and reminders — all from one persistent TUI built with [OpenTUI](https://github.com/anomalyco/opentui).

## Features

- **AI chat** — `/hey` (or just type anything) asks your configured provider; every command and response lands in a scrollable feed.
- **Todos** — categories (add/remove, with a `default`), add, edit, toggle done, move between categories, delete.
- **Notes** — markdown files with categories, an embedded editor with rendered preview, move/delete.
- **Reminders** — schedule with dates/times, mark done, delete; or use natural language.
- **Natural-language reminders** — `/remind-me "call Bill tomorrow at 4PM"` uses AI to resolve the date/time.
- **Multi-provider AI** — OpenAI, Anthropic, Gemini, or Groq, configurable in-app.
- **Keyboard-driven** — every view lists its shortcuts in a hint bar; `Esc` returns to the feed.

## Install / Run

Requires [Bun](https://bun.sh) (uses `bun:sqlite`).

```bash
git clone https://github.com/lavizp/promptic.git
cd promptic
npm install
npm start        # or: bun src/index.tsx
```

The package declares a `promptic-cli` bin, but the primary way to run it today is `npm start`.

## Getting started

1. Start the app with `npm start`.
2. Run `/config` and set your AI provider and API key.
3. Try a few things:
   - `/hey what is a second brain?`
   - `/todos` — press `a` to add a todo.
   - `/notes` — press `a`, then `enter` to edit markdown, `Tab` to preview, `Ctrl+S` to save.
   - `/remind-me "call Bill tomorrow at 4PM"`
   - `/help` — list all commands.

## Commands

| Command | Description |
|---|---|
| `/hey [prompt]` | Ask the AI (any non-slash text is treated as `/hey`) |
| `/todos` | Todos view: categories, add/edit/toggle/move/delete |
| `/notes` | Notes view: markdown editor + preview, categories, move/delete |
| `/reminders` | Reminders view: add/edit/done/delete with date & time |
| `/remind-me [text]` | AI-scheduled reminder from natural language |
| `/config` | Choose provider, set/remove API keys |
| `/clear` | Clear the feed history |
| `/help` | Show help |

Navigation: the feed is home. Slash commands switch views; `Esc` returns to the feed from any view. The command bar is only active on the feed, so each view owns its own keys (shown in its hint bar).

## View shortcuts

- **Todos** — `↑/↓` move · `space` toggle · `a` add · `e` edit · `enter` open · `m` move · `d` delete · `c` new category
- **Notes** — `↑/↓` move · `a` add · `e` title · `enter` edit (`Tab` preview, `Ctrl+S` save) · `m` move · `d` delete · `c` new category
- **Reminders** — `↑/↓` move · `space` done · `a` add · `e` edit · `d` delete
- **Config** — `↑/↓` browse providers · `enter` activate · `r` remove key · `Tab` switch field

## Reminder date & time

Date can be given as `today`, `tomorrow`, or `YYYY-MM-DD`; time as `HH:MM` or `4pm`.

- Neither → error
- Date only → start of that day (midnight)
- Time only → today at that time

`/remind-me` uses AI to resolve phrases like "tomorrow at 4PM", "in 2 hours", or "next Monday".

## Providers

| Provider | Model | Env key |
|---|---|---|
| OpenAI | gpt-4o-mini | `OPENAI_API_KEY` |
| Anthropic | claude-3-5-haiku-latest | `ANTHROPIC_API_KEY` |
| Gemini | gemini-2.0-flash | `GEMINI_API_KEY` |
| Groq | llama-3.3-70b-versatile | `GROQ_API_KEY` |

## Storage

- `db/brain.sqlite` — todos, categories, reminders, and metadata (SQLite via `bun:sqlite`).
- `notes/*.md` — each note is a markdown file with YAML frontmatter (`id`, `title`, `category`, dates).
- API keys — stored in a local per-project store (`conf`), set via `/config`.

## Development

```bash
npm run build      # tsc → dist/
npm start          # run the TUI (bun)
npm test           # vitest
```

### Project structure

```
src/
├── ai/            # Providers (OpenAI, Anthropic, Gemini, Groq), prompts, LLM client
├── components/    # OpenTUI React components (views + shared widgets)
│   ├── layout/    # Output pane, input bar
│   ├── views/     # Feed, Todos, Notes, Reminders, Config, Chat
│   └── shared/    # ShortcutBar, ErrorBox
├── config/        # EnvStore (persistent API-key storage via conf)
├── controllers/   # Slash-command parser
├── core/          # Engines (todo/note/reminder), DB schema, date/time helpers, LLM
├── db/            # SQLite schema + migrations
├── integrations/  # External services (Tavily — not yet wired into the TUI)
└── types/         # Shared TypeScript types
```

## License

[ISC](https://opensource.org/licenses/ISC)
