import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  build: {
    // CommonJS require() is used for conditional imports of Node.js modules
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  optimizeDeps: {
    // Don't pre-bundle server-side modules
    exclude: [],
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
