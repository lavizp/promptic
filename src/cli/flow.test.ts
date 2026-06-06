import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInquirerPrompt = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn());
const mockEnvStore = vi.hoisted(() => ({
  has: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("inquirer", () => ({
  default: { prompt: mockInquirerPrompt },
}));

vi.mock("@inquirer/prompts", () => ({
  select: mockSelect,
}));

vi.mock("../config/envConfig/envConfig.ts", () => ({
  envStore: mockEnvStore,
}));

const { askQuestions } = await import("../core/questionBuilder.ts");
const { questions } = await import('../utils/question.ts')
describe("askQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prompts for ai_provider (select) and returns the choice", async () => {
    mockSelect.mockResolvedValueOnce("open_ai");
    mockEnvStore.has.mockReturnValue(false);
    mockInquirerPrompt
      .mockResolvedValueOnce({ open_ai_api_key: "sk-123" })
      .mockResolvedValueOnce({ prompt: "write a poem" });

    const answers = await askQuestions(questions);

    expect(answers.ai_provider).toBe("open_ai");
    expect(answers.open_ai_api_key).toBe("sk-123");
    expect(answers.prompt).toBe("write a poem");
  });

  it("skips api key questions when env already has the key", async () => {
    mockSelect.mockResolvedValueOnce("anthropic");
    mockEnvStore.has.mockReturnValue(true);
    mockInquirerPrompt
      .mockResolvedValueOnce({ prompt: "hello" });

    const answers = await askQuestions(questions);

    expect(answers.ai_provider).toBe("anthropic");
    expect(mockInquirerPrompt).toHaveBeenCalledTimes(1);
    expect(mockInquirerPrompt).toHaveBeenCalledWith([
      { type: "input", message: "Please Enter Your Prompt", name: "prompt" },
    ]);
  });

  it("only prompts for the selected provider api key", async () => {
    mockSelect.mockResolvedValueOnce("gemini");
    mockEnvStore.has.mockReturnValue(false);
    mockInquirerPrompt
      .mockResolvedValueOnce({ gemini_api_key: "gem-key" })
      .mockResolvedValueOnce({ prompt: "hello" });

    const answers = await askQuestions(questions);

    expect(answers.ai_provider).toBe("gemini");
    expect(answers.gemini_api_key).toBe("gem-key");
    expect(answers.prompt).toBe("hello");
    expect(answers.open_ai_api_key).toBeUndefined();
    expect(answers.anthropic_api_key).toBeUndefined();
    expect(answers.groq_api_key).toBeUndefined();

    const calledNames = mockInquirerPrompt.mock.calls.map(
      (c) => c[0][0].name,
    );
    expect(calledNames).toEqual(["gemini_api_key", "prompt"]);
  });

  it("passes select choice to then callback", async () => {
    mockSelect.mockResolvedValueOnce("groq");
    mockEnvStore.has.mockReturnValue(true);
    mockInquirerPrompt.mockResolvedValueOnce({ prompt: "test" });

    await askQuestions(questions);

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Choose Your API Provider",
      }),
    );
  });
});
