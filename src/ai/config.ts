import type { AIProviderEnums } from "./types.ts";

export interface ProviderDefaults {
  /** Human-readable name shown in /config. */
  label: string;
  /** envStore key holding this provider's API key. */
  apiKeyName: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  /** Whether the provider's API supports tool calling at all. */
  supportsTools: boolean;
  /**
   * Models that cannot do tool calling even though the provider can — the user
   * is free to point `<provider>_model` at a transcription or guard model.
   */
  toolUnsupportedModels: RegExp[];
}

/**
 * The single source of truth for provider metadata. This module imports nothing
 * but a type on purpose: settings, capabilities and the provider registry all
 * read from it, so any runtime import here would create a cycle.
 *
 * Model IDs are only *defaults*. `resolveModel` in ./settings.ts lets the user
 * override them from /config, so a provider decommissioning a model no longer
 * requires a code change — which is exactly how the old hardcoded
 * `llama-3.3-70b-versatile` became unusable.
 */
export const PROVIDER_DEFAULTS: Record<AIProviderEnums, ProviderDefaults> = {
  openai: {
    label: 'OpenAI',
    apiKeyName: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
    supportsTools: true,
    toolUnsupportedModels: [/^o1-mini/, /^whisper/, /^tts-/, /^dall-e/, /embedding/],
  },
  anthropic: {
    label: 'Anthropic',
    apiKeyName: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-haiku-latest',
    temperature: 0.7,
    maxTokens: 4096,
    supportsTools: true,
    toolUnsupportedModels: [],
  },
  gemini: {
    label: 'Gemini',
    apiKeyName: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
    temperature: 0.7,
    maxTokens: 4096,
    supportsTools: true,
    toolUnsupportedModels: [/embedding/, /^imagen/],
  },
  groq: {
    label: 'Groq',
    // Groq decommissioned every Llama chat model; `llama-3.3-70b-versatile`
    // now 404s. gpt-oss-120b is the strongest tool-calling model the API offers.
    apiKeyName: 'GROQ_API_KEY',
    defaultModel: 'openai/gpt-oss-120b',
    temperature: 0.7,
    maxTokens: 4096,
    supportsTools: true,
    toolUnsupportedModels: [/^whisper/, /guard/, /^playai-tts/, /orpheus/, /^allam/],
  },
};

export const PROVIDER_NAMES = Object.keys(PROVIDER_DEFAULTS) as AIProviderEnums[];
