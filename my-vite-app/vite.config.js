import { defineConfig } from "vite";
import { resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("/src/lib/bcHandlers/")) return "bc-handlers";
          if (id.includes("/src/lib/")) return "bc-lib";
          if (id.includes("/src/parent/") || id.includes("/src/progressionStore.js")) return "parent-runtime";
          if (id.includes("/src/game/")) return "game-runtime";
        },
      },
      input: {
        main: pathResolve(rootDir, "index.html"),
        game: pathResolve(rootDir, "game/game.html"),
      },
    },
  },
});
