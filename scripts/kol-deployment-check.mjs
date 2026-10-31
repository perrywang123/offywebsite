// Read-only post-deployment check; no Shopify calls, queue consumption or account mutation.
import { existsSync } from "node:fs";
import Database from "better-sqlite3";
import { PRODUCTION_ADMIN_EMAIL, validBootstrapHash } from "./lib/kol-admin-policy.mjs";
const sinceIndex = process.argv.indexOf("--since"),
  since = sinceIndex < 0 ? 0 : Number(process.argv[sinceIndex + 1]);
function fail(reason) {
  console.error(`KOL readiness failed: ${reason}`);
  process.exitCode = 1;
}
if (process.env.KOL_ENABLED !== "true") console.log(JSON.stringify({ kolEnabled: false }));
else if (!Number.isFinite(since)) fail("invalid_since");
else {
  const path = process.env.DATABASE_URL ?? "/data/offy.db";
  if (!existsSync(path)) fail("database_missing");
  else {
    let db;
    try {
      db = new Database(path, { readonly: true, fileMustExist: true });
      db.pragma("busy_timeout=5000");
      const owner = db
        .prepare("SELECT password_hash FROM kol_admins WHERE email=?")
        .get(PRODUCTION_ADMIN_EMAIL);
      const get = (key) => {
        const row = db.prepare("SELECT value FROM kol_runtime WHERE key=?").get(key);
        return row ? JSON.parse(row.value) : null;
      };
      const worker = get("worker"),
        shop = get("accountingShop");
      if (!owner || !validBootstrapHash(owner.password_hash))
        fail("owner_missing_use_private_bootstrap_hash_or_admin_cli");
      else if (shop !== process.env.SHOPIFY_STORE_DOMAIN?.toLowerCase())
        fail("accounting_shop_mismatch");
      else if (
        !worker ||
        typeof worker.at !== "number" ||
        !Number.isFinite(worker.at) ||
        worker.error ||
        worker.at < since ||
        Date.now() - worker.at > 180000
      )
        fail("worker_not_ready");
      else
        console.log(
          JSON.stringify({
            kolEnabled: true,
            ownerReady: true,
            workerReady: true,
            shopMatched: true,
          }),
        );
    } catch {
      fail("database_check_unavailable");
    } finally {
      db?.close();
    }
  }
}
