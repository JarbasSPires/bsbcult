import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { config } from "dotenv";

config({ path: ".env.test" });

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/test-db.ts"],
    env: {
      DATABASE_URL: process.env.DATABASE_URL as string,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
