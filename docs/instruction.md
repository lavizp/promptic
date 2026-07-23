# Context & Specification: Second Brain CLI (`apps/cli`)

You are tasked with implementing the CLI application.

## 1. Overview
The CLI is a persistent Terminal User Interface (TUI) REPL built using **OpenTUI** (`@opentui/react`) and **TypeScript**. It acts as an interactive "Second Brain" interface that stays open (like OpenCode or Claude Code) and processes slash commands without exiting the process.

## 2. Tech Stack & Dependencies
- **Framework:** OpenTUI (`@opentui/react`, React, Yoga Flexbox layout)
- **Runtime:** Node.js + TypeScript (`tsx`)
- **Data Persistence Layer:** Interacts with local Markdown files and SQLite

---

## 3. Layout & UI Architecture
Use a Flexbox column layout filling 100% of the terminal height/width:
1. **Top Container (`flexGrow: 1`):** A dynamic `OutputPane` that renders content depending on the current command/state.
2. **Bottom Container (`height: 3`, bordered):** A fixed, persistent `InputPrompt` component with auto-focus where users type commands.

### Supported Views inside `OutputPane`:
- **Feed / History View:** Default view displaying output history of past commands.
- **Todo Dashboard:** Split-view layout (Daily Todos on left sorted by category `work|fitness|personal`; Backlog on right). Allows arrow key navigation & Spacebar check-off.
- **Note View:** Displays rendered Markdown content, top tag pills, and a bottom "Linked Mentions / Backlinks" section.
- **Chat Stream:** Renders response blocks when running `/hey`.

---

## 4. Command Specifications & Business Logic

Implement a central `CommandParser` that intercepts user input in `InputPrompt` and routes to the following handlers:

### A. Context-Free Query: `/hey [prompt]`
- **Behavior:** Makes a stateless API call to an LLM service.
- **Constraint:** Must NOT load current notes or context into the LLM prompt. Completely discard history after streaming back the answer.

### B. Reminders: `/reminder [message]`
- **Behavior:** Parses user message and scheduled time (e.g., `/reminder Meeting at 4PM tomorrow`).
- **Storage:** Persists reminder text and ISO timestamp to the database for an external daemon/worker to trigger email alerts.

### C. Notes Engine: `/note [action] [args]`
- **Actions:**
  - `/note create [title]` -> Opens default editor (Vim/Nano/VS Code) or prompt, creates `.md` file with YAML frontmatter.
  - `/note view [id|title]` -> Displays note content, tags, and backlinks in the `OutputPane`.
  - `/note edit [id]` -> Spawns system editor to update the `.md` file.

### D. Tagging & Linking Engine:
- **`/tag [note_id] [tag]`**: Updates the YAML frontmatter in the target note's Markdown file (e.g., `tags: [fitness, work]`) and syncs the database tag index.
- **`/link [source_note_id] [target_note_id]`**:
  1. Appends `[[Target Note]]` inside the source note.
  2. Updates the bidirectional links table in the database so target note displays backlinks.

### E. Todo Engine: `/todo` & `/todos`
- **Category Schema:** Tasks belong to `work`, `fitness`, or `personal`.
- **Type Schema:** Tasks are either `daily` or `backlog`.
- **Rollover System (Crucial):**
  - Upon CLI bootup, execute a startup check comparing `last_run_date` with today's date.
  - If date has changed, query all uncompleted (`pending`) tasks with type `daily` and mutate their type to `backlog`.
- **Commands:**
  - `/todo add [category] [task description]` -> Creates a new daily task under that category.
  - `/todos` -> Switches UI to interactive Todo Dashboard.

---

## 5. Architectural Requirements for Code Generation
1. Keep UI components (`src/components/`) strictly decoupled from backend/file service logic (`src/core/`).
2. Use standard React state/context hooks in OpenTUI to manage active views and command loading states.
3. Import all domain interfaces (`Todo`, `Note`, `Reminder`) strictly from `@second-brain/shared`.

