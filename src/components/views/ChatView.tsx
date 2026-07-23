interface ChatViewProps {
  stream: string;
  isProcessing: boolean;
}

export function ChatView({ stream, isProcessing }: ChatViewProps) {
  return (
    <scrollbox scrollY padding={1}>
      {isProcessing && !stream && <text fg="gray">Thinking...</text>}
      {stream && <text>{stream}</text>}
    </scrollbox>
  );
}
