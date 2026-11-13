import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["node_modules", ".next", "apps", "_legacy", "supabase"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/**/actions.ts", "src/app/**/schemas.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/types/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});