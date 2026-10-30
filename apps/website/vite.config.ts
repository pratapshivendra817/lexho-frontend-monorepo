import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = dirname(fileURLToPath(import.meta.url));

type WebsiteConfig = UserConfig & {
  test: {
    environment: "jsdom";
    globals: boolean;
    include: string[];
    setupFiles: string;
  };
};

const config: WebsiteConfig = {
  root: rootDir,
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://192.168.31.38:8082",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // Keep the forwarded origin on the backend's allowed development origin.
            proxyReq.setHeader("origin", "http://localhost:5173");
          });
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: resolve(rootDir, "src/test/setup.ts"),
  },
};

export default defineConfig(config);
