import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockGetGenerativeModel = vi.hoisted(() => vi.fn());
const mockEnvGet = vi.hoisted(() => vi.fn());

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(function () {
    return { getGenerativeModel: mockGetGenerativeModel };
  }),
}));

vi.mock("../config/envConfig/envConfig.ts", () => ({
  envStore: { get: mockEnvGet },
}));

const { generate } = await import("./gemini.ts");

describe("Gemini generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  it("throws when API key is missing", async () => {
    mockEnvGet.mockReturnValue(undefined);

    await expect(generate({ prompt: "test" })).rejects.toThrow(
      "GEMINI_API_KEY not found in env store",
    );
  });

  it("returns content, model, and provider on success", async () => {
    mockEnvGet.mockReturnValue("gem-key");
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => "enhanced gemini response" },
    });

    const result = await generate({ prompt: "hello" });

    expect(result).toEqual({
      content: "enhanced gemini response",
      model: "gemini-2.0-flash",
      provider: "gemini",
    });
  });

  it("passes the prompt as a user message", async () => {
    mockEnvGet.mockReturnValue("gem-key");
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => "ok" },
    });

    await generate({ prompt: "my prompt text" });

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          {
            role: "user",
            parts: [{ text: "my prompt text" }],
          },
        ],
      }),
    );
  });

  it("passes system instruction and generation config", async () => {
    mockEnvGet.mockReturnValue("gem-key");
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => "ok" },
    });

    await generate({ prompt: "test" });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.0-flash",
        systemInstruction: expect.any(String),
      }),
    );
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          temperature: 0.7,
          maxOutputTokens: 4096,
        }),
      }),
    );
  });
});
