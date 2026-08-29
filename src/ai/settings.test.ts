import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = vi.hoisted(() => {
  const data: Record<string, string> = {};
  return {
    data,
    reset() { for (const k of Object.keys(data)) delete data[k]; },
  };
});

vi.mock('conf', () => ({
  default: class {
    get(key: string) { return store.data[key]; }
    set(key: string, value: string) { store.data[key] = value; }
    has(key: string) { return key in store.data; }
    delete(key: string) { delete store.data[key]; }
    get store() { return store.data; }
  },
}));

const { modelKey, resolveModel, setModel, hasModelOverride, resolveProviderName } =
  await import('./settings.js');

describe('model resolution', () => {
  beforeEach(() => store.reset());

  it('falls back to the built-in default', () => {
    expect(resolveModel('groq')).toBe('openai/gpt-oss-120b');
  });

  it('prefers a user override', () => {
    store.data[modelKey('groq')] = 'qwen/qwen3.8-27b';
    expect(resolveModel('groq')).toBe('qwen/qwen3.8-27b');
    expect(hasModelOverride('groq')).toBe(true);
  });

  it('does not persist an override equal to the default', () => {
    // Otherwise the user would be pinned to today's model forever and a future
    // default bump would never reach them.
    setModel('groq', 'openai/gpt-oss-120b');
    expect(hasModelOverride('groq')).toBe(false);
  });

  it('clears an override when set to empty', () => {
    setModel('groq', 'qwen/qwen3.8-27b');
    expect(hasModelOverride('groq')).toBe(true);
    setModel('groq', '   ');
    expect(hasModelOverride('groq')).toBe(false);
    expect(resolveModel('groq')).toBe('openai/gpt-oss-120b');
  });
});

describe('resolveProviderName', () => {
  beforeEach(() => store.reset());

  it('maps the legacy open_ai spelling', () => {
    expect(resolveProviderName('open_ai')).toBe('openai');
  });

  it('reads the stored provider when none is given', () => {
    store.data['ai_provider'] = 'groq';
    expect(resolveProviderName()).toBe('groq');
  });

  it('falls back to openai for an unknown provider', () => {
    expect(resolveProviderName('cohere')).toBe('openai');
  });
});
