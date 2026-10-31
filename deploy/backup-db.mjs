// Piped into a one-off app container before replacement; no migrations or account writes.
import { existsSync, mkdirSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
const path = process.env.DATABASE_URL ?? "/data/offy.db";
if (!path.startsWith("/data/") || path.split("/").includes(".."))
  throw new Error("persistent_database_path_required");
if (!existsSync(path)) {
  console.log("Database not created yet; first deployment.");
} else {
  const folder = join(dirname(path), "deploy-backups");
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const target = join(
    folder,
    `offy-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.db`,
  );
  const db = new Database(path, { readonly: true, fileMustExist: true });
  db.pragma("busy_timeout=5000");
  await db.backup(target);
  db.close();
  chmodSync(target, 0o600);
  const backup = new Database(target, { readonly: true, fileMustExist: true });
  const ok = backup.pragma("integrity_check", { simple: true }) === "ok";
  backup.close();
  if (!ok) throw new Error("backup_integrity_failed");
  console.log(`Consistent database backup saved: ${target}`);
}
