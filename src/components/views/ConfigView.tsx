import { useState, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import type { SelectOption } from "@opentui/core";
import { envStore } from "../../config/envConfig/envConfig.js";
import { PROVIDER_DEFAULTS, PROVIDER_NAMES } from "../../ai/config.js";
import type { AIProviderEnums } from "../../ai/types.js";
import { hasModelOverride, resolveModel, resolveProviderName, setModel } from "../../ai/settings.js";
import { supportsTools } from "../../ai/capabilities.js";
import { fallbackModels, listModels } from "../../ai/models.js";
import { ShortcutBar } from "../shared/ShortcutBar.js";

const TAVILY_KEY_NAME = 'TAVILY_API_KEY';

type Field = 'provider' | 'model' | 'key' | 'tavily';
type StatusKind = 'ok' | 'error' | 'info';
type ModelsState = 'idle' | 'loading' | 'loaded' | 'error';

function maskKey(key: string): string {
  if (key.length <= 8) return `••••${key.slice(-4)}`;
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

interface ConfigViewProps {
  onExit: () => void;
}

export function ConfigView({ onExit }: ConfigViewProps) {
  const [activeProvider, setActiveProvider] = useState<AIProviderEnums>(() => resolveProviderName());
  const [browsedProvider, setBrowsedProvider] = useState<AIProviderEnums>(activeProvider);
  const [apiKey, setApiKey] = useState('');
  const [modelDraft, setModelDraft] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [status, setStatus] = useState('');
  const [statusKind, setStatusKind] = useState<StatusKind>('info');
  const [field, setField] = useState<Field>('provider');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsState, setModelsState] = useState<ModelsState>('idle');
  const [showModelList, setShowModelList] = useState(false);

  const tavilyHasKey = envStore.has(TAVILY_KEY_NAME);
  const browsedKeyName = PROVIDER_DEFAULTS[browsedProvider].apiKeyName;
  const browsedHasKey = envStore.has(browsedKeyName);
  const activeHasKey = envStore.has(PROVIDER_DEFAULTS[activeProvider].apiKeyName);
  const browsedName = PROVIDER_DEFAULTS[browsedProvider].label;
  const browsedModel = resolveModel(browsedProvider);
  const activeModel = resolveModel(activeProvider);
  const activeToolsOk = supportsTools(activeProvider, activeModel);

  const options: SelectOption[] = PROVIDER_NAMES.map((name) => {
    const parts = [
      resolveModel(name),
      hasModelOverride(name) ? 'custom' : '',
      name === activeProvider ? '✓ ACTIVE' : '',
      envStore.has(PROVIDER_DEFAULTS[name].apiKeyName) ? '✓ key' : '· no key',
    ].filter(Boolean);
    return { name: PROVIDER_DEFAULTS[name].label, description: parts.join('  ·  '), value: name };
  });
  const selectedIndex = Math.max(0, options.findIndex(o => o.value === browsedProvider));

  const setStatusLine = (msg: string, kind: StatusKind = 'info') => {
    setStatus(msg);
    setStatusKind(kind);
  };

  // Fetching is opt-in (press `m`) rather than automatic: it costs a network
  // round trip and needs a valid key, neither of which should be a side effect
  // of tabbing past the field.
  useEffect(() => {
    if (!showModelList || modelsState !== 'loading') return;
    let cancelled = false;
    listModels(browsedProvider)
      .then((ids) => {
        if (cancelled) return;
        setModels(ids);
        setModelsState('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setModels(fallbackModels(browsedProvider));
        setModelsState('error');
        setStatusLine(
          `Could not list ${PROVIDER_DEFAULTS[browsedProvider].label} models: ${
            err instanceof Error ? err.message : String(err)
          }. Type one manually.`,
          'error',
        );
      });
    return () => { cancelled = true; };
  }, [showModelList, modelsState, browsedProvider]);

  const resetModelList = () => {
    setModels([]);
    setModelsState('idle');
    setShowModelList(false);
  };

  const handleProviderHighlight = (_index: number, option: SelectOption | null) => {
    if (option) {
      setBrowsedProvider(option.value as AIProviderEnums);
      setStatus('');
      setConfirmRemove(false);
      setModelDraft('');
      resetModelList();
    }
  };

  const handleProviderSelect = (_index: number, option: SelectOption | null) => {
    if (!option) return;
    const value = option.value as AIProviderEnums;
    setActiveProvider(value);
    envStore.set('ai_provider', value);
    setStatusLine(`Active provider set to ${PROVIDER_DEFAULTS[value].label}`, 'ok');
    setConfirmRemove(false);
    setField('model');
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

  const handleSetModel = (value: string) => {
    const trimmed = value.trim();
    setModel(browsedProvider, trimmed);
    const now = resolveModel(browsedProvider);
    setModelDraft('');
    resetModelList();
    if (!supportsTools(browsedProvider, now)) {
      setStatusLine(`Model set to ${now} — note it has no tool support, so /hey cannot read your notes.`, 'error');
    } else {
      setStatusLine(`Model set to ${now}`, 'ok');
    }
  };

  const handleModelSelect = (_index: number, option: SelectOption | null) => {
    if (!option) return;
    handleSetModel(String(option.value));
  };

  const handleResetModel = () => {
    setModel(browsedProvider, '');
    resetModelList();
    setStatusLine(`Model reset to the default (${PROVIDER_DEFAULTS[browsedProvider].defaultModel})`, 'ok');
  };

  const handleSetTavilyKey = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setStatusLine('Paste a Tavily API key first', 'error');
      return;
    }
    envStore.set(TAVILY_KEY_NAME, trimmed);
    setStatusLine('Tavily API key saved', 'ok');
    setTavilyKey('');
  };

  const handleRemoveTavilyKey = () => {
    if (!tavilyHasKey) return;
    envStore.delete(TAVILY_KEY_NAME);
    setStatusLine('Tavily API key removed', 'ok');
  };

  const handleRemoveKey = () => {
    if (!browsedHasKey) return;
    setConfirmRemove(true);
    setStatus('');
  };

  const modelOptions: SelectOption[] = models.map((id) => ({
    name: id,
    description: supportsTools(browsedProvider, id) ? '✓ tools' : '· no tools',
    value: id,
  }));

  useKeyboard((key) => {
    if (key.name === 'escape') {
      if (confirmRemove) {
        setConfirmRemove(false);
        return;
      }
      if (showModelList) {
        resetModelList();
        return;
      }
      // First Esc while typing a key just blurs to the provider field instead
      // of losing the draft; a second Esc leaves the view.
      if (field === 'key' && apiKey.trim()) {
        setField('provider');
        return;
      }
      if (field === 'model' && modelDraft.trim()) {
        setField('provider');
        return;
      }
      if (field === 'tavily' && tavilyKey.trim()) {
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

    // The model list owns arrows/enter while open.
    if (showModelList) return;

    if (key.name === 'tab') {
      setField(f => (f === 'provider' ? 'model' : f === 'model' ? 'key' : f === 'key' ? 'tavily' : 'provider'));
      return;
    }

    if (key.name === 'm' && field === 'model' && !modelDraft) {
      setShowModelList(true);
      setModelsState('loading');
      setStatusLine(`Fetching ${browsedName} models…`);
      return;
    }

    // Only bound where a text field isn't focused, so 'r' stays typeable in keys.
    if (key.name === 'r') {
      if (field === 'provider') handleRemoveKey();
      else if (field === 'tavily') handleRemoveTavilyKey();
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
            focused={field === 'provider' && !showModelList}
          />
        </box>

        <box marginBottom={1}>
          <text fg={field === 'model' ? 'cyan' : 'gray'}>
            {field === 'model' ? '▸ ' : '  '}Model for {browsedName}
          </text>
          {showModelList ? (
            modelsState === 'loading' ? (
              <text fg="gray">Loading models…</text>
            ) : (
              <select
                options={modelOptions}
                onSelect={handleModelSelect}
                showDescription
                wrapSelection
                focusedBackgroundColor="cyan"
                focusedTextColor="black"
                selectedBackgroundColor="#1f2937"
                focused
              />
            )
          ) : (
            <>
              <input
                value={modelDraft}
                onInput={(v) => setModelDraft(v)}
                onSubmit={(v) => handleSetModel(String(v))}
                placeholder={`${browsedModel}  (enter to set · m to list)`}
                focused={field === 'model'}
              />
              <text fg="gray">
                Using: {browsedModel}
                {hasModelOverride(browsedProvider) ? '  ·  custom' : '  ·  default'}
                {supportsTools(browsedProvider, browsedModel) ? '  ·  ✓ tools' : '  ·  · no tools'}
              </text>
            </>
          )}
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
            focused={field === 'key' && !showModelList}
          />
          {browsedHasKey
            ? <text fg="gray">Saved: {maskKey(envStore.get(browsedKeyName) ?? '')}</text>
            : <text fg="gray">· no key set</text>}
        </box>

        <box marginTop={1}>
          <text fg={field === 'tavily' ? 'cyan' : 'gray'}>
            {field === 'tavily' ? '▸ ' : '  '}Tavily web search ({TAVILY_KEY_NAME})
          </text>
          <input
            value={tavilyKey}
            onInput={(v) => setTavilyKey(v)}
            onSubmit={(v) => handleSetTavilyKey(String(v))}
            placeholder={`Paste ${TAVILY_KEY_NAME}…`}
            focused={field === 'tavily' && !showModelList}
          />
          {tavilyHasKey
            ? <text fg="gray">Saved: {maskKey(envStore.get(TAVILY_KEY_NAME) ?? '')}</text>
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
        {activeHasKey && !activeToolsOk && (
          <text fg="yellow">⚠ {activeModel} has no tool support — /hey will answer without reading your notes</text>
        )}
        <text fg="gray">Active: {activeProvider} ({activeModel})</text>
        {confirmRemove ? (
          <ShortcutBar hints={[{ key: 'y', label: 'remove' }, { key: 'n', label: 'cancel' }]} />
        ) : showModelList ? (
          <ShortcutBar hints={[
            { key: '↑/↓', label: 'browse' },
            { key: 'enter', label: 'use model' },
            { key: 'esc', label: 'cancel' },
          ]} />
        ) : field === 'provider' ? (
          <ShortcutBar hints={[
            { key: '↑/↓', label: 'browse' },
            { key: 'enter', label: 'activate' },
            ...(browsedHasKey ? [{ key: 'r', label: 'remove key' }] : []),
            { key: 'tab', label: 'model' },
            { key: 'esc', label: 'back' },
          ]} />
        ) : field === 'model' ? (
          <ShortcutBar hints={[
            { key: 'm', label: 'list models' },
            { key: 'enter', label: 'set model' },
            { key: 'tab', label: 'key' },
            { key: 'esc', label: 'back' },
          ]} />
        ) : field === 'key' ? (
          <ShortcutBar hints={[
            { key: 'enter', label: 'save' },
            { key: 'tab', label: 'tavily' },
            { key: 'esc', label: 'back' },
          ]} />
        ) : (
          <ShortcutBar hints={[
            { key: 'enter', label: 'save' },
            ...(tavilyHasKey ? [{ key: 'r', label: 'remove key' }] : []),
            { key: 'tab', label: 'provider' },
            { key: 'esc', label: 'back' },
          ]} />
        )}
      </box>
    </box>
  );
}
