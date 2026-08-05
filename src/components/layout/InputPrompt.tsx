import { useState, useCallback } from "react";

interface InputPromptProps {
  onSubmit: (command: string) => void;
  isProcessing: boolean;
  focused?: boolean;
}

export function InputPrompt({ onSubmit, isProcessing, focused = true }: InputPromptProps) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback((inputValue: string) => {
    if (!inputValue.trim() || isProcessing) return;
    onSubmit(inputValue.trim());
    setValue('');
  }, [onSubmit, isProcessing]);

  return (
    <input
      value={value}
      onChange={(v) => setValue(v as string)}
      onSubmit={(v) => { if (typeof v === 'string') handleSubmit(v); }}
      placeholder={isProcessing ? "Processing..." : "Type a command (/help for list)..."}
      focused={focused}
    />
  );
}
