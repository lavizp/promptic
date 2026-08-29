import Anthropic from "@anthropic-ai/sdk";
import type { GenerateInput, GenerateResult } from "./types.ts";
import { resolveMaxTokens, resolveModel, resolveTemperature, requireApiKey } from "./settings.ts";

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = requireApiKey('anthropic');
  const model = resolveModel('anthropic');
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    system: input.systemPrompt,
    messages: [{ role: "user", content: input.prompt }],
    temperature: resolveTemperature('anthropic'),
    max_tokens: resolveMaxTokens('anthropic'),
  });

  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    content,
    model: response.model,
    provider: "anthropic",
  };
}
