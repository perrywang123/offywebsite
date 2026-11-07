import { collabsMode } from "../collabs/mode";
import { createHmac } from "node:crypto";
import { and, eq, inArray, lte, lt } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/lib/env";
import type { Db } from "./db";
import {
  kolInbox,
  kolCodeJobs,
  kolRuntime,
  kolReferrals,
  kolAdminSessions,
  kolLoginLimits,
} from "../db/schema";
import { secureEqual } from "./core";
import { applyOrder } from "./ledger";
import { fetchOrder, fetchOrderPage, codeGateway, shopifyAdminConfigured } from "./shopify";
import { processCodeJob } from "./codes";
const topics = new Set([
  "orders/create",
  "orders/paid",
  "orders/updated",
  "orders/cancelled",
  "refunds/create",
  "shopify_payments/disputes/create",
  "shopify_payments/disputes/update",
]);
export function acceptWebhook(
  db: Db,
  raw: string,
  headers: Headers,
  secret: string,
  shop: string,
  now = Date.now(),
) {
  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  if (
    !secret ||
    !secureEqual(headers.get("x-shopify-hmac-sha256") ?? "", expected) ||
    headers.get("x-shopify-shop-domain")?.toLowerCase() !== shop.toLowerCase()
  )
    throw new Error("invalid_webhook");
  const topic = headers.get("x-shopify-topic") ?? "",
    id = headers.get("x-shopify-webhook-id") ?? "";
  if (!topics.has(topic) || !id || id.length > 200) throw new Error("invalid_webhook_topic");
  const body = z
    .object({
      id: z.union([z.number().int().safe(), z.string()]).optional(),
      order_id: z.union([z.number().int().safe(), z.string()]).optional(),
      admin_graphql_api_id: z.string().optional(),
    })
    .parse(JSON.parse(raw));
  const isOrder = topic.startsWith("orders/");
  const orderId =
    isOrder && body.admin_graphql_api_id?.startsWith("gid://shopify/Order/")
      ? body.admin_graphql_api_id
      : `gid://shopify/Order/${isOrder ? body.id : body.order_id}`;
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(orderId)) throw new Error("invalid_order_id");
  return (
    db
      .insert(kolInbox)
      .values({ id, orderId, topic, status: "queued", nextAt: now, createdAt: now })
      .onConflictDoNothing()
      .run().changes > 0
  );
}
export async function drainInbox(
  db: Db,
  reconcile: (id: string) => Promise<unknown>,
  now = Date.now(),
) {
  const ids = db
    .select()
    .from(kolInbox)
    .where(
      and(
        inArray(kolInbox.status, ["queued", "retry", "processing"]),
        lte(kolInbox.nextAt, now),
        lte(kolInbox.leaseUntil, now),
      ),
    )
    .limit(2)
    .all();
  for (const job of ids) {
    const claimed = db
      .update(kolInbox)
      .set({ status: "processing", leaseUntil: now + 60_000, attempts: job.attempts + 1 })
      .where(and(eq(kolInbox.id, job.id), lte(kolInbox.leaseUntil, now)))
      .run();
    if (!claimed.changes) continue;
    try {
      await reconcile(job.orderId);
      db.update(kolInbox)
        .set({ status: "done", leaseUntil: 0, error: null })
        .where(eq(kolInbox.id, job.id))
        .run();
    } catch (error) {
      db.update(kolInbox)
        .set({
          status: "retry",
          leaseUntil: 0,
          nextAt: now + Math.min(3600000, 5000 * 2 ** Math.min(job.attempts, 9)),
          error: error instanceof Error ? error.message.slice(0, 300) : "reconcile_failed",
        })
        .where(eq(kolInbox.id, job.id))
        .run();
    }
  }
}
export function runtime(db: Db, key: string) {
  const row = db.select().from(kolRuntime).where(eq(kolRuntime.key, key)).get();
  return row ? JSON.parse(row.value) : null;
}
export function setRuntime(db: Db, key: string, value: unknown, now = Date.now()) {
  db.insert(kolRuntime)
    .values({ key, value: JSON.stringify(value), updatedAt: now })
    .onConflictDoUpdate({
      target: kolRuntime.key,
      set: { value: JSON.stringify(value), updatedAt: now },
    })
    .run();
}
export async function reconcileOrder(db: Db, id: string, now = Date.now()) {
  return applyOrder(db, await fetchOrder(id), env.KOL_SIGNING_SECRET ?? "", now);
}
export async function runWorker(db: Db, now = Date.now()) {
  const claimed = db.transaction((tx) => {
    const lease = runtime(tx, "workerLease") ?? 0;
    if (lease > now) return false;
    setRuntime(tx, "workerLease", now + 120000, now);
    return true;
  });
  if (!claimed) return { busy: true };
  const shopify = shopifyAdminConfigured() ? "configured" : "not_configured";
  try {
    // Keep pending remote work and scan progress intact until credentials exist.
    if (shopify === "configured" && !collabsMode()) {
      await drainInbox(db, (id) => reconcileOrder(db, id), now);
      const jobs = db
        .select()
        .from(kolCodeJobs)
        .where(
          and(
            inArray(kolCodeJobs.status, ["queued", "sending", "uncertain", "pending"]),
            lte(kolCodeJobs.nextAt, now),
            lte(kolCodeJobs.leaseUntil, now),
          ),
        )
        .limit(1)
        .all();
      for (const job of jobs) await processCodeJob(db, job.id, codeGateway, now);
      let scan = runtime(db, "scan") as {
        since: string;
        after: string | null;
        startedAt: number;
        nextAt: number;
      } | null;
      if (!scan || scan.nextAt <= now) {
        scan ??= {
          since: new Date(now - 59 * 86400000).toISOString(),
          after: null,
          startedAt: now,
          nextAt: now,
        };
        const result = await fetchOrderPage(scan.since, scan.after);
        // Persist each page's IDs before advancing its cursor. Inbox retries survive worker restarts.
        db.transaction((tx) => {
          for (const o of result.orders.nodes)
            tx.insert(kolInbox)
              .values({
                id: `scan:${scan!.startedAt}:${o.id}`,
                orderId: o.id,
                topic: "reconciliation",
                status: "queued",
                nextAt: now,
                createdAt: now,
              })
              .onConflictDoNothing()
              .run();
          if (result.orders.pageInfo.hasNextPage) {
            if (!result.orders.pageInfo.endCursor) throw new Error("scan_cursor_missing");
            setRuntime(tx, "scan", { ...scan, after: result.orders.pageInfo.endCursor }, now);
          } else {
            setRuntime(
              tx,
              "scan",
              {
                since: new Date(scan!.startedAt - 5 * 60000).toISOString(),
                after: null,
                startedAt: now,
                nextAt: now + 15 * 60000,
              },
              now,
            );
            setRuntime(tx, "lastFullScan", now, now);
          }
        });
      }
    }
    db.delete(kolReferrals)
      .where(lt(kolReferrals.createdAt, now - 90 * 86400000))
      .run();
    db.delete(kolAdminSessions).where(lt(kolAdminSessions.expiresAt, now)).run();
    db.delete(kolLoginLimits).where(lt(kolLoginLimits.resetsAt, now)).run();
    db.delete(kolInbox)
      .where(and(eq(kolInbox.status, "done"), lt(kolInbox.createdAt, now - 90 * 86400000)))
      .run();
    setRuntime(db, "worker", { at: now, error: null, shopify }, now);
    return { ok: true, shopify };
  } catch (error) {
    setRuntime(
      db,
      "worker",
      { at: now, error: error instanceof Error ? error.message : "sync_failed", shopify },
      now,
    );
    throw error;
  } finally {
    setRuntime(db, "workerLease", 0, Date.now());
  }
}
