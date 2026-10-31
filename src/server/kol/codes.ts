import { randomUUID } from "node:crypto";
import { and, eq, lte } from "drizzle-orm";
import type { Db } from "./db";
import { kolCodes, kolCodeJobs, kolPartners } from "../db/schema";
import { audit, currentTerms } from "./core";
export interface RemoteCode {
  id: string;
  code: string;
  status: string;
  summary: string;
  title: string;
}
export interface Campaign {
  id: string;
  type: string;
  status: string;
  summary: string;
  title: string;
}
export interface CodeGateway {
  shop: string;
  scopes: () => Promise<string[]>;
  lookup: (code: string) => Promise<RemoteCode | null>;
  campaign: (id: string) => Promise<Campaign | null>;
  add: (id: string, code: string) => Promise<string>;
  poll: (id: string) => Promise<{
    done: boolean;
    failedCount: number;
    codes: Array<{ code: string; errors: Array<{ message: string }> }>;
  }>;
}
export function normalizeCode(value: string) {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code)) throw new Error("invalid_code");
  return code;
}
function canIssue(db: Db, id: string, now: number) {
  const p = db.select().from(kolPartners).where(eq(kolPartners.id, id)).get(),
    t = currentTerms(db, id);
  if (!p || !t || p.status === "paused" || t.endsAt <= now)
    throw new Error("cooperation_not_eligible");
}
function persistBinding(
  db: Db,
  kolId: string,
  code: string,
  remote: RemoteCode,
  source: string,
  g: CodeGateway,
  actor: string,
  now: number,
) {
  return db.transaction((tx) => {
    const old = tx.select().from(kolCodes).where(eq(kolCodes.normalized, code)).get();
    if (old && (old.kolId !== kolId || old.shop !== g.shop)) throw new Error("code_reserved");
    if (normalizeCode(remote.code) !== code) throw new Error("remote_code_mismatch");
    tx.update(kolCodes)
      .set({ status: "ended" })
      .where(and(eq(kolCodes.kolId, kolId), eq(kolCodes.status, "bound")))
      .run();
    const value = {
      id: old?.id ?? randomUUID(),
      shop: g.shop,
      normalized: code,
      kolId,
      campaignId: remote.id,
      source: old?.source ?? source,
      status: "bound",
      summary: remote.summary,
      remoteStatus: remote.status,
      syncedAt: now,
    };
    tx.insert(kolCodes)
      .values(value)
      .onConflictDoUpdate({ target: kolCodes.normalized, set: value })
      .run();
    audit(tx, actor, "code.bind", value.id, { code, campaign: remote.id, source }, now);
    return value;
  });
}
export async function bindExistingCode(
  db: Db,
  kolId: string,
  input: string,
  g: CodeGateway,
  actor: string,
  now = Date.now(),
) {
  canIssue(db, kolId, now);
  const code = normalizeCode(input);
  const reserved = db.select().from(kolCodeJobs).where(eq(kolCodeJobs.candidate, code)).get();
  if (reserved && reserved.kolId !== kolId) throw new Error("code_reserved");
  const remote = await g.lookup(code);
  if (!remote) throw new Error("code_not_found");
  return persistBinding(db, kolId, code, remote, "existing", g, actor, now);
}
export async function queueCode(
  db: Db,
  kolId: string,
  campaignId: string,
  input: string,
  g: CodeGateway,
  actor: string,
  now = Date.now(),
) {
  canIssue(db, kolId, now);
  if (!(await g.scopes()).includes("write_discounts")) throw new Error("write_discounts_required");
  const campaign = await g.campaign(campaignId);
  if (
    !campaign ||
    !["DiscountCodeBasic", "DiscountCodeBxgy", "DiscountCodeFreeShipping"].includes(
      campaign.type,
    ) ||
    campaign.status !== "ACTIVE"
  )
    throw new Error("campaign_not_eligible");
  const code = normalizeCode(input);
  if (
    db.select().from(kolCodes).where(eq(kolCodes.normalized, code)).get() ||
    (await g.lookup(code))
  )
    throw new Error("code_reserved");
  const job = {
    id: randomUUID(),
    kolId,
    candidate: code,
    campaignId,
    status: "queued",
    nextAt: now,
    createdAt: now,
  };
  db.transaction((tx) => {
    tx.insert(kolCodeJobs).values(job).run();
    audit(tx, actor, "code.queued", job.id, { code, campaignId }, now);
  });
  return job;
}
export async function processCodeJob(db: Db, id: string, g: CodeGateway, now = Date.now()) {
  const job = db.transaction((tx) => {
    const j = tx.select().from(kolCodeJobs).where(eq(kolCodeJobs.id, id)).get();
    if (!j || ["bound", "failed"].includes(j.status) || j.nextAt > now || j.leaseUntil > now)
      return null;
    tx.update(kolCodeJobs)
      .set({
        leaseUntil: now + 60_000,
        attempts: j.attempts + 1,
        status: j.status === "queued" ? "sending" : j.status,
      })
      .where(and(eq(kolCodeJobs.id, id), lte(kolCodeJobs.leaseUntil, now)))
      .run();
    return j;
  });
  if (!job) return;
  try {
    canIssue(db, job.kolId, now);
    if (job.status === "queued") {
      const prior = await g.lookup(job.candidate);
      if (prior) throw new Error("candidate_already_exists");
      const remoteId = await g.add(job.campaignId, job.candidate);
      db.update(kolCodeJobs)
        .set({ remoteId, status: "pending", error: null, nextAt: now + 5000, leaseUntil: 0 })
        .where(eq(kolCodeJobs.id, id))
        .run();
      return;
    }
    if (job.remoteId) {
      const poll = await g.poll(job.remoteId);
      if (!poll.done) {
        db.update(kolCodeJobs)
          .set({ status: "pending", nextAt: now + 10000, leaseUntil: 0 })
          .where(eq(kolCodeJobs.id, id))
          .run();
        return;
      }
      const result = poll.codes.find((c) => normalizeCode(c.code) === job.candidate);
      if (poll.failedCount || !result || result.errors.length) {
        db.update(kolCodeJobs)
          .set({
            status: "failed",
            error: result?.errors.map((e) => e.message).join("; ") || "remote_code_failed",
            leaseUntil: 0,
          })
          .where(eq(kolCodeJobs.id, id))
          .run();
        return;
      }
    }
    const remote = await g.lookup(job.candidate);
    if (!remote) throw new Error("remote_confirmation_pending");
    if (remote.id !== job.campaignId) throw new Error("remote_campaign_mismatch");
    db.transaction((tx) => {
      persistBinding(tx, job.kolId, job.candidate, remote, "generated", g, "worker", now);
      tx.update(kolCodeJobs)
        .set({ status: "bound", error: null, leaseUntil: 0 })
        .where(eq(kolCodeJobs.id, id))
        .run();
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed";
    db.update(kolCodeJobs)
      .set({
        status: [
          "shopify_code_rejected",
          "candidate_already_exists",
          "remote_campaign_mismatch",
        ].includes(message)
          ? "failed"
          : job.remoteId
            ? "pending"
            : "uncertain",
        error: message,
        nextAt: now + Math.min(3600000, 5000 * 2 ** Math.min(job.attempts, 9)),
        leaseUntil: 0,
      })
      .where(eq(kolCodeJobs.id, id))
      .run();
  }
}
export function retryCode(db: Db, id: string, actor: string) {
  const job = db.select().from(kolCodeJobs).where(eq(kolCodeJobs.id, id)).get();
  if (!job || job.status === "bound") throw new Error("job_not_retryable");
  // Ambiguous writes only reconcile; definite async failures can safely re-submit the same unique code.
  db.update(kolCodeJobs)
    .set({
      status: job.status === "failed" ? "queued" : job.remoteId ? "pending" : "uncertain",
      remoteId: job.status === "failed" ? null : job.remoteId,
      nextAt: Date.now(),
      leaseUntil: 0,
    })
    .where(eq(kolCodeJobs.id, id))
    .run();
  audit(db, actor, "code.retry", id, { candidate: job.candidate });
}
export function endBinding(db: Db, id: string, actor: string) {
  db.update(kolCodes).set({ status: "ended" }).where(eq(kolCodes.id, id)).run();
  audit(db, actor, "code.end_local", id, { remoteUnchanged: true });
}
export async function refreshCode(db: Db, id: string, g: CodeGateway, actor: string) {
  const c = db.select().from(kolCodes).where(eq(kolCodes.id, id)).get();
  if (!c) throw new Error("code_not_found");
  const remote = await g.lookup(c.normalized);
  if (!remote) throw new Error("code_not_found");
  db.update(kolCodes)
    .set({ summary: remote.summary, remoteStatus: remote.status, syncedAt: Date.now() })
    .where(eq(kolCodes.id, id))
    .run();
  audit(db, actor, "code.refresh", id, { status: remote.status });
}
