#!/usr/bin/env node
/**
 * After a Godot Web export overwrites public/godot-shift/index.html,
 * run: node scripts/restore-godot-index.mjs
 * Restores BC bridge helpers and syncs fileSizes to the exported .pck/.wasm.
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const godotDir = join(root, "public/godot-shift");
const templatePath = join(root, "scripts/godot-shift-index.template.html");
const outPath = join(godotDir, "index.html");

const pck = statSync(join(godotDir, "index.pck")).size;
const wasm = statSync(join(godotDir, "index.wasm")).size;
let html = readFileSync(templatePath, "utf8");
html = html.replace(
  /"fileSizes":\{"index\.pck":\d+,"index\.wasm":\d+\}/,
  `"fileSizes":{"index.pck":${pck},"index.wasm":${wasm}}`
);
if (!html.includes("__BC_GODOT_INBOX__") || !html.includes("godot_load_ready")) {
  console.error("Template missing BC bridge helpers.");
  process.exit(1);
}
writeFileSync(outPath, html);
console.log(`Restored ${outPath}`);
console.log(`fileSizes: pck=${pck} wasm=${wasm}`);
