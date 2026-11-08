import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { LANDING_RETENTION_DAYS } from "@/lib/collabs/landing";
const lifetime = LANDING_RETENTION_DAYS * 86400000;
const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret)
    .update("offy:collabs:landing-cookie:v1:" + payload)
    .digest("hex");
export function issueLandingVisitor(secret: string, now = Date.now()) {
  const payload = `${now}.${randomUUID()}`;
  return `${payload}.${sign(payload, secret)}`;
}
export function readLandingVisitor(value: string | undefined, secret: string, now = Date.now()) {
  if (!value || !secret) return null;
  const match = /^(\d{13})\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return null;
  const issuedAt = Number(match[1]);
  if (issuedAt > now || now - issuedAt >= lifetime) return null;
  const signature = sign(`${match[1]}.${match[2]}`, secret);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(match[3]))
    ? { id: match[2], issuedAt }
    : null;
}
export function landingVisitorHash(id: string, secret: string) {
  return createHmac("sha256", secret)
    .update("offy:collabs:landing-visitor:v1:" + id)
    .digest("hex");
}
/** One bounded minute bucket, with only already-hashed anonymous browser keys. */
export function createLandingLimiter(globalLimit = 1200, visitorLimit = 60) {
  let minute = -1,
    total = 0;
  const counts = new Map<string, number>();
  return (key: string, now = Date.now()) => {
    const bucket = Math.floor(now / 60000);
    if (bucket !== minute) {
      minute = bucket;
      total = 0;
      counts.clear();
    }
    const count = counts.get(key) ?? 0;
    if (total >= globalLimit || count >= visitorLimit) return false;
    total++;
    counts.set(key, count + 1);
    return true;
  };
}
