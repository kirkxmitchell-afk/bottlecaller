#!/usr/bin/env node
/**
 * After a Godot Web export overwrites public/godot-shift/index.html,
 * run: node scripts/restore-godot-index.mjs
 * Restores BC bridge helpers and syncs fileSizes to the exported .pck/.wasm.
 */
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const godotDir = join(root, "public/godot-shift");
const templatePath = join(root, "scripts/godot-shift-index.template.html");
const outPath = join(godotDir, "index.html");

async function sha256(path) {
  return await new Promise((accept, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => accept(hash.digest("hex")));
  });
}

const pckPath = join(godotDir, "index.pck");
const pck = statSync(pckPath).size;
const wasm = statSync(join(godotDir, "index.wasm")).size;
const BUILD_ID = `pck-${(await sha256(pckPath)).slice(0, 16)}`;
const assetV = `${pck}-${BUILD_ID}`;
let html = readFileSync(templatePath, "utf8");
html = html.replace(
  /"fileSizes":\{[^}]+\}/,
  `"fileSizes":{"index.pck":${pck},"index.pck?v=${pck}":${pck},"index.pck?v=${assetV}":${pck},"index.wasm":${wasm}}`
);
html = html.replace(
  /GODOT_CONFIG\.fileSizes\['index\.pck'\]\s*\+\s*'-[^']+'/,
  `GODOT_CONFIG.fileSizes['index.pck'] + '-${BUILD_ID}'`
);
if (!html.includes("__BC_GODOT_INBOX__") || !html.includes("godot_load_ready")) {
  console.error("Template missing BC bridge helpers.");
  process.exit(1);
}
writeFileSync(outPath, html);
console.log(`Restored ${outPath}`);
console.log(`fileSizes: pck=${pck} wasm=${wasm} assetV=${assetV}`);
