import { defineConfig } from "vite";
import { resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: pathResolve(rootDir, "index.html"),
        game: pathResolve(rootDir, "game/game.html"),
      },
    },
  },
});
