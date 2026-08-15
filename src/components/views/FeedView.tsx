import { SyntaxStyle } from "@opentui/core";
import type { HistoryEntry } from "../../types/app.js";
import { HomeView } from "./HomeView.js";

const syntaxStyle = SyntaxStyle.create();

interface FeedViewProps {
  history: HistoryEntry[];
}

export function FeedView({ history }: FeedViewProps) {
  if (history.length === 0) {
    return <HomeView />;
  }

  return (
    <scrollbox scrollY padding={1}>
      {history.map((entry, i) => (
        <box key={entry.id} flexDirection="column">
          {i > 0 && <box height={1} border={['top']} borderColor="gray" />}
          {entry.command !== 'system' ? (
            <>
              <text fg="cyan">❯ {entry.command}</text>
              <markdown content={entry.output} syntaxStyle={syntaxStyle} conceal />
            </>
          ) : (
            <text fg="gray">{entry.output}</text>
          )}
        </box>
      ))}
    </scrollbox>
  );
}
