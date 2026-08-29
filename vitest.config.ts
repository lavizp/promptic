import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    // `*.bun.test.ts` files import `bun:sqlite`, which Vitest cannot resolve.
    // They run under `bun test` instead — see the `test:db` script.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.bun.test.ts"],
  },
});
