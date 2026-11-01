// One-time production initialization from a server-only salted hash; preserves existing users.
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { PRODUCTION_ADMIN_EMAIL, validBootstrapHash } from "./lib/kol-admin-policy.mjs";
try {
  await import("dotenv/config");
} catch {}
if (process.env.NODE_ENV === "production") {
  const account = JSON.parse(
    readFileSync(new URL("../config/admin-account.json", import.meta.url), "utf8"),
  );
  if (account.email !== PRODUCTION_ADMIN_EMAIL) throw new Error("admin_email_not_allowed");
  const hash = process.env.KOL_ADMIN_BOOTSTRAP_HASH || account.passwordHash;
  if (!validBootstrapHash(hash)) throw new Error("invalid_admin_bootstrap_hash");
  if (process.env.DATABASE_PROVIDER && process.env.DATABASE_PROVIDER !== "sqlite")
    throw new Error("SQLite only");
  const path = process.env.DATABASE_URL ?? "./data/offy.db";
  if (!existsSync(path)) throw new Error("Run migrations before administrator bootstrap");
  const db = new Database(path);
  db.pragma("foreign_keys=ON");
  db.pragma("busy_timeout=5000");
  const created = db.transaction(() => {
    if (db.prepare("SELECT id FROM kol_admins WHERE email=?").get(PRODUCTION_ADMIN_EMAIL))
      return false;
    const id = randomUUID(),
      now = Date.now();
    db.prepare("INSERT INTO kol_admins(id,email,password_hash,created_at) VALUES (?,?,?,?)").run(
      id,
      PRODUCTION_ADMIN_EMAIL,
      hash,
      now,
    );
    db.prepare(
      "INSERT INTO kol_audit(id,actor,action,entity,detail,created_at) VALUES (?,?,?,?,?,?)",
    ).run(
      randomUUID(),
      "production-bootstrap",
      "admin.create",
      id,
      JSON.stringify({ email: PRODUCTION_ADMIN_EMAIL }),
      now,
    );
    return true;
  })();
  db.close();
  console.log(
    created
      ? "Production owner administrator initialized."
      : "Existing production owner preserved.",
  );
}
