#!/usr/bin/env node
// tools/pivot-editor/server.mjs — tiny localhost editor for a DRAFT puppet.
// Loads a character's draft dir, serves its part images + puppet.json, and
// writes back a patch (pivots, z-order, parent, mouth.at) set by clicking in
// the browser. No dependencies — plain node http. Refine what `anim char rig`
// guessed, then `anim char approve`.
//
//   node tools/pivot-editor/server.mjs library/characters/<id>/draft [port]
//
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const draftDir = resolve(process.argv[2] ?? "");
const port = Number(process.argv[3] ?? 4599);

if (!process.argv[2]) {
  console.error("usage: node tools/pivot-editor/server.mjs <draft-dir> [port]");
  process.exit(1);
}
const puppetPath = join(draftDir, "puppet.json");
if (!existsSync(puppetPath)) {
  console.error(`pivot-editor: no puppet.json at ${puppetPath}. Run 'anim char rig <id>' first.`);
  process.exit(1);
}

const MIME = { ".png": "image/png", ".html": "text/html; charset=utf-8", ".json": "application/json" };

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

/** Resolve a request path under a root, refusing traversal escapes. */
function safeJoin(root, rel) {
  const p = normalize(join(root, rel.replace(/^\/+/, "")));
  if (!p.startsWith(root)) return null;
  return p;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const path = url.pathname;

    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      return send(res, 200, await readFile(join(HERE, "index.html")), MIME[".html"]);
    }
    if (req.method === "GET" && path === "/api/puppet") {
      return send(res, 200, await readFile(puppetPath), MIME[".json"]);
    }
    if (req.method === "POST" && path === "/api/puppet") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!parsed || !Array.isArray(parsed.parts) || !parsed.mouth) {
        return send(res, 400, JSON.stringify({ error: "patch must be a puppet with parts[] and mouth" }));
      }
      await writeFile(puppetPath, JSON.stringify(parsed, null, 2) + "\n");
      return send(res, 200, JSON.stringify({ ok: true, wrote: puppetPath }));
    }
    if (req.method === "GET" && path.startsWith("/img/")) {
      const file = safeJoin(draftDir, decodeURIComponent(path.slice("/img".length)));
      if (!file || !existsSync(file)) return send(res, 404, "not found", "text/plain");
      return send(res, 200, await readFile(file), MIME[extname(file)] ?? "application/octet-stream");
    }
    return send(res, 404, "not found", "text/plain");
  } catch (err) {
    return send(res, 500, JSON.stringify({ error: String(err?.message ?? err) }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`pivot-editor: editing ${puppetPath}`);
  console.log(`  open http://127.0.0.1:${port}  (Ctrl-C to stop)`);
});
