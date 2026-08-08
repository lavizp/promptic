import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { SelectOption } from "@opentui/core";
import { envStore } from "../../config/envConfig/envConfig.js";
import { providerConfig } from "../../ai/config.js";
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
type StatusKind = 'ok' | 'error' | 'info';

function maskKey(key: string): string {
  if (key.length <= 8) return `••••${key.slice(-4)}`;
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

interface ConfigViewProps {
  onExit: () => void;
}

export function ConfigView({ onExit }: ConfigViewProps) {
  const [activeProvider, setActiveProvider] = useState(() => envStore.get('ai_provider') || 'openai');
  const [browsedProvider, setBrowsedProvider] = useState(activeProvider);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<StatusKind>('info');
  const [field, setField] = useState<Field>('provider');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const browsedKeyName = API_KEY_NAMES[browsedProvider] ?? '';
  const browsedHasKey = envStore.has(browsedKeyName);
  const activeHasKey = envStore.has(API_KEY_NAMES[activeProvider] ?? '');
  const browsedName = PROVIDER_OPTIONS.find(o => o.value === browsedProvider)?.name ?? browsedProvider;
  const activeModel = providerConfig[activeProvider as keyof typeof providerConfig]?.model;

  const options: SelectOption[] = PROVIDER_OPTIONS.map((o) => {
    const parts = [
      o.model,
      o.value === activeProvider ? '✓ ACTIVE' : '',
      envStore.has(API_KEY_NAMES[o.value]!) ? '✓ key' : '· no key',
    ].filter(Boolean);
    return { name: o.name, description: parts.join('  ·  '), value: o.value };
  });
  const selectedIndex = Math.max(0, options.findIndex(o => o.value === browsedProvider));

  const setStatusLine = (msg: string, kind: StatusKind = 'info') => {
    setStatus(msg);
    setStatusKind(kind);
  };

  const handleProviderHighlight = (_index: number, option: SelectOption | null) => {
    if (option) {
      setBrowsedProvider(String(option.value));
      setStatus('');
      setConfirmRemove(false);
    }
  };

  const handleProviderSelect = (_index: number, option: SelectOption | null) => {
    if (!option) return;
    const value = String(option.value);
    setActiveProvider(value);
    envStore.set('ai_provider', value);
    setStatusLine(`Active provider set to ${value}`, 'ok');
    setConfirmRemove(false);
    setField('key');
  };

  const handleSetKey = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatusLine(`Paste a key for ${browsedName} first`, 'error');
      return;
    }
    envStore.set(browsedKeyName, trimmed);
    setStatusLine(`API key saved for ${browsedName}`, 'ok');
    setApiKey('');
  };

  const handleRemoveKey = () => {
    if (!browsedHasKey) return;
    setConfirmRemove(true);
    setStatus('');
  };

  useKeyboard((key) => {
    if (key.name === 'escape') {
      if (confirmRemove) {
        setConfirmRemove(false);
        return;
      }
      // First Esc while typing a key just blurs to the provider field instead
      // of losing the draft; a second Esc leaves the view.
      if (field === 'key' && apiKey.trim()) {
        setField('provider');
        return;
      }
      onExit();
      return;
    }

    if (confirmRemove) {
      if (key.name === 'y') {
        envStore.delete(browsedKeyName);
        setStatusLine(`API key removed for ${browsedName}`, 'ok');
        setConfirmRemove(false);
      } else if (key.name === 'n') {
        setConfirmRemove(false);
      }
      return;
    }

    if (key.name === 'tab') {
      setField(f => (f === 'provider' ? 'key' : 'provider'));
      return;
    }

    // Only bound on the provider field so 'r' can still be typed in keys.
    if (field === 'provider' && key.name === 'r') {
      handleRemoveKey();
      return;
    }
  });

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
        </box>

        <box>
          <text fg={field === 'key' ? 'cyan' : 'gray'}>
            {field === 'key' ? '▸ ' : '  '}API key for {browsedName} ({browsedKeyName})
          </text>
          <input
            value={apiKey}
            onInput={(v) => setApiKey(v)}
            onSubmit={(v) => handleSetKey(String(v))}
            placeholder={`Paste ${browsedKeyName}…`}
            focused={field === 'key'}
          />
          {browsedHasKey
            ? <text fg="gray">Saved: {maskKey(envStore.get(browsedKeyName) ?? '')}</text>
            : <text fg="gray">· no key set</text>}
        </box>
      </box>

      <box marginTop={1} flexDirection="column">
        {confirmRemove && (
          <text fg="yellow">Remove the API key for {browsedName}? [y/n]</text>
        )}
        {!confirmRemove && status && (
          <text fg={statusKind === 'ok' ? 'green' : statusKind === 'error' ? 'red' : 'gray'}>
            {statusKind === 'ok' ? '✓ ' : ''}{status}
          </text>
        )}
        {!activeHasKey && (
          <text fg="yellow">⚠ {activeProvider} is active but has no API key — /hey will fail</text>
        )}
        <text fg="gray">Active: {activeProvider} ({activeModel ?? 'unknown model'})</text>
        {confirmRemove ? (
          <ShortcutBar hints={[{ key: 'y', label: 'remove' }, { key: 'n', label: 'cancel' }]} />
        ) : field === 'provider' ? (
          <ShortcutBar hints={[
            { key: '↑/↓', label: 'browse' },
            { key: 'enter', label: 'activate' },
            ...(browsedHasKey ? [{ key: 'r', label: 'remove key' }] : []),
            { key: 'tab', label: 'key' },
            { key: 'esc', label: 'back' },
          ]} />
        ) : (
          <ShortcutBar hints={[
            { key: 'enter', label: 'save' },
            { key: 'tab', label: 'provider' },
            { key: 'esc', label: 'back' },
          ]} />
        )}
      </box>
    </box>
  );
}
