import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@lexho/ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
      "@lexho/api": fileURLToPath(new URL("../../packages/api/src", import.meta.url)),
      "@lexho/auth": fileURLToPath(new URL("../../packages/auth/src", import.meta.url)),
      "@lexho/constants": fileURLToPath(new URL("../../packages/constants/src", import.meta.url)),
      "@lexho/hooks": fileURLToPath(new URL("../../packages/hooks/src", import.meta.url)),
      "@lexho/utils": fileURLToPath(new URL("../../packages/utils/src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    css: true,

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json", "clover"],
      reportsDirectory: "./coverage",
    },
  },
});