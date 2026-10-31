import { randomBytes, randomUUID, scrypt as scryptCallback, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { env, kolEnabled } from "@/lib/env";
import type { Db } from "./db";
import { kolAdmins, kolAdminSessions, kolLoginLimits } from "../db/schema";
import { audit, secureEqual } from "./core";
import {
  isAdminEmailAllowed,
  normalizeAdminEmail,
  validateAdminPassword,
} from "../../../scripts/lib/kol-admin-policy.mjs";
export const ADMIN_COOKIE = "offy_admin";
export const authConfig = () => ({
  enabled: kolEnabled(),
  ingressSecret: env.KOL_INGRESS_SECRET ?? "",
  origin: env.ADMIN_ORIGIN ?? "",
  secure: env.OFFY_INTEGRATION_TEST !== "true",
});
type AuthConfig = ReturnType<typeof authConfig>;
export class AccessError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}
export function requireIngress(headers: Headers, config: AuthConfig = authConfig()) {
  if (
    !config.enabled ||
    !config.ingressSecret ||
    !secureEqual(headers.get("x-offy-admin-ingress") ?? "", config.ingressSecret)
  )
    throw new AccessError("not_found", 404);
}
export function requireMutation(headers: Headers, config: AuthConfig = authConfig()) {
  requireIngress(headers, config);
  if (headers.get("origin") !== config.origin || headers.get("x-offy-csrf") !== "1")
    throw new AccessError("invalid_origin");
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export async function hashPassword(password: string) {
  validateAdminPassword(password);
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function addAdmin(db: Db, email: string, password: string) {
  email = normalizeAdminEmail(email);
  if (!isAdminEmailAllowed(email, env.NODE_ENV)) throw new Error("admin_email_not_allowed");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254)
    throw new Error("invalid_email");
  const id = randomUUID();
  db.insert(kolAdmins)
    .values({
      id,
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
    })
    .run();
  audit(db, "bootstrap", "admin.create", id, { email });
  return id;
}
export function throttle(db: Db, key: string, now = Date.now(), max = 7) {
  db.transaction((tx) => {
    const old = tx.select().from(kolLoginLimits).where(eq(kolLoginLimits.key, key)).get();
    if (old && old.resetsAt > now && old.attempts >= max)
      throw new AccessError("login_throttled", 429);
    tx.insert(kolLoginLimits)
      .values({ key, attempts: 1, resetsAt: now + 15 * 60_000 })
      .onConflictDoUpdate({
        target: kolLoginLimits.key,
        set:
          old && old.resetsAt > now
            ? { attempts: old.attempts + 1 }
            : { attempts: 1, resetsAt: now + 15 * 60_000 },
      })
      .run();
  });
}
export async function authenticate(db: Db, email: string, password: string, now = Date.now()) {
  email = normalizeAdminEmail(email);
  throttle(db, digest(email), now);
  const admin = isAdminEmailAllowed(email, env.NODE_ENV)
    ? db.select().from(kolAdmins).where(eq(kolAdmins.email, email)).get()
    : undefined;
  const [, salt, hash] = (
    admin?.passwordHash ?? "scrypt:00000000000000000000000000000000:invalid"
  ).split(":");
  if (!secureEqual((await derive(password.slice(0, 256), salt)).toString("hex"), hash) || !admin) {
    audit(db, "anonymous", "login.failed", digest(email), {}, now);
    return null;
  }
  const token = randomBytes(32).toString("base64url"),
    expiresAt = now + 8 * 3600_000;
  db.insert(kolAdminSessions)
    .values({ digest: digest(token), adminId: admin.id, expiresAt })
    .run();
  db.delete(kolLoginLimits)
    .where(eq(kolLoginLimits.key, digest(email)))
    .run();
  audit(db, admin.id, "login.success", admin.id, {}, now);
  return { token, expiresAt, admin: { id: admin.id, email: admin.email } };
}
export function sessionAdmin(db: Db, token: string, now = Date.now()) {
  const session = db
    .select()
    .from(kolAdminSessions)
    .where(eq(kolAdminSessions.digest, digest(token)))
    .get();
  if (!session || session.expiresAt <= now) return null;
  const admin = db
    .select({ id: kolAdmins.id, email: kolAdmins.email })
    .from(kolAdmins)
    .where(eq(kolAdmins.id, session.adminId))
    .get();
  return admin && isAdminEmailAllowed(admin.email, env.NODE_ENV) ? admin : null;
}
export function logout(db: Db, token: string) {
  db.delete(kolAdminSessions)
    .where(eq(kolAdminSessions.digest, digest(token)))
    .run();
}
export function cookieToken(headers: Headers) {
  return (
    headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${ADMIN_COOKIE}=`))
      ?.slice(ADMIN_COOKIE.length + 1) ?? ""
  );
}
export function requireAdmin(db: Db, headers: Headers) {
  requireIngress(headers);
  const admin = sessionAdmin(db, cookieToken(headers));
  if (!admin) throw new AccessError("login_required", 401);
  return admin;
}
