import { useKeyboard } from "@opentui/react";
import { ShortcutBar } from "../shared/ShortcutBar.js";

interface ChatViewProps {
  stream: string;
  isProcessing: boolean;
  onExit: () => void;
}

export function ChatView({ stream, isProcessing, onExit }: ChatViewProps) {
  useKeyboard((key) => {
    if (key.name === 'escape') onExit();
  });

  return (
    <box flexDirection="column" flexGrow={1}>
      <scrollbox scrollY padding={1} flexGrow={1}>
        {isProcessing && !stream && <text fg="gray">Thinking...</text>}
        {stream && <text>{stream}</text>}
      </scrollbox>
      <ShortcutBar
        hints={[
          { key: 'esc', label: 'back' },
          { key: '/hey', label: 'ask AI' },
        ]}
      />
    </box>
  );
}
