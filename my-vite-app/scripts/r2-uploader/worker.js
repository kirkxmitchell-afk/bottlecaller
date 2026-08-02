const ALLOWED_PREFIX = "godot-shift/";
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
const encoder = new TextEncoder();

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function timingSafeEqual(left, right) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const lengthsMatch = leftBytes.byteLength === rightBytes.byteLength;
  return lengthsMatch
    ? crypto.subtle.timingSafeEqual(leftBytes, rightBytes)
    : !crypto.subtle.timingSafeEqual(leftBytes, leftBytes);
}

function isAuthorized(request, env) {
  if (!env.UPLOAD_TOKEN) return false;
  return timingSafeEqual(
    request.headers.get("authorization") || "",
    `Bearer ${env.UPLOAD_TOKEN}`,
  );
}

function objectKey(url) {
  const marker = "/objects/";
  if (!url.pathname.startsWith(marker)) return null;

  let key;
  try {
    key = url.pathname
      .slice(marker.length)
      .split("/")
      .map(decodeURIComponent)
      .join("/");
  } catch {
    return null;
  }

  if (
    !key.startsWith(ALLOWED_PREFIX) ||
    key.includes("..") ||
    key.endsWith("/") ||
    key.length > 1024
  ) {
    return null;
  }
  return key;
}

function uploadId(url) {
  return url.searchParams.get("uploadId") || "";
}

function metadata(body) {
  const httpMetadata = {};
  if (typeof body?.contentType === "string") {
    httpMetadata.contentType = body.contentType;
  }
  if (typeof body?.cacheControl === "string") {
    httpMetadata.cacheControl = body.cacheControl;
  }

  const customMetadata = {};
  if (/^[a-f0-9]{64}$/.test(body?.sha256 || "")) {
    customMetadata.sha256 = body.sha256;
  }
  return { httpMetadata, customMetadata };
}

async function parsedJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function requestBodyAllowed(request) {
  const value = Number(request.headers.get("content-length"));
  return !Number.isFinite(value) || value <= MAX_REQUEST_BYTES;
}

async function handleRequest(request, env) {
  if (!isAuthorized(request, env)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    return json({ ok: true });
  }

  const key = objectKey(url);
  const action = url.searchParams.get("action");
  if (!key || !action) {
    return json({ error: "Invalid object key or action" }, { status: 400 });
  }

  if (request.method === "HEAD" && action === "head") {
    const object = await env.BUCKET.head(key);
    if (!object) return new Response(null, { status: 404 });
    return new Response(null, {
      headers: {
        "content-length": String(object.size),
        etag: object.httpEtag,
        "x-bc-sha256": object.customMetadata?.sha256 || "",
      },
    });
  }

  if (request.method === "PUT" && action === "put") {
    if (!request.body) {
      return json({ error: "Missing request body" }, { status: 400 });
    }
    if (!requestBodyAllowed(request)) {
      return json({ error: "Request body exceeds 25 MiB" }, { status: 413 });
    }
    const object = await env.BUCKET.put(key, request.body, metadata({
      contentType: request.headers.get("content-type"),
      cacheControl: request.headers.get("cache-control"),
      sha256: request.headers.get("x-bc-sha256"),
    }));
    return json({ key: object.key, size: object.size, etag: object.httpEtag });
  }

  if (request.method === "POST" && action === "create") {
    const body = await parsedJson(request);
    if (!body) return json({ error: "Invalid metadata body" }, { status: 400 });
    const upload = await env.BUCKET.createMultipartUpload(key, metadata(body));
    return json({ key: upload.key, uploadId: upload.uploadId });
  }

  if (request.method === "PUT" && action === "part") {
    const id = uploadId(url);
    const partNumber = Number(url.searchParams.get("partNumber"));
    if (!id || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
      return json({ error: "Invalid uploadId or partNumber" }, { status: 400 });
    }
    if (!request.body) {
      return json({ error: "Missing request body" }, { status: 400 });
    }
    if (!requestBodyAllowed(request)) {
      return json({ error: "Part exceeds 25 MiB" }, { status: 413 });
    }
    const upload = env.BUCKET.resumeMultipartUpload(key, id);
    const part = await upload.uploadPart(partNumber, request.body);
    return json(part);
  }

  if (request.method === "POST" && action === "complete") {
    const id = uploadId(url);
    const body = await parsedJson(request);
    if (!id || !Array.isArray(body?.parts) || body.parts.length === 0) {
      return json({ error: "Invalid uploadId or parts" }, { status: 400 });
    }
    const upload = env.BUCKET.resumeMultipartUpload(key, id);
    const object = await upload.complete(body.parts);
    return json({ key: object.key, size: object.size, etag: object.httpEtag });
  }

  if (request.method === "DELETE" && action === "abort") {
    const id = uploadId(url);
    if (!id) return json({ error: "Missing uploadId" }, { status: 400 });
    const upload = env.BUCKET.resumeMultipartUpload(key, id);
    await upload.abort();
    return json({ aborted: true });
  }

  return json({ error: "Unsupported operation" }, { status: 405 });
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error(JSON.stringify({
        event: "r2_upload_error",
        message: error instanceof Error ? error.message : "Unknown error",
      }));
      return json(
        { error: error instanceof Error ? error.message : "R2 operation failed" },
        { status: 500 },
      );
    }
  },
};
