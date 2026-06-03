import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());
const mockEnvGet = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function () {
    return { messages: { create: mockCreate } };
  }),
}));

vi.mock("../config/envConfig/envConfig.ts", () => ({
  envStore: { get: mockEnvGet },
}));

const { generate } = await import("./anthropic.ts");

describe("Anthropic generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when API key is missing", async () => {
    mockEnvGet.mockReturnValue(undefined);

    await expect(generate({ prompt: "test" })).rejects.toThrow(
      "ANTHROPIC_API_KEY not found in env store",
    );
  });

  it("returns content, model, and provider on success", async () => {
    mockEnvGet.mockReturnValue("sk-ant-key");
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "enhanced response" },
      ],
      model: "claude-3-5-haiku-latest",
    });

    const result = await generate({ prompt: "write a story" });

    expect(result).toEqual({
      content: "enhanced response",
      model: "claude-3-5-haiku-latest",
      provider: "anthropic",
    });
  });

  it("joins multiple text content blocks", async () => {
    mockEnvGet.mockReturnValue("sk-ant-key");
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "part one" },
        { type: "text", text: "part two" },
      ],
      model: "claude-3-5-haiku-latest",
    });

    const result = await generate({ prompt: "test" });
    expect(result.content).toBe("part one\npart two");
  });

  it("filters out non-text content blocks", async () => {
    mockEnvGet.mockReturnValue("sk-ant-key");
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "only text" },
        { type: "tool_use", id: "abc", name: "tool", input: {} },
      ],
      model: "claude-3-5-haiku-latest",
    });

    const result = await generate({ prompt: "test" });
    expect(result.content).toBe("only text");
  });

  it("passes system prompt and user message correctly", async () => {
    mockEnvGet.mockReturnValue("sk-ant-key");
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "ok" }],
      model: "claude-3-5-haiku-latest",
    });

    await generate({ prompt: "hello" });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-3-5-haiku-latest",
        system: expect.any(String),
        messages: [{ role: "user", content: "hello" }],
      }),
    );
  });
});
