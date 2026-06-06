import Groq from "groq-sdk";
import type { GenerateInput, GenerateResult } from "./types.ts";
import { providerConfig } from "./config.ts";
import { envStore } from "../config/envConfig/envConfig.ts";

const config = providerConfig.groq;

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = envStore.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not found in env store");

  const client = new Groq({ apiKey });

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
    provider: "groq",
  };
}
