import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // experimentalAstAwareRemapping reduces variance and slightly improves
      // wall-clock by avoiding the legacy source-map-based remap path.
      experimentalAstAwareRemapping: true,
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        // Test files themselves are not subject under test.
        "src/**/*.test.ts",
        // Barrel files re-export symbols and contain no executable logic
        // worth covering; behavior is exercised through the modules they
        // re-export.
        "src/**/index.ts",
      ],
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 95,
        statements: 95,
      },
    },
  },
});
