import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSet = vi.hoisted(() => vi.fn());

vi.mock("../config/envConfig/envConfig.ts", () => ({
  envStore: {
    set: mockSet,
  },
}));

import { fillEnvValue } from "./envUtils.ts";

describe("fillEnvValue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls envStore.set with the key and value", () => {
    fillEnvValue({ key: "MY_KEY", value: "my_value" });
    expect(mockSet).toHaveBeenCalledWith("MY_KEY", "my_value");
  });

  it("calls envStore.set exactly once", () => {
    fillEnvValue({ key: "K", value: "V" });
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it("handles empty string value", () => {
    fillEnvValue({ key: "K", value: "" });
    expect(mockSet).toHaveBeenCalledWith("K", "");
  });
});
