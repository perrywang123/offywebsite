import { createHmac, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import type { Db } from "../kol/db";
import { metaEvents, metaOrderEvidence } from "../db/schema";
import { capiMetaEvent, type MetaEvent } from "@/lib/meta/events";
import { encryptDiagnostic } from "../checkout-diagnostics/crypto";
import { evidenceWhere, type EvidenceFilter } from "./filters";
import { pruneOrderEvidence } from "./retention";
const DAY = 86400000;
export const visitorHash = (id: string, key: Buffer) =>
  createHmac("sha256", key)
    .update("meta:" + id)
    .digest("hex");
export function acceptEvent(
  db: Db,
  input: MetaEvent,
  options: {
    key: Buffer;
    capi: boolean;
    origin: string;
    now?: number;
    attemptId?: string;
    userAgent?: string;
  },
) {
  const now = options.now ?? Date.now();
  if (Math.abs(now - input.occurredAt) > 5 * 60000) throw new Error("event_expired");
  const critical = capiMetaEvent(input.name);
  const payload =
    critical && options.capi
      ? encryptDiagnostic(
          {
            event_name: input.name,
            event_time: Math.floor(input.occurredAt / 1000),
            event_id: input.eventId,
            action_source: "website",
            event_source_url: options.origin + input.pagePath,
            user_data: {
              fbc: input.fbc,
              fbp: input.fbp,
              external_id: [visitorHash(input.visitorId, options.key)],
              client_user_agent: options.userAgent?.slice(0, 500),
            },
            custom_data: input.data,
          },
          options.key,
          input.eventId,
        )
      : null;
  return db.transaction((tx) => {
    const old = tx.select().from(metaEvents).where(eq(metaEvents.id, input.eventId)).get();
    if (old) {
      if (old.visitorHash !== visitorHash(input.visitorId, options.key) || old.name !== input.name)
        throw new Error("event_conflict");
      return { duplicate: true };
    }
    tx.delete(metaEvents)
      .where(lt(metaEvents.createdAt, now - 30 * DAY))
      .run();
    pruneOrderEvidence(tx, now);
    if (tx.select({ n: count() }).from(metaEvents).get()!.n >= 20000) {
      const disposable = tx
        .select({ id: metaEvents.id })
        .from(metaEvents)
        .where(
          inArray(metaEvents.status, ["observed", "unconfigured", "sent", "failed", "suppressed"]),
        )
        .orderBy(asc(metaEvents.createdAt))
        .limit(500)
        .all();
      if (!disposable.length) throw new Error("observation_capacity");
      tx.delete(metaEvents)
        .where(
          inArray(
            metaEvents.id,
            disposable.map((row) => row.id),
          ),
        )
        .run();
    }
    tx.insert(metaEvents)
      .values({
        id: input.eventId,
        visitorHash: visitorHash(input.visitorId, options.key),
        name: input.name,
        createdAt: input.occurredAt,
        pagePath: input.pagePath,
        sourceJson: JSON.stringify(input.source),
        dataJson: JSON.stringify(input.data),
        attemptId: options.attemptId,
        hasFbc: !!input.fbc,
        hasFbp: !!input.fbp,
        pixelAttempted: !!input.pixelAttempted,
        status: !critical ? "observed" : options.capi ? "pending" : "unconfigured",
        payload,
        dueAt: now,
      })
      .run();
    return { duplicate: false };
  });
}
export function claimJobs(db: Db, now = Date.now()) {
  return db.transaction((tx) => {
    pruneOrderEvidence(tx, now);
    tx.update(metaEvents)
      .set({
        status: "suppressed",
        payload: null,
        lastError: "shopify_owned_checkout",
        leaseUntil: 0,
        leaseToken: null,
      })
      .where(
        and(
          inArray(metaEvents.name, ["InitiateCheckout", "CheckoutReady"]),
          inArray(metaEvents.status, ["pending", "sending"]),
        ),
      )
      .run();
    tx.delete(metaEvents)
      .where(lt(metaEvents.createdAt, now - 30 * DAY))
      .run();
    tx.update(metaEvents)
      .set({ status: "failed", payload: null, lastError: "event_expired" })
      .where(
        and(
          inArray(metaEvents.status, ["pending", "sending"]),
          lt(metaEvents.createdAt, now - DAY),
        ),
      )
      .run();
    tx.update(metaEvents)
      .set({ status: "failed", payload: null, lastError: "retry_exhausted" })
      .where(
        and(
          inArray(metaEvents.status, ["pending", "sending"]),
          lte(metaEvents.leaseUntil, now),
          gte(metaEvents.attempts, 5),
        ),
      )
      .run();
    const jobs = tx
      .select()
      .from(metaEvents)
      .where(
        and(
          lte(metaEvents.dueAt, now),
          or(
            eq(metaEvents.status, "pending"),
            and(eq(metaEvents.status, "sending"), lte(metaEvents.leaseUntil, now)),
          ),
        ),
      )
      .orderBy(asc(metaEvents.dueAt))
      .limit(5)
      .all();
    return jobs.map((job) => {
      const leaseToken = randomUUID();
      tx.update(metaEvents)
        .set({ status: "sending", leaseUntil: now + 60000, leaseToken, attempts: job.attempts + 1 })
        .where(eq(metaEvents.id, job.id))
        .run();
      return { ...job, attempts: job.attempts + 1, leaseToken };
    });
  });
}
export function finishJob(
  db: Db,
  job: { id: string; attempts: number; leaseToken: string | null },
  result: { ok: boolean; retryable?: boolean; error?: string },
  now = Date.now(),
) {
  if (!job.leaseToken) return;
  const retry = !result.ok && result.retryable && job.attempts < 5;
  db.update(metaEvents)
    .set({
      status: result.ok ? "sent" : retry ? "pending" : "failed",
      lastError: result.ok ? null : result.error?.slice(0, 80),
      sentAt: result.ok ? now : null,
      payload: retry ? undefined : null,
      dueAt: now + Math.min(3600000, 30000 * 2 ** job.attempts),
      leaseUntil: 0,
      leaseToken: null,
    })
    .where(and(eq(metaEvents.id, job.id), eq(metaEvents.leaseToken, job.leaseToken)))
    .run();
}
export function forgetVisitor(db: Db, id: string, key: Buffer) {
  db.transaction((db) => {
    db.delete(metaOrderEvidence)
      .where(
        inArray(
          metaOrderEvidence.attemptId,
          db
            .select({ id: metaEvents.attemptId })
            .from(metaEvents)
            .where(eq(metaEvents.visitorHash, visitorHash(id, key))),
        ),
      )
      .run();
    db.delete(metaEvents)
      .where(eq(metaEvents.visitorHash, visitorHash(id, key)))
      .run();
  });
}
export function listMetaEvents(
  db: Db,
  filter: EvidenceFilter,
  now = Date.now(),
  visitors?: string[],
) {
  const where = and(
    evidenceWhere(filter, now),
    visitors === undefined
      ? undefined
      : sql`${metaEvents.visitorHash} IN (SELECT value FROM json_each(${JSON.stringify(visitors)}))`,
  );
  const rows = db
    .select({
      id: metaEvents.id,
      name: metaEvents.name,
      createdAt: metaEvents.createdAt,
      pagePath: metaEvents.pagePath,
      sourceJson: metaEvents.sourceJson,
      dataJson: metaEvents.dataJson,
      attemptId: metaEvents.attemptId,
      hasFbc: metaEvents.hasFbc,
      hasFbp: metaEvents.hasFbp,
      pixelAttempted: metaEvents.pixelAttempted,
      status: metaEvents.status,
      attempts: metaEvents.attempts,
      lastError: metaEvents.lastError,
      sentAt: metaEvents.sentAt,
    })
    .from(metaEvents)
    .where(where)
    .orderBy(desc(metaEvents.createdAt))
    .limit(30)
    .offset(((filter.page ?? 1) - 1) * 30)
    .all();
  return {
    total: db.select({ n: count() }).from(metaEvents).where(where).get()!.n,
    rows: rows.map(({ sourceJson, dataJson, ...row }) => ({
      ...row,
      source: JSON.parse(sourceJson),
      data: JSON.parse(dataJson),
    })),
  };
}
