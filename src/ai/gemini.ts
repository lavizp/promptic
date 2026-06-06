import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateInput, GenerateResult } from "./types.ts";
import { providerConfig } from "./config.ts";
import { envStore } from "../config/envConfig/envConfig.ts";

const config = providerConfig.gemini;

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = envStore.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not found in env store");

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: input.systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    },
  });

  return {
    content: result.response.text(),
    model: config.model,
    provider: "gemini",
  };
}
