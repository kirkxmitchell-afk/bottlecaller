#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  createReadStream,
  existsSync,
  promises as fs,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(APP_ROOT, "public", "godot-shift");
const CONFIG_PATH = join(APP_ROOT, "scripts", "r2-uploader", "wrangler.jsonc");
const WORKER_NAME = "bottlecaller-r2-uploader-temp";
const KEY_PREFIX = "godot-shift";
const PART_SIZE = 20 * 1024 * 1024;
const CONCURRENCY = 2;
const MAX_RETRIES = 8;
const CACHE_CONTROL = "public, max-age=0, must-revalidate";
const DRY_RUN = process.argv.includes("--dry-run");

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".pck", "application/octet-stream"],
  [".wasm", "application/wasm"],
]);

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function sleep(ms) {
  return new Promise((accept) => setTimeout(accept, ms));
}

function wranglerCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

async function runWrangler(args, { quiet = false } = {}) {
  return await new Promise((accept, reject) => {
    const child = spawn(wranglerCommand(), ["--no-install", "wrangler", ...args], {
      cwd: APP_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    const collect = (chunk, target) => {
      const text = chunk.toString();
      output += text;
      if (!quiet) target.write(text);
    };
    child.stdout.on("data", (chunk) => collect(chunk, process.stdout));
    child.stderr.on("data", (chunk) => collect(chunk, process.stderr));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) accept(output);
      else reject(new Error(`Wrangler exited with status ${code}.`));
    });
  });
}

async function sha256(path) {
  return await new Promise((accept, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => accept(hash.digest("hex")));
  });
}

async function inventory() {
  if (!existsSync(SOURCE_DIR)) {
    throw new Error(`Godot export directory not found: ${SOURCE_DIR}`);
  }

  const entries = await fs.readdir(SOURCE_DIR, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const path = join(SOURCE_DIR, entry.name);
    const stat = await fs.stat(path);
    files.push({
      name: entry.name,
      path,
      key: `${KEY_PREFIX}/${entry.name}`,
      size: stat.size,
      contentType: MIME_TYPES.get(extname(entry.name).toLowerCase()) || "application/octet-stream",
    });
  }

  if (!files.some((file) => file.name === "index.html")) {
    throw new Error("The Godot export is missing index.html.");
  }
  if (!files.some((file) => file.name === "index.pck")) {
    throw new Error("The Godot export is missing index.pck.");
  }
  if (!files.some((file) => file.name === "index.wasm")) {
    throw new Error("The Godot export is missing index.wasm.");
  }

  const html = await fs.readFile(join(SOURCE_DIR, "index.html"), "utf8");
  if (!html.includes("__BC_GODOT_POST__") || !html.includes("godot_load_ready")) {
    throw new Error("The BottleCaller Godot bridge is missing. Run npm run godot:web:restore first.");
  }
  const pck = files.find((file) => file.name === "index.pck");
  const wasm = files.find((file) => file.name === "index.wasm");
  if (
    !html.includes(`\"index.pck\":${pck.size}`) ||
    !html.includes(`\"index.wasm\":${wasm.size}`)
  ) {
    throw new Error("Godot binary sizes are stale in index.html. Run npm run godot:web:restore first.");
  }

  return files.sort((left, right) => {
    if (left.name === "index.html") return 1;
    if (right.name === "index.html") return -1;
    return right.size - left.size || left.name.localeCompare(right.name);
  });
}

function objectUrl(endpoint, key, params = {}) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`/objects/${encodedKey}`, endpoint);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, String(value));
  }
  return url;
}

async function responseError(response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    return parsed.error || text;
  } catch {
    if (
      text.includes("There is nothing here yet")
      || text.includes("Page not found")
      || text.includes("<!DOCTYPE html")
      || text.includes("error code: 1042")
    ) {
      return `${response.status} Worker not ready yet (Cloudflare placeholder page)`;
    }
    const compact = text.replace(/\s+/g, " ").trim().slice(0, 180);
    return compact || `${response.status} ${response.statusText}`;
  }
}

