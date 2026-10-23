import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/core": src("core"),
      "@/infra": src("infra"),
      "@/presentation": src("presentation"),
    },
  },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