1. Project Structure
second-brain-tui/
├── package.json
├── tsconfig.json
├── db/                       # Local SQLite database file (ignored in git)
│   └── brain.sqlite
├── src/
│   ├── index.tsx             # Entry point: Initializes OpenTUI renderer & mounts <App />
│   ├── App.tsx               # Main layout component (Flexbox container)
│   │
│   ├── components/           # UI Presentation Layer
│   │   ├── layout/
│   │   │   ├── OutputPane.tsx # The scrollable history/view area
│   │   │   └── InputPrompt.tsx# The fixed bottom CLI prompt
│   │   ├── views/
│   │   │   ├── NoteView.tsx   # Renders markdown notes and backlinks
│   │   │   ├── TodoView.tsx   # Renders the daily/backlog checklist
│   │   │   └── ChatView.tsx   # Renders the /hey LLM streaming response
│   │   └── shared/
│   │       ├── Tag.tsx        # Styled pill for #tags
│   │       └── ErrorBox.tsx
│   │
│   ├── controllers/          # The middleman: connects input to logic
│   │   └── commandParser.ts  # Parses "/note", "/todo", "/hey" -> updates UI state
│   │
│   └── core/                 # Business Logic (No UI code here!)
│       ├── notesEngine.ts    # File system CRUD, extracts frontmatter tags
│       ├── todoEngine.ts     # Database queries, daily rollover logic
│       ├── linkEngine.ts     # Manages bidirectional links
│       └── llm.ts            # Stateless API calls to Claude/OpenAI

2. UI Layout Architecture (Flexbox)

OpenTUI uses Flexbox (via Yoga) to position elements. You want a layout that mimics a persistent chat or IDE window: a large, scrollable area taking up most of the screen, and a fixed input bar at the bottom.

Your <App/> component should look conceptually like this:
TypeScript

<Box flexDirection="column" height="100%" width="100%">
  
  {/* TOP PANE: Takes up all available remaining space */}
  <Box flexGrow={1} overflow="hidden">
     <OutputPane activeView={currentView} />
  </Box>

  {/* BOTTOM PANE: Fixed height input area */}
  <Box height={3} borderStyle="single" borderColor="gray">
     <InputPrompt 
        onSubmit={(cmd) => handleCommand(cmd)} 
        isThinking={llmLoading} 
     />
  </Box>

</Box>

🧱 3. Structuring the UI Views

Because this is a REPL, the OutputPane needs to act as a router based on what command you just typed. You manage this with React state (e.g., const [currentView, setCurrentView] = useState('feed')).

    The Default Feed (currentView === 'feed'):
    When the app opens, it should render a stream of past commands and outputs, just like a standard terminal.

    The Todo View (currentView === 'todos'):
    When you type /todos, the layout switches to a structured dashboard.

        Use <Box flexDirection="row"> to create a split screen.

        Left side: Daily Todos categorized by Work, Fitness, Personal.

        Right side: The Backlog.

        OpenTUI handles keyboard events, so you can bind the up/down arrows to navigate tasks and Spacebar to toggle completion.

    The Note View (currentView === 'note'):
    When you type /note 5 (viewing note #5), it renders the Markdown.

        At the top: Render your <Tag/> components in a row based on the YAML frontmatter.

        In the middle: The main text content.

        At the bottom: A divider line (---), followed by "Linked Mentions", showing which other notes link to this one.

⚡ 4. Managing the "Loop" (State)

The magic of OpenTUI is that it doesn't close after a command. Here is how your state flow should work:

    User types /hey who is the president in <InputPrompt/> and hits Enter.

    commandParser catches it, identifies the /hey prefix, and updates the App state: setCurrentView('chat') and setLlmLoading(true).

    The UI instantly re-renders. The OutputPane shows a loading spinner.

    llm.ts fetches the data in the background.

    When the data returns, you update the state with the answer, setLlmLoading(false), and the UI renders the text. The prompt remains waiting for the next command.

Since you are building a tool that relies heavily on relationships (Notes linking to Notes, Todos having categories and backlog statuses), are you planning to use SQLite (via a library like better-sqlite3) to manage this data, or were you hoping to keep everything strictly as flat JSON/Markdown files?
