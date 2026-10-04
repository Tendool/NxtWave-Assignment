import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside a React Server Components build; tests run on the server anyway.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Each test file gets its own throwaway in-memory Postgres (PGlite); migrations + the college seed take a few seconds.
    env: { PGLITE_DATA_DIR: "memory://", DATABASE_URL: "", ANTHROPIC_API_KEY: "" },
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
