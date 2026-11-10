// Local design preview only. No application routes, secrets, mutations or commerce services.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const directory = path.dirname(fileURLToPath(import.meta.url));
const publicAssets = path.resolve(directory, "../../../public/assets");
const types = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
};
http
  .createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      const url = new URL(req.url, "http://127.0.0.1:8840");
      const isAsset = url.pathname.startsWith("/assets/");
      const root = isAsset ? publicAssets : directory;
      const relative = isAsset
        ? url.pathname.slice(8)
        : url.pathname === "/"
          ? "index.html"
          : url.pathname.slice(1);
      const file = path.resolve(root, decodeURIComponent(relative));
      if (!file.startsWith(root + path.sep) || file.endsWith(".mjs")) {
        res.writeHead(404);
        res.end();
        return;
      }
      const data = await fs.readFile(file);
      res.writeHead(200, {
        "content-type": types[path.extname(file)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(8840, "127.0.0.1", () => console.log("OFFY design preview: http://127.0.0.1:8840/"));