async function requestJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${url.pathname}: ${await responseError(response)}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `${options.method || "GET"} ${url.pathname}: expected JSON, got ${contentType || "unknown"}`,
    );
  }
  return await response.json();
}

async function retry(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      const delay = 750 * (2 ** (attempt - 1));
      console.warn(`  ${label} failed (${attempt}/${MAX_RETRIES}); retrying in ${delay} ms.`);
      await sleep(delay);
    }
  }
  throw lastError;
}

async function waitForUploader(endpoint, token) {
  // workers.dev can return Cloudflare's "nothing here yet" HTML for a
  // minute or more after a fresh deploy/delete cycle of the same name.
  const maxAttempts = 24;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const health = await requestJson(new URL("/health", endpoint), token);
      if (health?.ok) {
        if (attempt > 1) {
          console.log(`Uploader ready after ${attempt} health checks.`);
        }
        return;
      }
      lastError = new Error("Health check returned unexpected payload.");
    } catch (error) {
      lastError = error;
    }
    const delay = Math.min(15_000, 1_500 * attempt);
    console.warn(
      `  uploader not ready (${attempt}/${maxAttempts}); waiting ${delay} ms.`,
    );
    await sleep(delay);
  }
  throw lastError || new Error("Uploader health check timed out.");
}

async function readPart(path, offset, length) {
  const handle = await fs.open(path, "r");
  try {
    const buffer = Buffer.allocUnsafe(length);
    let read = 0;
    while (read < length) {
      const result = await handle.read(buffer, read, length - read, offset + read);
      if (result.bytesRead === 0) break;
      read += result.bytesRead;
    }
    if (read !== length) {
      throw new Error(`Expected ${length} bytes at offset ${offset}, read ${read}.`);
    }
    return buffer;
  } finally {
    await handle.close();
  }
}

