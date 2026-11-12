import { createHmac, timingSafeEqual } from "node:crypto";
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
function signature(id: string, key: Buffer) {
  if (key.length !== 32) throw new Error("invalid_reference_key");
  return createHmac("sha256", key)
    .update("offy:marketing-checkout:v1:" + id)
    .digest("base64url");
}
export function checkoutReference(id: string, key: Buffer) {
  if (!uuid.test(id)) throw new Error("invalid_attempt_id");
  return `v1.${id}.${signature(id, key)}`;
}
export function verifyCheckoutReference(ref: string, key: Buffer) {
  try {
    const [version, id, sig, extra] = ref.split(".");
    if (version !== "v1" || extra !== undefined || !uuid.test(id ?? "")) return;
    const a = Buffer.from(signature(id, key)),
      b = Buffer.from(sig ?? "");
    return a.length === b.length && timingSafeEqual(a, b) ? id : undefined;
  } catch {
    return;
  }
}
