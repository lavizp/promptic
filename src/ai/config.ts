export const providerConfig = {
  openai: { model: "gpt-4o-mini", temperature: 0.7, maxTokens: 4096 },
  anthropic: { model: "claude-3-5-haiku-latest", temperature: 0.7, maxTokens: 4096 },
  gemini: { model: "gemini-2.0-flash", temperature: 0.7, maxTokens: 4096 },
  groq: { model: "llama-3.3-70b-versatile", temperature: 0.7, maxTokens: 4096 },
} as const;
