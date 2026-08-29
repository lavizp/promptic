import Groq from "groq-sdk";
import type { GenerateInput, GenerateResult } from "./types.ts";
import { resolveMaxTokens, resolveModel, resolveTemperature, requireApiKey } from "./settings.ts";

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = requireApiKey('groq');
  const model = resolveModel('groq');
  const client = new Groq({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.prompt },
    ],
    temperature: resolveTemperature('groq'),
    max_tokens: resolveMaxTokens('groq'),
  });

  return {
    content: response.choices[0]?.message.content ?? "",
    model: response.model,
    provider: "groq",
  };
}
