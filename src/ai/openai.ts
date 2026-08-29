import OpenAI from "openai";
import type { GenerateInput, GenerateResult } from "./types.ts";
import { resolveMaxTokens, resolveModel, resolveTemperature, requireApiKey } from "./settings.ts";

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = requireApiKey('openai');
  const model = resolveModel('openai');
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.prompt },
    ],
    temperature: resolveTemperature('openai'),
    max_tokens: resolveMaxTokens('openai'),
  });

  return {
    content: response.choices[0]?.message.content ?? "",
    model: response.model,
    provider: "openai",
  };
}
