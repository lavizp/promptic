import type { HistoryEntry } from "../../types/app.js";

interface FeedViewProps {
  history: HistoryEntry[];
}

export function FeedView({ history }: FeedViewProps) {
  if (history.length === 0) {
    return (
      <box padding={1} flexDirection="column">
        <text fg="cyan"><b>promptic-cli</b></text>
        <text fg="gray">Type a command below. /help lists everything.</text>
      </box>
    );
  }

  return (
    <scrollbox scrollY padding={1}>
      {history.map((entry, i) => (
        <box key={entry.id} flexDirection="column">
          {i > 0 && <box height={1} border={['top']} borderColor="gray" />}
          {entry.command !== 'system' ? (
            <>
              <text fg="cyan">❯ {entry.command}</text>
              <text>{entry.output}</text>
            </>
          ) : (
            <text fg="gray">{entry.output}</text>
          )}
        </box>
      ))}
    </scrollbox>
  );
}
