import { useState } from "react";
import { envStore } from "../../config/envConfig/envConfig.js";

const PROVIDER_OPTIONS = [
  { name: 'OpenAI', description: 'gpt-4o-mini', value: 'openai' },
  { name: 'Anthropic', description: 'claude-3-5-haiku-latest', value: 'anthropic' },
  { name: 'Gemini', description: 'gemini-2.0-flash', value: 'gemini' },
  { name: 'Groq', description: 'llama-3.3-70b-versatile', value: 'groq' },
];

export function ConfigView() {
  const currentProvider = envStore.get('ai_provider') || 'openai';
  const initialIdx = PROVIDER_OPTIONS.findIndex(o => o.value === currentProvider);
  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  const handleProviderChange = (index: number) => {
    const option = PROVIDER_OPTIONS[index];
    if (option) {
      setSelectedProvider(option.value);
      envStore.set('ai_provider', option.value);
      setStatus(`Provider set to ${option.value}`);
    }
  };

  const API_KEY_NAMES: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY',
    groq: 'GROQ_API_KEY',
  };

  const handleSetKey = () => {
    if (!apiKey.trim()) return;
    const keyName = API_KEY_NAMES[selectedProvider];
    if (keyName) {
      envStore.set(keyName, apiKey.trim());
      setStatus(`API key updated for ${selectedProvider}`);
    }
    setApiKey('');
  };

  return (
    <scrollbox scrollY padding={1}>
      <text fg="green">Configuration</text>

      <box marginTop={1}>
        <text>AI Provider:</text>
        <select
          options={PROVIDER_OPTIONS}
          selectedIndex={initialIdx}
          onChange={handleProviderChange}
          focused
        />
      </box>

      <box marginTop={1}>
        <text>Set API Key for {selectedProvider}:</text>
        <input
          value={apiKey}
          onChange={(v) => setApiKey(v as string)}
          onSubmit={(v) => { if (typeof v === 'string') { setApiKey(v); handleSetKey(); } }}
          placeholder="Enter API key..."
        />
      </box>

      {status && <text fg="green">{status}</text>}
    </scrollbox>
  );
}
