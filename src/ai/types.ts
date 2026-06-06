export interface GenerateInput {
  prompt: string;
  systemPrompt: string;
}

export interface GenerateResult {
  content: string;
  model: string;
  provider: string;
}

export type AIProviderEnums = 'anthropic' | 'openai' | 'gemini' | 'groq'
