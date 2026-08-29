import { getMeta } from "../../db/indexRepo.js";

const WORDMARK = [
  "                                  _   _                _ _ ",
  "  _ __  _ __ ___  _ __ ___  _ __ | |_(_) ___       ___| (_)",
  " | '_ \\| '__/ _ \\| '_ ` _ \\| '_ \\| __| |/ __|____ / __| | |",
  " | |_) | | | (_) | | | | | | |_) | |_| | (_|_____| (__| | |",
  " | .__/|_|  \\___/|_| |_| |_| .__/ \\__|_|\\___|     \\___|_|_|",
  " |_|                       |_|                             ",
];

const QUICK_START: { cmd: string; hint: string }[] = [
  { cmd: '/todos', hint: 'manage your tasks' },
  { cmd: '/notes', hint: 'markdown notes' },
  { cmd: '/reminders', hint: 'schedule reminders' },
  { cmd: '/remind-me "call Bill tomorrow at 4PM"', hint: 'AI-scheduled reminder' },
  { cmd: '/search [query]', hint: 'search everything you have written' },
  { cmd: '/config', hint: 'set provider & model' },
  { cmd: '/help', hint: 'all commands' },
];

export function HomeView() {
  // Indexing is manual, so an existing brain starts with an empty index and
  // /search would silently return nothing. Say so once, here.
  const needsIndex = getMeta('index_dirty') === '1';

  return (
    <box flexDirection="column" flexGrow={1} padding={1} flexShrink={0}>
      <box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center">
        {WORDMARK.map((line, i) => (
          <text key={i} fg="cyan">{line}</text>
        ))}

        <text marginTop={1} fg="gray">
          Your second brain in the terminal. Type below, or:
        </text>
      </box>

      <box flexDirection="column" marginTop={1} paddingX={1}>
        {QUICK_START.map(({ cmd, hint }) => (
          <box key={cmd} flexDirection="row">
            <text fg="cyan" width={38}>{cmd}</text>
            <text fg="gray">{hint}</text>
          </box>
        ))}
        <text marginTop={1} fg="gray">(any other text starts a chat / asks the AI)</text>
        {needsIndex && (
          <text marginTop={1} fg="yellow">
            ⚠ Your search index is empty — run /reindex to make your notes searchable.
          </text>
        )}
      </box>
    </box>
  );
}
