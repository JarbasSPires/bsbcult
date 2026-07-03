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
    // Test files share a single SQLite database file (prisma/test.db) and
    // each file's afterEach hook truncates all tables. Running test files
    // in parallel workers causes cross-file data races against that shared
    // file, so we force them to run sequentially in one process.
    fileParallelism: false,
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
