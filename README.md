# promptic-cli

A keyboard-driven terminal "second brain" — chat with AI, manage todos, notes, and reminders — all from one persistent TUI built with [OpenTUI](https://github.com/anomalyco/opentui).

## Features

- **AI chat** — `/hey` (or just type anything) asks your configured provider; every command and response lands in a scrollable feed.
- **Todos** — categories (add/remove, with a `default`), add, edit, toggle done, move between categories, delete.
- **Notes** — markdown files with categories, an embedded editor with rendered preview, move/delete.
- **Reminders** — schedule with dates/times, mark done, delete; or use natural language.
- **Natural-language reminders** — `/remind-me "call Bill tomorrow at 4PM"` uses AI to resolve the date/time.
- **Multi-provider AI** — OpenAI, Anthropic, Gemini, or Groq. Provider *and model* are configurable in-app; `/config` can list the models your key can actually reach.
- **Keyboard-driven** — every view lists its shortcuts in a hint bar; `Esc` returns to the feed.

## Run with Docker

Nothing to install but Docker — no Bun, no clone:

```bash
docker run -it --rm \
  -v promptic-db:/app/db \
  -v promptic-config:/config \
  ghcr.io/lavizp/promptic:latest
```

On first run, type `/config` to pick a provider and paste an API key. It's
stored in the `promptic-config` volume, so you only do it once.

What the flags are for:

| Flag | Why it's needed |
|---|---|
| `-it` | This is a full-screen TUI. `-i` keeps stdin open so your keystrokes reach the app; `-t` gives it a terminal to draw into. Without these you get a blank container. |
| `-v promptic-db:/app/db` | Your todos, notes, and reminders (`brain.sqlite`). Containers are disposable — without this volume, everything is gone on exit. |
| `-v promptic-config:/config` | Your provider choice and API keys. Without this you'd retype them every run. |
| `--rm` | Cleans up the stopped container. Your data lives in the volumes, not the container, so nothing is lost. |

Note: API keys are set **only** through the in-app `/config` screen. Passing
`-e OPENAI_API_KEY=...` has no effect — the app reads its keys from the `conf`
store in `/config`, never from the environment.

If you've cloned the repo, Compose wraps the same thing:

```bash
docker compose run --rm promptic     # `run`, not `up` — `up` has no terminal
```

Both paths share the same two volumes, so you can switch between them freely.

To upgrade, pull and rerun — your volumes carry over:

```bash
docker pull ghcr.io/lavizp/promptic:latest
```

## Install / Run without Docker

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
| `/search [query]` | Search notes, todos and reminders (no AI, instant) |
| `/reindex [--full]` | Build the search index; `--full` re-does everything |
| `/config` | Choose provider and model, set/remove API keys |
| `/clear` | Clear the feed history |
| `/help` | Show help |

Navigation: the feed is home. Slash commands switch views; `Esc` returns to the feed from any view. The command bar is only active on the feed, so each view owns its own keys (shown in its hint bar).

## View shortcuts

- **Todos** — `↑/↓` move · `space` toggle · `a` add · `e` edit · `enter` open · `m` move · `d` delete · `c` new category
- **Notes** — `↑/↓` move · `a` add · `e` title · `enter` edit (`Tab` preview, `Ctrl+S` save) · `m` move · `d` delete · `c` new category
- **Reminders** — `↑/↓` move · `space` done · `a` add · `e` edit · `d` delete
- **Config** — `↑/↓` browse providers · `enter` activate · `r` remove key · `Tab` switch field (provider → model → key → tavily) · on the model field, `m` lists live models

## Reminder date & time

Date can be given as `today`, `tomorrow`, or `YYYY-MM-DD`; time as `HH:MM` or `4pm`.

- Neither → error
- Date only → start of that day (midnight)
- Time only → today at that time

`/remind-me` uses AI to resolve phrases like "tomorrow at 4PM", "in 2 hours", or "next Monday".

## Providers

Set your provider and key with `/config`. These are keys in the local `conf`
store, **not** environment variables — exporting `OPENAI_API_KEY` in your shell
does nothing.

Models shown are the defaults. Override any of them from `/config`: Tab to the
**Model** field, type a model id and press Enter, or press `m` to fetch the live
list from the provider and pick one. An override is stored as `<provider>_model`
(e.g. `groq_model`); clearing it returns you to the default, so a future default
bump still reaches you.

This matters because providers retire models: Groq removed every Llama chat
model, which is why the old `llama-3.3-70b-versatile` default now 404s. With the
model configurable, that no longer needs a code change.

| Provider | Default model | Config key |
|---|---|---|
| OpenAI | gpt-4o-mini | `OPENAI_API_KEY` |
| Anthropic | claude-3-5-haiku-latest | `ANTHROPIC_API_KEY` |
| Gemini | gemini-2.0-flash | `GEMINI_API_KEY` |
| Groq | openai/gpt-oss-120b | `GROQ_API_KEY` |

## Search

Everything you write — notes, todos, reminders — can be indexed into a single
searchable table. Each note gets a one-line AI description plus keywords,
entities and an inferred date; todos and reminders are indexed locally without
an AI call, since they are already one-liners.

```
/reindex          # incremental: only what changed since last time
/reindex --full   # re-do everything
/search snell law
```

Indexing is **manual**: nothing runs when you save. A note you write today is
not searchable until you run `/reindex`. The run is incremental (unchanged items
are skipped by content hash) and degrades rather than failing — if the AI is
rate-limited or unreachable, that item gets a local heuristic summary and is
retried automatically on your next `/reindex`.

## Storage

- `db/brain.sqlite` — todos, categories, notes, reminders, the search index (`item_index` + an FTS5 table), and metadata (SQLite via `bun:sqlite`). Under Docker this is the `promptic-db` volume.
- API keys and your provider choice — a local `conf` store, set via `/config`. Under Docker this is the `promptic-config` volume, at `/config/prompt-enhancer-nodejs/config.json`.
- Notes used to be `notes/*.md` files on disk. They now live in the `notes` table; if you have a pre-existing `notes/` directory it's imported once on startup (and the files are removed after import).

## Development

```bash
npm run build      # tsc → dist/
npm start          # run the TUI (bun)
npm test           # vitest (pure logic)
npm run test:db    # bun test (SQLite-backed; needs bun:sqlite)
npm run test:all   # both
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
├── core/index/    # Retrieval index: hashing, enrichment, planning, FTS queries
├── db/            # SQLite schema + migrations + index repository
├── integrations/  # External services (Tavily — not yet wired into the TUI)
└── types/         # Shared TypeScript types
```

## License

[ISC](https://opensource.org/licenses/ISC)
