import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());
const mockEnvGet = vi.hoisted(() => vi.fn());

vi.mock("groq-sdk", () => ({
  default: vi.fn(function () {
    return {
      chat: {
        completions: { create: mockCreate },
      },
    };
  }),
}));

vi.mock("../config/envConfig/envConfig.ts", () => ({
  envStore: { get: mockEnvGet },
}));

const { generate } = await import("./groq.ts");

describe("Groq generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when API key is missing", async () => {
    mockEnvGet.mockReturnValue(undefined);

    await expect(generate({ prompt: "test" })).rejects.toThrow(
      "GROQ_API_KEY not found in env store",
    );
  });

  it("returns content, model, and provider on success", async () => {
    mockEnvGet.mockReturnValue("gsk-real-key");
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "enhanced groq response" } }],
      model: "llama-3.3-70b-versatile",
    });

    const result = await generate({ prompt: "write a poem" });

    expect(result).toEqual({
      content: "enhanced groq response",
      model: "llama-3.3-70b-versatile",
      provider: "groq",
    });
  });

  it("returns empty string when content is null", async () => {
    mockEnvGet.mockReturnValue("gsk-key");
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
      model: "llama-3.3-70b-versatile",
    });

    const result = await generate({ prompt: "test" });
    expect(result.content).toBe("");
  });

  it("passes messages with system prompt and user input", async () => {
    mockEnvGet.mockReturnValue("gsk-key");
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "ok" } }],
      model: "llama-3.3-70b-versatile",
    });

    await generate({ prompt: "hello groq" });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "llama-3.3-70b-versatile",
        messages: [
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({ role: "user", content: "hello groq" }),
        ],
      }),
    );
  });
});
