#!/usr/bin/env node
/**
 * Cap Godot texture import size for mobile Web exports.
 * Re-run Godot import + Web export after this:
 *   Godot --headless --path ../bottlecaller_godot_floor --import
 *   Godot --headless --path ../bottlecaller_godot_floor --export-release "Web" ...
 *   npm run godot:web:restore
 */
import { promises as fs } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const GODOT_ROOT = join(APP_ROOT, "..", "bottlecaller_godot_floor");
const DEFAULT_LOSSY = Number(process.env.BC_GODOT_TEX_LOSSY || 0.65);

/** Longest-edge pixel caps — characters are drawn small on the floor. */
const SIZE_RULES = [
  { prefix: "assets/characters/waiter/", size: 512 },
  { prefix: "assets/characters/guests/", size: 512 },
  { prefix: "assets/tables/", size: 1024 },
  { prefix: "assets/stations/", size: 1024 },
  { prefix: "assets/background/", size: 1280 },
  { prefix: "assets/hud/", size: 1024 },
  { prefix: "assets/rewards/", size: 768 },
];

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, out);
    else if (
      entry.name.endsWith(".png.import") ||
      entry.name.endsWith(".jpg.import") ||
      entry.name.endsWith(".jpeg.import") ||
      entry.name.endsWith(".webp.import")
    ) {
      out.push(path);
    }
  }
  return out;
}

function ruleFor(rel) {
  const normalized = rel.split(sep).join("/");
  return SIZE_RULES.find((rule) => normalized.startsWith(rule.prefix)) || null;
}

function patchImport(text, sizeLimit) {
  let next = text;
  let changed = false;

  const replaceParam = (key, value) => {
    const re = new RegExp(`(^|\\n)${key}=[^\\n]*`, "m");
    if (!re.test(next)) return;
    const updated = next.replace(re, `$1${key}=${value}`);
    if (updated !== next) {
      next = updated;
      changed = true;
    }
  };

  replaceParam("process/size_limit", String(sizeLimit));
  replaceParam("compress/lossy_quality", String(DEFAULT_LOSSY));
  replaceParam("compress/high_quality", "false");
  replaceParam("mipmaps/generate", "false");
  return changed ? next : null;
}

async function main() {
  const files = await walk(join(GODOT_ROOT, "assets"));
  let updated = 0;
  let scanned = 0;
  const counts = Object.fromEntries(SIZE_RULES.map((r) => [r.prefix, 0]));
  for (const path of files) {
    const rel = relative(GODOT_ROOT, path);
    const rule = ruleFor(rel);
    if (!rule) continue;
    scanned += 1;
    const text = await fs.readFile(path, "utf8");
    const patched = patchImport(text, rule.size);
    if (!patched) continue;
    await fs.writeFile(path, patched);
    updated += 1;
    counts[rule.prefix] += 1;
  }
  console.log(
    `[optimize-godot-mobile-imports] scanned=${scanned} updated=${updated} lossy=${DEFAULT_LOSSY}`,
  );
  for (const [prefix, count] of Object.entries(counts)) {
    if (count) console.log(`  ${prefix}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
