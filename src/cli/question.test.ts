import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EnvStore } from "../config/envConfig/envStore.ts";

const mockFillEnvValue = vi.hoisted(() => vi.fn());

vi.mock("../utils/envUtils.ts", () => ({
  fillEnvValue: mockFillEnvValue,
}));

const { questions } = await import("./question.ts");

function mockEnv(hasValue: boolean): EnvStore {
  return { has: () => hasValue } as unknown as EnvStore;
}

const PROVIDERS = ["open_ai", "anthropic", "gemini", "groq"] as const;

describe("questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ai_provider", () => {
    const q = questions[0]!;

    it("is a select type with 4 provider choices", () => {
      expect(q.key).toBe("ai_provider");
      expect(q.type).toBe("select");
      if (q.type !== "select") return;
      expect(q.choices).toHaveLength(4);
      expect(q.choices.map((c: { value: string }) => c.value).sort()).toEqual(
        [...PROVIDERS].sort(),
      );
    });

    it("has no when condition (always shown)", () => {
      expect(q.when).toBeUndefined();
    });
  });

  describe("api key questions", () => {
    const providers = [
      { key: "open_ai_api_key", answerValue: "open_ai" as const, envKey: "OPENAI_API_KEY" },
      { key: "anthropic_api_key", answerValue: "anthropic" as const, envKey: "ANTHROPIC_API_KEY" },
      { key: "gemini_api_key", answerValue: "gemini" as const, envKey: "GEMINI_API_KEY" },
      { key: "groq_api_key", answerValue: "groq" as const, envKey: "GROQ_API_KEY" },
    ];

    for (const { key, answerValue, envKey } of providers) {
      describe(`${key}`, () => {
        const q = questions.find((q) => q.key === key)!;

        it("is an input type", () => {
          expect(q.type).toBe("input");
        });

        it("shows when provider matches and key is not in env", () => {
          expect(q.when!({ answers: { ai_provider: answerValue }, env: mockEnv(false) })).toBe(true);
        });

        it("skips when provider matches but key is already stored", () => {
          expect(q.when!({ answers: { ai_provider: answerValue }, env: mockEnv(true) })).toBe(false);
        });

        it("skips when a different provider is selected and key not stored", () => {
          const otherProvider = PROVIDERS.find((p) => p !== answerValue)!;
          expect(q.when!({ answers: { ai_provider: otherProvider }, env: mockEnv(false) })).toBe(false);
        });

        it("then callback calls fillEnvValue with the correct env key", () => {
          q.then!({ value: "test-key-123" });
          expect(mockFillEnvValue).toHaveBeenCalledWith({
            key: envKey,
            value: "test-key-123",
          });
        });
      });
    }
  });

  describe("prompt", () => {
    const q = questions.find((q) => q.key === "prompt")!;

    it("is an input type", () => {
      expect(q.type).toBe("input");
    });

    it("has no when condition (always shown)", () => {
      expect(q.when).toBeUndefined();
    });

    it("has no then callback", () => {
      expect(q.then).toBeUndefined();
    });
  });
});
