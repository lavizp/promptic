import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { SelectOption } from "@opentui/core";
import { envStore } from "../../config/envConfig/envConfig.js";
import { ShortcutBar } from "../shared/ShortcutBar.js";

const PROVIDER_OPTIONS = [
  { name: 'OpenAI', model: 'gpt-4o-mini', value: 'openai' },
  { name: 'Anthropic', model: 'claude-3-5-haiku-latest', value: 'anthropic' },
  { name: 'Gemini', model: 'gemini-2.0-flash', value: 'gemini' },
  { name: 'Groq', model: 'llama-3.3-70b-versatile', value: 'groq' },
];

const API_KEY_NAMES: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
};

type Field = 'provider' | 'key';

interface ConfigViewProps {
  onExit: () => void;
}

export function ConfigView({ onExit }: ConfigViewProps) {
  const activeProvider = envStore.get('ai_provider') || 'openai';
  const [selectedProvider, setSelectedProvider] = useState(activeProvider);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');
  const [field, setField] = useState<Field>('provider');

  // Field-level focus is exclusive: exactly one widget is focused at a time,
  // and the global command bar is blurred while this view is mounted.
  useKeyboard((key) => {
    if (key.name === 'escape') {
      onExit();
    } else if (key.name === 'tab') {
      setField((f) => (f === 'provider' ? 'key' : 'provider'));
    }
  });

  // Rebuilt each render so the ✓ / · key-status stays in sync after a save.
  const options: SelectOption[] = PROVIDER_OPTIONS.map((o) => ({
    name: o.name,
    description: `${o.model}   ${envStore.has(API_KEY_NAMES[o.value]!) ? '✓ key set' : '· no key'}`,
    value: o.value,
  }));
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === selectedProvider));

  const handleProviderHighlight = (_index: number, option: SelectOption | null) => {
    if (option) setSelectedProvider(String(option.value));
  };

  const handleProviderSelect = (_index: number, option: SelectOption | null) => {
    if (!option) return;
    const value = String(option.value);
    setSelectedProvider(value);
    envStore.set('ai_provider', value);
    setStatus(`Active provider set to ${value}`);
  };

  const handleSetKey = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const keyName = API_KEY_NAMES[selectedProvider];
    if (keyName) {
      envStore.set(keyName, trimmed);
      setStatus(`API key saved for ${selectedProvider}`);
    }
    setApiKey('');
  };

  return (
    <box flexDirection="column" padding={1}>
      <box
        borderStyle="rounded"
        borderColor="cyan"
        title=" Configuration "
        flexDirection="column"
        padding={1}
      >
        <box marginBottom={1}>
          <text fg={field === 'provider' ? 'cyan' : 'gray'}>
            {field === 'provider' ? '▸ ' : '  '}AI Provider
          </text>
          <select
            options={options}
            selectedIndex={selectedIndex}
            onChange={handleProviderHighlight}
            onSelect={handleProviderSelect}
            showDescription
            wrapSelection
            focusedBackgroundColor="cyan"
            focusedTextColor="black"
            selectedBackgroundColor="#1f2937"
            focused={field === 'provider'}
          />
          <text fg="gray">  ↑/↓ to browse · Enter to activate</text>
        </box>

        <box>
          <text fg={field === 'key' ? 'cyan' : 'gray'}>
            {field === 'key' ? '▸ ' : '  '}API Key for {selectedProvider}
          </text>
          <input
            value={apiKey}
            onChange={(v) => setApiKey(v as string)}
            onSubmit={(v) => { if (typeof v === 'string') handleSetKey(v); }}
            placeholder={`Paste ${API_KEY_NAMES[selectedProvider] ?? 'API'} key, then Enter…`}
            focused={field === 'key'}
          />
        </box>
      </box>

      <box marginTop={1} flexDirection="column">
        {status
          ? <text fg="green">✓ {status}</text>
          : <text fg="gray">Active: {activeProvider}</text>}
        <ShortcutBar
          hints={[
            { key: 'tab', label: 'switch field' },
            { key: 'esc', label: 'back' },
          ]}
        />
      </box>
    </box>
  );
}
