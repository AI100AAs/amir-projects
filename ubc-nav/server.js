// Minimal zero-dependency server: serves the static app and exposes the
// /api/interpret endpoint that turns natural-language requests into route params.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize as pathNormalize } from "node:path";
import { fileURLToPath } from "node:url";
import { interpret, health } from "./lib/interpret.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "cache-control": "no-cache", ...headers });
  res.end(body);
}

async function readBody(req, limit = 8000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > limit) reject(new Error("payload too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function serveStatic(req, res) {
  // Resolve and contain the path inside PUBLIC_DIR (no path traversal).
  let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = pathNormalize(join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, "Forbidden");

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(filePath);
    send(res, 200, body, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
  } catch {
    send(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/interpret") {
      let payload;
      try {
        payload = JSON.parse((await readBody(req)) || "{}");
      } catch {
        return send(res, 400, JSON.stringify({ error: "invalid JSON" }), {
          "content-type": "application/json",
        });
      }
      const result = await interpret(payload.text);
      return send(res, 200, JSON.stringify(result), { "content-type": "application/json" });
    }

    if (req.method === "GET" && req.url === "/api/health") {
      const info = await health();
      return send(res, 200, JSON.stringify(info), { "content-type": "application/json" });
    }

    if (req.method === "GET") return serveStatic(req, res);

    send(res, 405, "Method not allowed");
  } catch (err) {
    console.error(err);
    send(res, 500, JSON.stringify({ error: "server error" }), {
      "content-type": "application/json",
    });
  }
});

server.listen(PORT, async () => {
  console.log(`UBC Soft-Nav running at http://localhost:${PORT}`);
  try {
    const h = await health();
    const active = h.backends.find((b) => b.name === h.active);
    console.log(
      `Interpreter: ${h.active}${active?.model ? ` (${active.model})` : ""}  [provider=${h.provider}]`
    );
    for (const b of h.backends) {
      console.log(`  - ${b.name}: ${b.available ? "available" : "unavailable"} — ${b.detail}`);
    }
  } catch {
    /* health is best-effort */
  }
});
