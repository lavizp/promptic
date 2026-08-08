import { useState, useCallback, useEffect } from "react";
import { envStore } from "../../config/envConfig/envConfig.js";
import { providerConfig } from "../../ai/config.js";

interface InputPromptProps {
  onSubmit: (command: string) => void;
  isProcessing: boolean;
  focused?: boolean;
}

const SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function Spinner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex(i => (i + 1) % SPINNER_CHARS.length), 80);
    return () => clearInterval(timer);
  }, []);

  return <text fg="cyan">{SPINNER_CHARS[index]}</text>;
}

export function InputPrompt({ onSubmit, isProcessing, focused = true }: InputPromptProps) {
  // The input is uncontrolled; bumping the key remounts it empty after submit.
  const [resetKey, setResetKey] = useState(0);

  const provider = envStore.get('ai_provider') || 'openai';
  const model = providerConfig[provider as keyof typeof providerConfig]?.model;

  const handleSubmit = useCallback((inputValue: string) => {
    if (!inputValue.trim() || isProcessing) return;
    onSubmit(inputValue.trim());
    setResetKey(k => k + 1);
  }, [onSubmit, isProcessing]);

  return (
    <box flexDirection="row">
      <text fg="cyan">❯ </text>
      <input
        key={resetKey}
        onSubmit={(v) => { if (typeof v === 'string') handleSubmit(v); }}
        placeholder={isProcessing ? "Processing..." : "Type a command (/help for list)..."}
        focused={focused}
        flexGrow={1}
      />
      {isProcessing ? (
        <box flexDirection="row">
          <Spinner />
          <text fg="gray"> Processing…</text>
        </box>
      ) : (
        <text fg="gray">{provider} · {model}</text>
      )}
    </box>
  );
}
