import type { AIProviderEnums } from "./types.ts";
import { PROVIDER_DEFAULTS } from "./config.ts";
import { envStore } from "../config/envConfig/envConfig.ts";

/** envStore key holding a per-provider model override, e.g. `groq_model`. */
export function modelKey(provider: AIProviderEnums): string {
  return `${provider}_model`;
}

/** Legacy config may store 'open_ai'; anything unknown falls back to openai. */
export function resolveProviderName(raw?: string): AIProviderEnums {
  const value = (raw || envStore.get('ai_provider') || 'openai').trim();
  if (value === 'open_ai') return 'openai';
  return value in PROVIDER_DEFAULTS ? (value as AIProviderEnums) : 'openai';
}

/** A user override from /config wins over the built-in default. */
export function resolveModel(provider: AIProviderEnums): string {
  return envStore.get(modelKey(provider))?.trim() || PROVIDER_DEFAULTS[provider].defaultModel;
}

/**
 * Storing the default would pin the user to today's model forever, so an
 * override equal to the default (or empty) deletes the key instead. That way
 * bumping a default in code still reaches everyone who never chose a model.
 */
export function setModel(provider: AIProviderEnums, model: string): void {
  const trimmed = model.trim();
  if (trimmed === '' || trimmed === PROVIDER_DEFAULTS[provider].defaultModel) {
    envStore.delete(modelKey(provider));
  } else {
    envStore.set(modelKey(provider), trimmed);
  }
}

export function hasModelOverride(provider: AIProviderEnums): boolean {
  return envStore.has(modelKey(provider));
}

export function resolveApiKey(provider: AIProviderEnums): string | undefined {
  return envStore.get(PROVIDER_DEFAULTS[provider].apiKeyName);
}

/** Throws with the provider's key name so the message is actionable. */
export function requireApiKey(provider: AIProviderEnums): string {
  const key = resolveApiKey(provider);
  if (!key) {
    throw new Error(
      `${PROVIDER_DEFAULTS[provider].apiKeyName} is not set. Run /config to add it.`,
    );
  }
  return key;
}

export function resolveTemperature(provider: AIProviderEnums): number {
  return PROVIDER_DEFAULTS[provider].temperature;
}

export function resolveMaxTokens(provider: AIProviderEnums): number {
  return PROVIDER_DEFAULTS[provider].maxTokens;
}
