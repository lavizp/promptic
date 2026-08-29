import type { AIProviderEnums } from '../ai/types.js';
import { PROVIDER_DEFAULTS } from '../ai/config.js';

/**
 * Turns a raw SDK error into something the user can act on.
 *
 * Pure on purpose — it reads only the provider data table, never the config
 * store — so the mapping is unit-testable without touching disk.
 *
 * A bare "404 The model X does not exist" gives no hint that /config can fix
 * it, which is exactly how a decommissioned Groq model became a dead end.
 */
export function describeProviderError(
  err: unknown,
  provider: AIProviderEnums,
  model: string,
): string {
  const message = err instanceof Error ? err.message : String(err);
  const { label, apiKeyName } = PROVIDER_DEFAULTS[provider];

  if (/\b404\b/.test(message) || /does not exist|not found/i.test(message)) {
    return `${label} rejected the model "${model}" — it may have been decommissioned. `
      + `Run /config, Tab to the model field, then press m to list the models your key can use.`;
  }
  if (/\b401\b|\b403\b/.test(message) || /invalid[_ ]api[_ ]key|unauthor|permission/i.test(message)) {
    return `${label} rejected your API key. Run /config to re-enter ${apiKeyName}.`;
  }
  if (/\b429\b/.test(message) || /rate[_ ]limit|quota/i.test(message)) {
    return `${label} is rate-limiting you (or the quota is spent). Wait a moment, or switch provider with /config.`;
  }
  if (/\b5\d\d\b/.test(message)) {
    return `${label} had a server error — try again shortly. (${message})`;
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(message)) {
    return `Could not reach ${label}. Check your connection. (${message})`;
  }
  return message;
}
