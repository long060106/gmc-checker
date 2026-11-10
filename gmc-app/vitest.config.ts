// Separate from vite.config.ts on purpose: the React Router plugin there isn't needed for engine unit tests.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["app/**/*.test.ts"],
    environment: "node",
  },
});
