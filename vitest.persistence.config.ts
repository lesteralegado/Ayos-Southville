import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": `${import.meta.dirname}/src` } },
  test: {
    environment: "node",
    include: ["src/test/persistence.emulator.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
