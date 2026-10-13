import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // jsdom 默认在 `about:blank`(不透明源)上跑,**没有 localStorage** ——
    // 购物袋测试依赖它。给一个真实源,localStorage/sessionStorage 才会存在。
    // (Node 26 + 新版 jsdom 收紧了这一点,之前是宽松放行。)
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/app/**"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
