// @vitest-environment node
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { scryptSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, it, expect } from "vitest";
const owner = "wangperry666@gmail.com",
  password = "samplepass12";
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "offy-admin-policy-")),
    path = join(directory, "test.db"),
    sqlite = new Database(path);
  migrate(drizzle(sqlite), { migrationsFolder: "db/migrations" });
  return { directory, path, sqlite };
}
const adminScript = resolve("scripts/kol-admin.mjs"),
  bootstrapScript = resolve("scripts/kol-admin-bootstrap.mjs");
describe("production account tools", () => {
  it("refuses other emails and accepts an owner password through stdin", () => {
    const f = fixture();
    try {
      const env = { ...process.env, NODE_ENV: "production" as const, DATABASE_URL: f.path };
      const rejected = spawnSync(process.execPath, [adminScript, "create", "other@example.com"], {
        env,
        input: password,
        encoding: "utf8",
      });
      expect(rejected.status).not.toBe(0);
      const created = spawnSync(process.execPath, [adminScript, "create", owner], {
        env,
        input: password,
        encoding: "utf8",
      });
      expect(created.status, created.stderr).toBe(0);
      expect(created.stdout).not.toContain(password);
      const row = f.sqlite
        .prepare("SELECT password_hash FROM kol_admins WHERE email=?")
        .get(owner) as { password_hash: string };
      expect(row.password_hash).toMatch(/^scrypt:/);
      expect(row.password_hash).not.toContain(password);
    } finally {
      f.sqlite.close();
      rmSync(f.directory, { recursive: true });
    }
  });
  it("prepares only a private hash and bootstraps idempotently without overwriting a reset", () => {
    const f = fixture();
    try {
      const env = { ...process.env, NODE_ENV: "production" as const, DATABASE_URL: f.path };
      const prepared = spawnSync(process.execPath, [adminScript, "prepare-production", owner], {
        cwd: f.directory,
        env,
        input: password,
        encoding: "utf8",
      });
      expect(prepared.status, prepared.stderr).toBe(0);
      const content = readFileSync(join(f.directory, ".env"), "utf8");
      expect(content).not.toContain(password);
      const hash = content.trim().split("=")[1];
      const boot = () =>
        spawnSync(process.execPath, [bootstrapScript], {
          env: { ...env, KOL_ADMIN_BOOTSTRAP_HASH: hash },
          encoding: "utf8",
        });
      expect(existsSync(bootstrapScript)).toBe(true);
      expect(boot().status).toBe(0);
      expect(boot().status).toBe(0);
      expect(f.sqlite.prepare("SELECT count(*) n FROM kol_admins").get()).toEqual({ n: 1 });
      const replacement = `scrypt:${"a".repeat(32)}:${scryptSync("replacement-pass", "a".repeat(32), 64).toString("hex")}`;
      f.sqlite
        .prepare("UPDATE kol_admins SET password_hash=? WHERE email=?")
        .run(replacement, owner);
      expect(boot().status).toBe(0);
      expect(f.sqlite.prepare("SELECT password_hash FROM kol_admins").get()).toEqual({
        password_hash: replacement,
      });
    } finally {
      f.sqlite.close();
      rmSync(f.directory, { recursive: true });
    }
  });
});
