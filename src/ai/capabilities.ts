import type { AIProviderEnums } from "./types.ts";
import { PROVIDER_DEFAULTS } from "./config.ts";

/**
 * Models proven at runtime not to accept tools, keyed `provider:model`.
 * Session-only: a provider adding tool support shouldn't need a config edit.
 */
const runtimeDenied = new Set<string>();

/**
 * Tool support is a property of the *model*, not the provider — nothing stops a
 * user pointing `groq_model` at `whisper-large-v3`.
 */
export function supportsTools(provider: AIProviderEnums, model: string): boolean {
  const defaults = PROVIDER_DEFAULTS[provider];
  if (!defaults.supportsTools) return false;
  if (runtimeDenied.has(`${provider}:${model}`)) return false;
  return !defaults.toolUnsupportedModels.some(pattern => pattern.test(model));
}

export function markToolsUnsupported(provider: AIProviderEnums, model: string): void {
  runtimeDenied.add(`${provider}:${model}`);
}

/** Matches the various ways providers phrase "this model has no tools". */
export function isToolUnsupportedError(message: string): boolean {
  return /tool|function[\s_-]*call/i.test(message) && /not\s+support|unsupported|invalid/i.test(message);
}
