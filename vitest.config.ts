import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      // Backend sources use NodeNext-style relative `.js` specifiers that
      // point at TypeScript files. Strip the extension so Vitest resolves them.
      { find: /^(\.{1,2}\/.*)\.js$/, replacement: "$1" },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "backend/src/**/*.{test,spec}.ts",
      "tests/**/*.{test,spec}.ts",
    ],
    testTimeout: 30_000,
  },
});
