// No web registration. Password is read from stdin, never argv or logs.
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  chmodSync,
  realpathSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import Database from "better-sqlite3";
import {
  isAdminEmailAllowed,
  normalizeAdminEmail,
  validateAdminPassword,
} from "./lib/kol-admin-policy.mjs";
try {
  await import("dotenv/config");
} catch {}
const [command, emailInput] = process.argv.slice(2),
  email = emailInput ? normalizeAdminEmail(emailInput) : "";
if (!["create", "reset", "prepare-production"].includes(command) || !/^\S+@\S+\.\S+$/.test(email))
  throw new Error("Usage: node scripts/kol-admin.mjs create|reset|prepare-production email");
if (
  !isAdminEmailAllowed(
    email,
    command === "prepare-production" ? "production" : process.env.NODE_ENV,
  )
)
  throw new Error("admin_email_not_allowed");
async function passwordInput() {
  if (!process.stdin.isTTY) return readFileSync(0, "utf8").replace(/\r?\n$/, "");
  process.stderr.write("Password (12–256 characters, hidden): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve) => {
    let value = "";
    process.stdin.on("data", (chunk) => {
      for (const c of chunk.toString()) {
        if (c === "\u0003") process.exit(130);
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stderr.write("\n");
          resolve(value);
          return;
        }
        if (c === "\u007f") value = value.slice(0, -1);
        else value += c;
      }
    });
  });
}
const password = await passwordInput();
validateAdminPassword(password);
const salt = randomBytes(16).toString("hex"),
  hash = `scrypt:${salt}:${scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex")}`;
if (command === "prepare-production") {
  const path = existsSync(".env") ? realpathSync(".env") : join(process.cwd(), ".env"),
    old = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `KOL_ADMIN_BOOTSTRAP_HASH=${hash}`;
  const updated = /^KOL_ADMIN_BOOTSTRAP_HASH=.*$/m.test(old)
    ? old.replace(/^KOL_ADMIN_BOOTSTRAP_HASH=.*$/m, line)
    : `${old}${old.endsWith("\n") || !old ? "" : "\n"}${line}\n`;
  const temp = join(dirname(path), `.env.kol-bootstrap-${randomUUID()}.local`);
  try {
    writeFileSync(temp, updated, { mode: 0o600, flag: "wx" });
    renameSync(temp, path);
    chmodSync(path, 0o600);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
  console.log(
    "Production owner bootstrap hash prepared in private .env. No production deployment performed.",
  );
} else {
  if (process.env.DATABASE_PROVIDER && process.env.DATABASE_PROVIDER !== "sqlite")
    throw new Error("SQLite only");
  const path = process.env.DATABASE_URL ?? "./data/offy.db";
  if (!existsSync(path)) throw new Error("Database absent: run migrations first");
  const db = new Database(path);
  db.pragma("foreign_keys=ON");
  db.pragma("busy_timeout=5000");
  db.transaction(() => {
    const old = db.prepare("SELECT id FROM kol_admins WHERE email=?").get(email);
    if (command === "create" && old) throw new Error("Admin already exists");
    if (command === "reset" && !old) throw new Error("Admin not found");
    const id = old?.id ?? randomUUID();
    if (old) {
      db.prepare("UPDATE kol_admins SET password_hash=? WHERE id=?").run(hash, id);
      db.prepare("DELETE FROM kol_admin_sessions WHERE admin_id=?").run(id);
    } else
      db.prepare("INSERT INTO kol_admins(id,email,password_hash,created_at) VALUES (?,?,?,?)").run(
        id,
        email,
        hash,
        Date.now(),
      );
    db.prepare(
      "INSERT INTO kol_audit(id,actor,action,entity,detail,created_at) VALUES (?,?,?,?,?,?)",
    ).run(randomUUID(), "local-cli", `admin.${command}`, id, JSON.stringify({ email }), Date.now());
  })();
  db.close();
  console.log(
    command === "create"
      ? "Administrator created."
      : "Password reset; all previous sessions revoked.",
  );
}
