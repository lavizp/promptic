import OpenAI from "openai";
import type { GenerateInput, GenerateResult } from "./types.ts";
import { providerConfig } from "./config.ts";
import { envStore } from "../config/envConfig/envConfig.ts";

const config = providerConfig.openai;

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = envStore.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not found in env store");

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.prompt },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  });

  return {
    content: response.choices[0]?.message.content ?? "",
    model: response.model,
    provider: "openai",
  };
}
