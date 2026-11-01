import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, like, lt, or, sql } from "drizzle-orm";
import type { Db as Database } from "../db/client";
type Db = Pick<Database, "select" | "insert" | "update" | "delete" | "transaction">;
import {
  checkoutAttempts as attempts,
  checkoutAttemptEvents as events,
  kolAudit,
} from "../db/schema";
import type {
  CheckoutDiagnosticEvent,
  ClientCheckoutObservation,
  DiagnosticDetail,
  DiagnosticList,
  DiagnosticSummary,
} from "@/lib/checkout-diagnostics";
import type { CreateCheckoutResult } from "../payments/types";
import { decryptDiagnostic, diagnosticKey, encryptDiagnostic } from "./crypto";

const DAY = 86400000,
  RECEIPT_TTL = 30 * 60_000;
type AttemptInput = Pick<DiagnosticSummary, "items" | "locale" | "pagePath"> & {
  country: DiagnosticSummary["countryEvidence"];
};
const digest = (receipt: string) => createHash("sha256").update(receipt).digest("hex");
/** Retain only bounded diagnostic facts; URL paths and Cart keys are capabilities. */
export function redactDiagnostic(value: unknown, depth = 0): unknown {
  if (depth > 16) return "[depth limit]";
  if (typeof value === "string")
    return value
      .slice(0, 4000)
      .replace(/https?:\/\/[^\s"'<>]+/gi, "[redacted URL]")
      .replace(/gid:\/\/shopify\/Cart\/[^\s"'<>]+/gi, "[redacted Cart]")
      .replace(
        /(?:key|token|authorization|cookie|password)\s*[=:]\s*[^\s,;]+/gi,
        "[redacted secret]",
      );
  if (Array.isArray(value)) return value.slice(0, 250).map((v) => redactDiagnostic(v, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 100)
        .map(([k, v]) => [
          k,
          /^(?:checkoutUrl|cartId|rawText|authorization|cookie|email|phone|shipping|address.*|customerAccessToken|offy_ref|receipt|token|password)$/i.test(
            k,
          )
            ? "[redacted]"
            : redactDiagnostic(v, depth + 1),
        ]),
    );
  return value;
}
function event(
  db: Db,
  id: string,
  type: string,
  data: unknown,
  at: number,
  sensitiveJson: string | null = null,
) {
  db.insert(events)
    .values({
      attemptId: id,
      at,
      type,
      dataJson: JSON.stringify(redactDiagnostic(data)),
      sensitiveJson,
    })
    .run();
}
function seal(db: Db, id: string, value: unknown, key: Buffer | undefined, now: number) {
  try {
    return encryptDiagnostic(value, key ?? diagnosticKey(), id);
  } catch {
    event(db, id, "sensitive_unavailable", { reason: "encryption_unavailable" }, now);
    return null;
  }
}
export function createAttempt(db: Db, input: AttemptInput, now = Date.now()) {
  const id = randomUUID(),
    receipt = randomBytes(32).toString("base64url");
  db.transaction((tx) => {
    tx.insert(attempts)
      .values({
        id,
        receiptDigest: digest(receipt),
        createdAt: now,
        updatedAt: now,
        status: "started",
        country: input.country.country,
        countryJson: JSON.stringify(input.country),
        itemsJson: JSON.stringify(input.items),
        locale: input.locale,
        pagePath: input.pagePath,
        sensitiveExpiresAt: now + 7 * DAY,
      })
      .run();
    event(
      tx,
      id,
      "started",
      { items: input.items, country: input.country, pagePath: input.pagePath },
      now,
    );
  });
  return { id, receipt };
}
export function claimAttempt(
  db: Db,
  receipt: string | undefined,
  input: AttemptInput,
  now = Date.now(),
) {
  return db.transaction((tx) => {
    const existing =
      receipt &&
      tx
        .select()
        .from(attempts)
        .where(
          and(
            eq(attempts.receiptDigest, digest(receipt)),
            isNull(attempts.claimedAt),
            eq(attempts.status, "started"),
            gte(attempts.createdAt, now - RECEIPT_TTL),
          ),
        )
        .get();
    const matched = existing && existing.itemsJson === JSON.stringify(input.items);
    const a = matched ? { id: existing.id, receipt: receipt! } : createAttempt(tx, input, now);
    tx.update(attempts)
      .set({
        claimedAt: now,
        updatedAt: now,
        status: "processing",
        country: input.country.country,
        countryJson: JSON.stringify(input.country),
      })
      .where(eq(attempts.id, a.id))
      .run();
    event(tx, a.id, "server_received", { country: input.country, items: input.items }, now);
    return a;
  });
}
export function clientObservation(
  db: Db,
  receipt: string,
  type: ClientCheckoutObservation,
  now = Date.now(),
) {
  if (
    ![
      "client_verification_failed",
      "client_timeout",
      "client_error",
      "redirect_requested",
    ].includes(type)
  )
    throw new Error("invalid_observation");
  db.transaction((tx) => {
    const a = tx
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.receiptDigest, digest(receipt)),
          gte(attempts.createdAt, now - RECEIPT_TTL),
        ),
      )
      .get();
    if (!a) return;
    const count = tx
      .select({ n: sql<number>`count(*)` })
      .from(events)
      .where(
        and(
          eq(events.attemptId, a.id),
          or(like(events.type, "client_%"), eq(events.type, "redirect_requested")),
        ),
      )
      .get()!.n;
    if (count >= 8) return;
    event(tx, a.id, type, { reportedBy: "browser" }, now);
    tx.update(attempts)
      .set({
        updatedAt: now,
        ...(a.status === "started" && type !== "redirect_requested"
          ? { status: "client_failed", error: type }
          : {}),
      })
      .where(eq(attempts.id, a.id))
      .run();
  });
}
export function observeAttempt(
  db: Db,
  id: string,
  observation: CheckoutDiagnosticEvent,
  key?: Buffer,
  now = Date.now(),
) {
  const sensitive =
    observation.type === "shopify_response" ? seal(db, id, observation.data, key, now) : null;
  event(db, id, observation.type, observation.data, now, sensitive);
}
export function finishAttempt(
  db: Db,
  id: string,
  result: CreateCheckoutResult,
  key?: Buffer,
  now = Date.now(),
) {
  const a = db.select().from(attempts).where(eq(attempts.id, id)).get();
  if (!a) return;
  const url = result.ok
    ? result.redirect.kind === "redirect"
      ? result.redirect.url
      : result.redirect.approveUrl
    : undefined;
  let host: string | null = null;
  try {
    if (url) host = new URL(url).host;
  } catch {}
  db.transaction((tx) => {
    tx.update(attempts)
      .set({
        updatedAt: now,
        status: result.ok ? "redirect_ready" : "failed",
        error: result.ok ? null : result.error,
        durationMs: now - (a.claimedAt ?? a.createdAt),
        redirectHost: host,
        ...(url ? { sensitiveJson: seal(tx, id, { checkoutUrl: url }, key, now) } : {}),
      })
      .where(eq(attempts.id, id))
      .run();
    event(tx, id, "server_result", result, now);
  });
}
function summary(a: typeof attempts.$inferSelect): DiagnosticSummary {
  return {
    id: a.id,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    status: a.status as DiagnosticSummary["status"],
    country: a.country,
    countryEvidence: JSON.parse(a.countryJson),
    items: JSON.parse(a.itemsJson),
    locale: a.locale,
    pagePath: a.pagePath,
    error: a.error,
    durationMs: a.durationMs,
    redirectHost: a.redirectHost,
    sensitiveExpiresAt: a.sensitiveExpiresAt,
  };
}
export function attemptDetail(db: Db, id: string): DiagnosticDetail | null {
  const a = db.select().from(attempts).where(eq(attempts.id, id)).get();
  return a
    ? {
        ...summary(a),
        events: db
          .select({ id: events.id, at: events.at, type: events.type, dataJson: events.dataJson })
          .from(events)
          .where(eq(events.attemptId, id))
          .orderBy(events.id)
          .all()
          .map(({ dataJson, ...e }) => ({ ...e, data: JSON.parse(dataJson) })),
      }
    : null;
}
export function listAttempts(
  db: Db,
  filter: {
    country?: string;
    status?: string;
    query?: string;
    from?: number;
    to?: number;
    page?: number;
    pageSize?: number;
  },
): DiagnosticList {
  const page = Math.max(1, Math.floor(filter.page ?? 1)),
    pageSize = Math.min(50, Math.max(1, Math.floor(filter.pageSize ?? 25)));
  const needle = filter.query?.replace(/[\\%_]/g, "\\$&");
  const where = and(
    filter.country ? eq(attempts.country, filter.country) : undefined,
    filter.status ? eq(attempts.status, filter.status) : undefined,
    filter.from ? gte(attempts.createdAt, filter.from) : undefined,
    filter.to ? lt(attempts.createdAt, filter.to) : undefined,
    needle
      ? sql`(${attempts.id} LIKE ${`%${needle}%`} ESCAPE '\\' OR ${attempts.itemsJson} LIKE ${`%${needle}%`} ESCAPE '\\' OR EXISTS (SELECT 1 FROM checkout_attempt_events ce WHERE ce.attempt_id = ${attempts.id} AND ce.type = 'catalog_checked' AND ce.data_json LIKE ${`%${needle}%`} ESCAPE '\\'))`
      : undefined,
  );
  const rows = db
    .select()
    .from(attempts)
    .where(where)
    .orderBy(desc(attempts.createdAt), desc(attempts.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()
    .map(summary);
  if (rows.length) {
    const evidence = db
      .select({ attemptId: events.attemptId, type: events.type, dataJson: events.dataJson })
      .from(events)
      .where(
        and(
          inArray(
            events.attemptId,
            rows.map((r) => r.id),
          ),
          inArray(events.type, ["catalog_checked", "shopify_response"]),
        ),
      )
      .orderBy(events.id)
      .all();
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const e of evidence) {
      const row = byId.get(e.attemptId)!,
        data = JSON.parse(e.dataJson);
      if (e.type === "catalog_checked")
        row.itemNames = Object.fromEntries(
          (Array.isArray(data.resolved) ? data.resolved : []).flatMap(
            (item: { code?: string; product?: { name?: { en?: string } } }) =>
              item.code && item.product?.name?.en ? [[item.code, item.product.name.en]] : [],
          ),
        );
      if (e.type === "shopify_response")
        row.warningCount = Array.isArray(data.body?.data?.cartCreate?.warnings)
          ? data.body.data.cartCreate.warnings.length
          : 0;
    }
  }
  return {
    rows,
    total: db
      .select({ n: sql<number>`count(*)` })
      .from(attempts)
      .where(where)
      .get()!.n,
    page,
    pageSize,
  };
}
export function revealAttempt(db: Db, id: string, actor: string, key?: Buffer, now = Date.now()) {
  const a = db.select().from(attempts).where(eq(attempts.id, id)).get();
  if (!a) throw new Error("diagnostic_not_found");
  if (a.sensitiveExpiresAt <= now) throw new Error("diagnostic_payload_expired");
  if (a.redirectHost && !a.sensitiveJson) throw new Error("diagnostic_payload_unavailable");
  const material = key ?? diagnosticKey();
  const link = a.sensitiveJson
    ? (decryptDiagnostic(a.sensitiveJson, material, id) as { checkoutUrl: string })
    : null;
  const responses = db
    .select()
    .from(events)
    .where(eq(events.attemptId, id))
    .orderBy(events.id)
    .all()
    .filter((e) => e.sensitiveJson)
    .map((e) => ({
      at: e.at,
      type: e.type,
      data: decryptDiagnostic(e.sensitiveJson!, material, id),
    }));
  db.insert(kolAudit)
    .values({
      id: randomUUID(),
      actor,
      action: "checkout.reveal",
      entity: id,
      detail: "{}",
      createdAt: now,
    })
    .run();
  return { checkoutUrl: link?.checkoutUrl ?? null, responses };
}
export function cleanupAttempts(db: Db, now = Date.now()) {
  db.transaction((tx) => {
    const expired = tx
      .select({ id: attempts.id })
      .from(attempts)
      .where(lt(attempts.sensitiveExpiresAt, now));
    tx.update(events)
      .set({ sensitiveJson: null })
      .where(and(inArray(events.attemptId, expired), sql`${events.sensitiveJson} IS NOT NULL`))
      .run();
    tx.update(attempts)
      .set({ sensitiveJson: null })
      .where(lt(attempts.sensitiveExpiresAt, now))
      .run();
    tx.delete(attempts)
      .where(lt(attempts.createdAt, now - 30 * DAY))
      .run();
  });
}
