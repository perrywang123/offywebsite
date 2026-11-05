// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, it, expect } from "vitest";
describe("read-only KOL deployment verification", () => {
  it("requires an existing production owner, matching shop and a new healthy worker heartbeat", () => {
    const dir = mkdtempSync(join(tmpdir(), "offy-readiness-test-")),
      path = join(dir, "test.db"),
      db = new Database(path);
    try {
      migrate(drizzle(db), { migrationsFolder: "db/migrations" });
      const now = Date.now();
      let automatic = false;
      const run = () =>
        spawnSync(
          process.execPath,
          ["scripts/kol-deployment-check.mjs", "--since", String(now - 1000)],
          {
            env: {
              ...process.env,
              NODE_ENV: "production",
              KOL_ENABLED: "true",
              DATABASE_URL: path,
              SHOPIFY_STORE_DOMAIN: "offy.test.myshopify.com",
              SHOPIFY_ADMIN_TOKEN: "",
              SHOPIFY_ADMIN_CLIENT_ID: automatic ? "dummy-id" : "",
              SHOPIFY_ADMIN_CLIENT_SECRET: automatic ? "dummy-secret" : "",
            },
            encoding: "utf8",
          },
        );
      expect(run().status).not.toBe(0);
      db.prepare("INSERT INTO kol_admins(id,email,password_hash,created_at) VALUES (?,?,?,?)").run(
        "owner",
        "wangperry666@gmail.com",
        `scrypt:${"a".repeat(32)}:${"b".repeat(128)}`,
        now,
      );
      db.prepare("INSERT INTO kol_runtime(key,value,updated_at) VALUES (?,?,?)").run(
        "accountingShop",
        JSON.stringify("offy.test.myshopify.com"),
        now,
      );
      db.prepare("INSERT INTO kol_runtime(key,value,updated_at) VALUES (?,?,?)").run(
        "worker",
        JSON.stringify({ at: now - 5000, error: null }),
        now,
      );
      expect(run().status).not.toBe(0);
      db.prepare("UPDATE kol_runtime SET value=? WHERE key='worker'").run(
        JSON.stringify({ at: now, error: null }),
      );
      expect(run().status).toBe(0);
      db.prepare("UPDATE kol_runtime SET value=? WHERE key='worker'").run(
        JSON.stringify({ at: now, error: null, shopify: "not_configured" }),
      );
      const paused = run();
      expect(paused.status).toBe(0);
      expect(JSON.parse(paused.stdout)).toMatchObject({
        workerReady: true,
        shopifyAdminConfigured: false,
      });
      automatic = true;
      const configured = run();
      expect(JSON.parse(configured.stdout)).toMatchObject({ shopifyAdminConfigured: true });
      expect(configured.stdout + configured.stderr).not.toContain("dummy-secret");
      db.prepare("UPDATE kol_runtime SET value=? WHERE key='worker'").run(
        JSON.stringify({ error: null }),
      );
      expect(run().status).not.toBe(0);
      expect(db.prepare("SELECT COUNT(*) n FROM kol_audit").get()).toEqual({ n: 0 });
      db.prepare("UPDATE kol_runtime SET value=? WHERE key='worker'").run(
        JSON.stringify({ at: now, error: "scope_missing" }),
      );
      expect(run().status).not.toBe(0);
    } finally {
      db.close();
      rmSync(dir, { recursive: true });
    }
  });
});
