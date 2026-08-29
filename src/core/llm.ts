import { getAIProvider } from '../ai/index.js';
import type { GenerateInput, GenerateResult } from '../ai/types.js';
import { resolveModel, resolveProviderName } from '../ai/settings.js';
import { describeProviderError } from './providerErrors.js';
import { normalPrompt } from '../ai/prompts/system.js';

export interface LLMOptions {
  systemPrompt?: string;
  provider?: string;
  model?: string;
}

export async function generate(
  prompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const provider = resolveProviderName(options.provider);
  const model = options.model ?? resolveModel(provider);
  const providerGenerate = getAIProvider(provider);
  const systemPrompt = options.systemPrompt || normalPrompt;

  try {
    const result: GenerateResult = await providerGenerate({
      prompt,
      systemPrompt,
    } as GenerateInput);
    return result.content;
  } catch (err) {
    throw new Error(describeProviderError(err, provider, model));
  }
}
