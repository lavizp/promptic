import { getAIProvider } from '../ai/index.js';
import type { AIProviderEnums, GenerateInput, GenerateResult } from '../ai/types.js';
import { envStore } from '../config/envConfig/envConfig.js';
import { normalPrompt } from '../ai/prompts/system.js';

/** Normalizes provider names — existing config may use 'open_ai' */
function normalizeProvider(p: string): string {
  const map: Record<string, string> = {
    'open_ai': 'openai', 'openai': 'openai',
    'anthropic': 'anthropic',
    'gemini': 'gemini',
    'groq': 'groq',
  };
  return map[p] || 'openai';
}

export interface LLMOptions {
  systemPrompt?: string;
  provider?: string;
  model?: string;
}

export async function* generateStream(
  prompt: string,
  options: LLMOptions = {}
): AsyncGenerator<string> {
  const rawProvider = options.provider || envStore.get('ai_provider') || 'openai';
  const provider = normalizeProvider(rawProvider) as AIProviderEnums;
  const generate = getAIProvider(provider);
  const systemPrompt = options.systemPrompt || normalPrompt;

  const result: GenerateResult = await generate({
    prompt,
    systemPrompt,
  } as GenerateInput);

  yield result.content;
}

export async function generate(
  prompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const rawProvider = options.provider || envStore.get('ai_provider') || 'openai';
  const provider = normalizeProvider(rawProvider) as AIProviderEnums;
  const generate = getAIProvider(provider);
  const systemPrompt = options.systemPrompt || normalPrompt;

  const result: GenerateResult = await generate({
    prompt,
    systemPrompt,
  } as GenerateInput);

  return result.content;
}
