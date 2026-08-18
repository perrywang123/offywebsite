import { isValidEmail } from "../../lib/validation";
import { getDb, type Db } from "../db/client";
import { newsletterSubscribers } from "../db/schema";

export type SubscribeResult =
  | { ok: true }
  | { ok: false; status: 400 | 409; reason: "invalid_email" | "already_subscribed" };

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
  );
}

export function subscribeEmail(email: string, db: Db = getDb()): SubscribeResult {
  const normalized = email.trim().toLowerCase();

  if (!isValidEmail(normalized)) {
    return { ok: false, status: 400, reason: "invalid_email" };
  }

  try {
    db.insert(newsletterSubscribers).values({ email: normalized }).run();
    return { ok: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, status: 409, reason: "already_subscribed" };
    }
    throw error;
  }
}
