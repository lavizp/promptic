import type { AIProviderEnums } from "./types.ts";
import { PROVIDER_DEFAULTS } from "./config.ts";
import { requireApiKey } from "./settings.ts";

/**
 * Plain fetch rather than each SDK's models API: the four SDKs disagree on
 * whether one exists (the legacy Gemini SDK has none) and on pagination, and
 * all we need is a list of ids.
 */
async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${new URL(url).host}`);
  }
  return response.json();
}

function idsFromOpenAIShape(payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data
    .map(entry => (typeof entry === 'object' && entry !== null ? (entry as { id?: unknown }).id : null))
    .filter((id): id is string => typeof id === 'string');
}

/**
 * Live model ids for a provider, sorted. Throws when the key is missing or the
 * provider rejects it — /config renders that as "type a model manually".
 */
export async function listModels(provider: AIProviderEnums): Promise<string[]> {
  const apiKey = requireApiKey(provider);

  switch (provider) {
    case 'groq': {
      const payload = await getJson('https://api.groq.com/openai/v1/models', {
        Authorization: `Bearer ${apiKey}`,
      });
      return idsFromOpenAIShape(payload).sort();
    }
    case 'openai': {
      const payload = await getJson('https://api.openai.com/v1/models', {
        Authorization: `Bearer ${apiKey}`,
      });
      return idsFromOpenAIShape(payload).sort();
    }
    case 'anthropic': {
      const payload = await getJson('https://api.anthropic.com/v1/models?limit=100', {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      });
      return idsFromOpenAIShape(payload).sort();
    }
    case 'gemini': {
      const payload = await getJson(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`,
        {},
      );
      const models = (payload as { models?: unknown }).models;
      if (!Array.isArray(models)) return [];
      return models
        .filter(entry => {
          const methods = (entry as { supportedGenerationMethods?: unknown }).supportedGenerationMethods;
          return Array.isArray(methods) && methods.includes('generateContent');
        })
        .map(entry => (entry as { name?: unknown }).name)
        .filter((name): name is string => typeof name === 'string')
        .map(name => name.replace(/^models\//, ''))
        .sort();
    }
  }
}

/** Shown when the live list can't be fetched, so /config is never empty. */
export function fallbackModels(provider: AIProviderEnums): string[] {
  return [PROVIDER_DEFAULTS[provider].defaultModel];
}
