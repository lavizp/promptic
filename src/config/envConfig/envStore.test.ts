import { describe, it, expect, beforeEach, vi } from "vitest";

const mockData = vi.hoisted(() => ({} as Record<string, string>));

vi.mock("conf", () => ({
  default: vi.fn(function () {
    return {
      get: (key: string) => mockData[key],
      set: (key: string, value: string) => {
        mockData[key] = value;
      },
      delete: (key: string) => {
        delete mockData[key];
      },
      get store() {
        return mockData;
      },
    };
  }),
}));

import { EnvStore } from "./envStore.ts";

describe("EnvStore", () => {
  let store: EnvStore;

  beforeEach(() => {
    Object.keys(mockData).forEach((key) => delete mockData[key]);
    store = new EnvStore();
  });

  describe("get", () => {
    it("returns the value for an existing key", () => {
      store.set("key1", "value1");
      expect(store.get("key1")).toBe("value1");
    });

    it("returns undefined for a missing key", () => {
      expect(store.get("nonexistent")).toBeUndefined();
    });
  });

  describe("set", () => {
    it("stores a value and overwrites it", () => {
      store.set("key", "first");
      expect(store.get("key")).toBe("first");
      store.set("key", "second");
      expect(store.get("key")).toBe("second");
    });
  });

  describe("has", () => {
    it("returns true when the key exists", () => {
      store.set("existing", "val");
      expect(store.has("existing")).toBe(true);
    });

    it("returns false when the key does not exist", () => {
      expect(store.has("missing")).toBe(false);
    });
  });

  describe("delete", () => {
    it("removes a stored value", () => {
      store.set("temp", "val");
      expect(store.has("temp")).toBe(true);
      store.delete("temp");
      expect(store.has("temp")).toBe(false);
    });

    it("does not throw when deleting a missing key", () => {
      expect(() => store.delete("missing")).not.toThrow();
    });
  });

  describe("getAll", () => {
    it("returns all stored key-value pairs", () => {
      store.set("a", "1");
      store.set("b", "2");
      expect(store.getAll()).toEqual({ a: "1", b: "2" });
    });

    it("returns empty object when nothing is stored", () => {
      expect(store.getAll()).toEqual({});
    });
  });

  describe("getStore", () => {
    it("returns the underlying config instance", () => {
      expect(store.getStore()).toBeDefined();
    });
  });
});
