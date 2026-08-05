export interface ShortcutHint {
  key: string;
  label: string;
}

interface ShortcutBarProps {
  hints: ShortcutHint[];
}

export function ShortcutBar({ hints }: ShortcutBarProps) {
  if (hints.length === 0) return null;
  const text = hints.map(h => `[${h.key}] ${h.label}`).join('  ·  ');
  return (
    <box marginTop={1} paddingX={1}>
      <text fg="gray">{text}</text>
    </box>
  );
}
