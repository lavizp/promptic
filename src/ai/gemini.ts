import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateInput, GenerateResult } from "./types.ts";
import { resolveMaxTokens, resolveModel, resolveTemperature, requireApiKey } from "./settings.ts";

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = requireApiKey('gemini');
  const modelName = resolveModel('gemini');
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: input.systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig: {
      temperature: resolveTemperature('gemini'),
      maxOutputTokens: resolveMaxTokens('gemini'),
    },
  });

  // `response.text()` throws when the candidate carries no text part, so read
  // the parts directly instead.
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  const content = parts
    .map((part) => part.text)
    .filter((text): text is string => typeof text === "string")
    .join("");

  return {
    content,
    // Gemini does not echo the model name back.
    model: modelName,
    provider: "gemini",
  };
}
