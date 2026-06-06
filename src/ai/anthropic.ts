import Anthropic from "@anthropic-ai/sdk";
import type { GenerateInput, GenerateResult } from "./types.ts";
import { providerConfig } from "./config.ts";
import { envStore } from "../config/envConfig/envConfig.ts";

const config = providerConfig.anthropic;

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = envStore.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not found in env store");

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: config.model,
    system: input.systemPrompt,
    messages: [{ role: "user", content: input.prompt }],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
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
