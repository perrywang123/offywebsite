import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, linkSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { env } from "@/lib/env";

let cached: Buffer | undefined;
export function diagnosticKey(): Buffer {
  if (env.CHECKOUT_DIAGNOSTICS_KEY) return Buffer.from(env.CHECKOUT_DIAGNOSTICS_KEY, "hex");
  if (cached) return cached;
  if (env.DATABASE_URL === ":memory:") return (cached = randomBytes(32));
  const directory = dirname(env.DATABASE_URL),
    file = join(directory, "checkout-diagnostics.key");
  mkdirSync(directory, { recursive: true });
  if (!existsSync(file)) {
    const temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      writeFileSync(temporary, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 });
      try {
        linkSync(temporary, file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    } catch {
      throw new Error("diagnostic_key_unavailable");
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
  const value = readFileSync(file, "utf8").trim();
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("diagnostic_key_unavailable");
  return (cached = Buffer.from(value, "hex"));
}
export function encryptDiagnostic(value: unknown, key: Buffer, context: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}
export function decryptDiagnostic(value: string, key: Buffer, context: string): unknown {
  try {
    const [version, iv, tag, payload] = value.split(".");
    if (version !== "v1") throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(payload, "base64url")),
        decipher.final(),
      ]).toString("utf8"),
    );
  } catch {
    throw new Error("diagnostic_key_unavailable");
  }
}
