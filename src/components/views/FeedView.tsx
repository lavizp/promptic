import type { HistoryEntry } from "../../types/app.js";

interface FeedViewProps {
  history: HistoryEntry[];
}

export function FeedView({ history }: FeedViewProps) {
  if (history.length === 0) {
    return (
      <box padding={1}>
        <text fg="gray">Welcome to Second Brain CLI. Type /help to see available commands.</text>
      </box>
    );
  }

  return (
    <scrollbox scrollY padding={1}>
      {history.map((entry) => (
        <box key={entry.id} marginBottom={1}>
          {entry.command !== 'system' && (
            <text fg="cyan">{`> ${entry.command}`}</text>
          )}
          <text>{entry.output}</text>
        </box>
      ))}
    </scrollbox>
  );
}
