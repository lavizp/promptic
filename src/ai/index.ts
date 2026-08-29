import type { AIProviderEnums } from "./types.ts";

export type { GenerateInput, GenerateResult } from "./types.ts";
export { PROVIDER_DEFAULTS, PROVIDER_NAMES } from "./config.ts";
export type { ProviderDefaults } from "./config.ts";
export {
  hasModelOverride,
  resolveApiKey,
  resolveModel,
  resolveProviderName,
  setModel,
} from "./settings.ts";
export { supportsTools } from "./capabilities.ts";
export { fallbackModels, listModels } from "./models.ts";

import { generate as generateAnthropic } from "./anthropic.ts";
import { generate as generateGemini } from "./gemini.ts";
import { generate as generateGroq } from "./groq.ts";
import { generate as generateOpenAI } from "./openai.ts";

const aiProvidermap = {
  'anthropic': generateAnthropic,
  'openai': generateOpenAI,
  'gemini': generateGemini,
  'groq': generateGroq
}

export const getAIProvider = (ai: AIProviderEnums) => {
  return aiProvidermap[ai]
}