async function remoteMetadata(endpoint, token, file) {
  const response = await fetch(objectUrl(endpoint, file.key, { action: "head" }), {
    method: "HEAD",
    headers: { authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HEAD ${file.key}: ${await responseError(response)}`);
  return {
    size: Number(response.headers.get("content-length")),
    sha256: response.headers.get("x-bc-sha256") || "",
    etag: response.headers.get("etag") || "",
  };
}

async function verifyUpload(endpoint, token, file, digest) {
  const remote = await remoteMetadata(endpoint, token, file);
  if (!remote || remote.size !== file.size || remote.sha256 !== digest) {
    throw new Error(`Remote verification failed for ${file.key}.`);
  }
  return remote;
}

async function uploadSmall(endpoint, token, file, digest) {
  const body = await fs.readFile(file.path);
  await retry(file.name, async () => {
    await requestJson(objectUrl(endpoint, file.key, { action: "put" }), token, {
      method: "PUT",
      headers: {
        "cache-control": CACHE_CONTROL,
        "content-length": String(body.byteLength),
        "content-type": file.contentType,
        "x-bc-sha256": digest,
      },
      body,
    });
  });
}

async function uploadMultipart(endpoint, token, file, digest) {
  const created = await retry(`${file.name} create multipart`, async () => {
    return await requestJson(objectUrl(endpoint, file.key, { action: "create" }), token, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cacheControl: CACHE_CONTROL,
        contentType: file.contentType,
        sha256: digest,
      }),
    });
  });
  const count = Math.ceil(file.size / PART_SIZE);
  const parts = new Array(count);
  let nextIndex = 0;
  let uploadedBytes = 0;
  let completed = false;

  const uploadNext = async () => {
    while (nextIndex < count) {
      const index = nextIndex;
      nextIndex += 1;
      const offset = index * PART_SIZE;
      const length = Math.min(PART_SIZE, file.size - offset);
      const body = await readPart(file.path, offset, length);
      const part = await retry(`${file.name} part ${index + 1}`, async () => {
        return await requestJson(objectUrl(endpoint, file.key, {
          action: "part",
          uploadId: created.uploadId,
          partNumber: index + 1,
        }), token, {
          method: "PUT",
          headers: { "content-length": String(body.byteLength) },
          body,
        });
      });
      parts[index] = part;
      uploadedBytes += length;
      console.log(`  ${file.name}: ${formatBytes(uploadedBytes)} / ${formatBytes(file.size)}`);
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, count) }, uploadNext));
    try {
      await requestJson(objectUrl(endpoint, file.key, {
        action: "complete",
        uploadId: created.uploadId,
      }), token, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parts }),
      });
      completed = true;
    } catch (error) {
      const remote = await remoteMetadata(endpoint, token, file).catch(() => null);
      if (remote?.size === file.size && remote.sha256 === digest) completed = true;
      else throw error;
    }
  } finally {
    if (!completed) {
      await requestJson(objectUrl(endpoint, file.key, {
        action: "abort",
        uploadId: created.uploadId,
      }), token, { method: "DELETE" }).catch(() => {});
    }
  }
}

async function publishFiles(endpoint, token, files) {
  for (const file of files) {
    console.log(`\n${file.name} (${formatBytes(file.size)})`);
    const digest = await sha256(file.path);
    const existing = await remoteMetadata(endpoint, token, file);
    if (existing?.size === file.size && existing.sha256 === digest) {
      console.log("  unchanged; skipped");
      continue;
    }

    if (file.size > PART_SIZE) await uploadMultipart(endpoint, token, file, digest);
    else await uploadSmall(endpoint, token, file, digest);

    const remote = await verifyUpload(endpoint, token, file, digest);
    console.log(`  verified ${remote.etag}`);
  }
}

async function main() {
  const files = await inventory();
  const total = files.reduce((sum, file) => sum + file.size, 0);
  console.log(`Godot R2 publish: ${files.length} files, ${formatBytes(total)}`);
  console.log(`Source: ${relative(APP_ROOT, SOURCE_DIR).split(sep).join("/")}`);
  for (const file of files) {
    const mode = file.size > PART_SIZE
      ? `${Math.ceil(file.size / PART_SIZE)} multipart chunks`
      : "single request";
    console.log(`  ${file.name}: ${formatBytes(file.size)} (${mode})`);
  }

  if (DRY_RUN) {
    console.log("Dry run complete. Cloudflare was not contacted.");
    return;
  }

  if (!existsSync(join(APP_ROOT, "node_modules", "wrangler"))) {
    throw new Error("Wrangler is not installed. Run npm ci first.");
  }

  const token = randomBytes(32).toString("hex");
  const secretDir = await fs.mkdtemp(join(tmpdir(), "bottlecaller-r2-"));
  const secretPath = join(secretDir, "secrets.json");
  await fs.writeFile(secretPath, JSON.stringify({ UPLOAD_TOKEN: token }), { mode: 0o600 });
  let workerMayExist = false;

  try {
    console.log("\nDeploying temporary authenticated uploader...");
    const deployOutput = await runWrangler([
      "deploy",
      "--config",
      CONFIG_PATH,
      "--secrets-file",
      secretPath,
    ]);
    workerMayExist = true;
    await fs.rm(secretPath, { force: true });

    const endpoint = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev\/?/)?.[0];
    if (!endpoint) {
      throw new Error("Could not find the temporary Worker URL in Wrangler output.");
    }

    await waitForUploader(endpoint, token);
    // Brief settle time after workers.dev starts answering /health.
    await sleep(2000);
    await publishFiles(endpoint, token, files);
    console.log("\nGodot R2 publish completed successfully.");
  } finally {
    await fs.rm(secretDir, { recursive: true, force: true });
    if (workerMayExist) {
      console.log("\nDeleting temporary uploader Worker...");
      await runWrangler([
        "delete",
        WORKER_NAME,
        "--config",
        CONFIG_PATH,
        "--force",
      ]).catch((error) => {
        console.error(`Automatic Worker cleanup failed: ${error.message}`);
        console.error(`Run: npx wrangler delete ${WORKER_NAME} --force`);
        process.exitCode = 1;
      });
    }
  }
}

main().catch((error) => {
  console.error(`\nGodot R2 publish failed: ${error.message}`);
  process.exitCode = 1;
});
