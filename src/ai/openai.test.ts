import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());
const mockEnvGet = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
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

const { generate } = await import("./openai.ts");

describe("OpenAI generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when API key is missing", async () => {
    mockEnvGet.mockReturnValue(undefined);

    await expect(generate({ prompt: "test" })).rejects.toThrow(
      "OPENAI_API_KEY not found in env store",
    );
  });

  it("returns content, model, and provider on success", async () => {
    mockEnvGet.mockReturnValue("sk-real-key");
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "enhanced prompt" } }],
      model: "gpt-4o-mini",
    });

    const result = await generate({ prompt: "write a poem" });

    expect(result).toEqual({
      content: "enhanced prompt",
      model: "gpt-4o-mini",
      provider: "openai",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({ role: "user", content: "write a poem" }),
        ]),
      }),
    );
  });

  it("returns empty string when content is null", async () => {
    mockEnvGet.mockReturnValue("sk-key");
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
      model: "gpt-4o-mini",
    });

    const result = await generate({ prompt: "test" });
    expect(result.content).toBe("");
  });

  it("passes the prompt in the user message", async () => {
    mockEnvGet.mockReturnValue("sk-key");
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "ok" } }],
      model: "gpt-4o-mini",
    });

    await generate({ prompt: "hello world" });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "hello world" }),
        ]),
      }),
    );
  });
});
