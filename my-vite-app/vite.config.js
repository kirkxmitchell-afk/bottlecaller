import { resolve } from "node:path";
import { transform } from "esbuild";
import { defineConfig } from "vite";

function minifyInlineAssetsPlugin() {
  return {
    name: "minify-inline-game-assets",
    apply: "build",
    async transformIndexHtml(html, ctx) {
      if (!ctx?.path?.endsWith("/game/game.html") && ctx?.path !== "/game/game.html") {
        return html;
      }

      return minifyHtmlDocument(html);
    },
  };
}

async function minifyHtmlDocument(html) {
  let next = html;

  next = await replaceAsync(
    next,
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    async (fullMatch, attrs = "", content = "") => {
      if (/\bsrc=/.test(attrs) || !content.trim()) return fullMatch;
      const minified = await transform(content, {
        loader: "js",
        format: "esm",
        minify: true,
        drop: ["console", "debugger"],
        target: "es2020",
      });
      return `<script${attrs}>${minified.code.trim()}</script>`;
    },
  );

  next = await replaceAsync(
    next,
    /<style\b([^>]*)>([\s\S]*?)<\/style>/gi,
    async (fullMatch, attrs = "", content = "") => {
      if (!content.trim()) return fullMatch;
      const minified = await transform(content, {
        loader: "css",
        minify: true,
        target: "es2020",
      });
      return `<style${attrs}>${minified.code.trim()}</style>`;
    },
  );

  return next
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function replaceAsync(input, pattern, replacer) {
  const matches = Array.from(input.matchAll(pattern));
  if (!matches.length) return input;

  let output = "";
  let lastIndex = 0;
  for (const match of matches) {
    const [fullMatch] = match;
    const start = match.index ?? 0;
    output += input.slice(lastIndex, start);
    output += await replacer(...match);
    lastIndex = start + fullMatch.length;
  }
  output += input.slice(lastIndex);
  return output;
}

export default defineConfig({
  plugins: [minifyInlineAssetsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        game: resolve(__dirname, "game/game.html"),
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("iceberg-js")) return "vendor_ui";
          return "vendor";
        },
      },
    },
  },
});
