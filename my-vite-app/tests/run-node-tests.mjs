import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outdir = path.join(tmpdir(), `bottlecaller-tests-${process.pid}`);
const outfile = path.join(outdir, "v2.test.mjs");

mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: [path.join(root, "tests", "v2.test.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: "inline",
});

const result = spawnSync(process.execPath, ["--test", outfile], {
  cwd: root,
  stdio: "inherit",
});

try {
  rmSync(outdir, { recursive: true, force: true });
} catch {}

process.exitCode = result.status ?? 1;
