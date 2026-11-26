import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
    sequence: { concurrent: false },
    // MongoMemoryServer starts a native mongod child process. Keeping one
    // Vitest worker avoids fork storms and the SIGSEGV observed on macOS while
    // retaining the complete test suite and all assertions.
    maxWorkers: 1,
  },
});
