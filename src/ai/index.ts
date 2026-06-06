import type { AIProviderEnums } from "./types.ts";

export type { GenerateInput, GenerateResult } from "./types.ts";
export { providerConfig } from "./config.ts";

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
