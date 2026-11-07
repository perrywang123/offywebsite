import { createHash } from "node:crypto";
import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { collabsAttributions, collabsCreators, collabsFlowCreators } from "../db/schema";
import type { Db } from "../kol/db";
import { audit } from "../kol/core";
import type { OrderEvidence } from "./service";
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable();
const cents = z.number().min(0).max(Number.MAX_SAFE_INTEGER).nullable();
const text = z.string().max(200).nullable();
// Verified in the merchant's actual Collabs Order Attributed variable picker on 2026-11-08.
export const attributionSchema = z
  .object({
    version: z.literal(1),
    shop: z.string().max(100),
    sentAt: z.string().regex(/^\d{1,12}$/),
    communityMemberId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    firstName: text,
    lastName: text,
    primaryUsername: text,
    salesNumber: count,
    linkVisitsCumulative: count,
    salesCumulativeCents: cents,
    commissionCumulativeCents: cents,
    orderId: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/),
    orderName: z.string().min(1).max(100),
    orderCreatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
type Event = z.infer<typeof attributionSchema>;
type Snapshot = Pick<
  Event,
  | "firstName"
  | "lastName"
  | "primaryUsername"
  | "salesNumber"
  | "linkVisitsCumulative"
  | "salesCumulativeCents"
  | "commissionCumulativeCents"
>;
export function validateAttribution(raw: unknown, shop: string, now = Date.now()) {
  const input = attributionSchema.parse(raw);
  if (input.shop !== shop.toLowerCase()) throw new Error("flow_shop_mismatch");
  const flowSentAt = Number(input.sentAt) * 1000;
  if (!Number.isSafeInteger(flowSentAt) || flowSentAt > now + 600000)
    throw new Error("flow_timestamp_invalid");
  return { input, flowSentAt };
}
export function acceptAttribution(db: Db, raw: unknown, shop: string, now = Date.now()) {
  const { input, flowSentAt } = validateAttribution(raw, shop, now);
  const nativeId = String(input.communityMemberId),
    id = createHash("sha256")
      .update(JSON.stringify([shop.toLowerCase(), nativeId, input.orderId]))
      .digest("hex");
  const snapshot: Snapshot = {
    firstName: input.firstName,
    lastName: input.lastName,
    primaryUsername: input.primaryUsername,
    salesNumber: input.salesNumber,
    linkVisitsCumulative: input.linkVisitsCumulative,
    salesCumulativeCents: input.salesCumulativeCents,
    commissionCumulativeCents: input.commissionCumulativeCents,
  };
  return db.transaction((tx) => {
    if (
      tx
        .select({ id: collabsAttributions.id })
        .from(collabsAttributions)
        .where(eq(collabsAttributions.id, id))
        .get()
    )
      return false;
    const old = tx
      .select()
      .from(collabsFlowCreators)
      .where(eq(collabsFlowCreators.nativeId, nativeId))
      .get();
    if (!old)
      tx.insert(collabsFlowCreators)
        .values({
          nativeId,
          snapshotJson: JSON.stringify(snapshot),
          flowSentAt,
          firstReceivedAt: now,
          lastReceivedAt: now,
        })
        .run();
    else
      tx.update(collabsFlowCreators)
        .set({
          lastReceivedAt: now,
          ...(flowSentAt >= old.flowSentAt
            ? { snapshotJson: JSON.stringify(snapshot), flowSentAt }
            : {}),
        })
        .where(eq(collabsFlowCreators.nativeId, nativeId))
        .run();
    tx.insert(collabsAttributions)
      .values({
        id,
        nativeId,
        orderId: input.orderId,
        orderName: input.orderName,
        orderCreatedAt: input.orderCreatedAt,
        flowSentAt,
        receivedAt: now,
        nextAt: now,
      })
      .run();
    return true;
  });
}
export function bindFlowCreator(db: Db, nativeId: string, creatorId: string, actor: string) {
  db.transaction((tx) => {
    const source = tx
      .select()
      .from(collabsFlowCreators)
      .where(eq(collabsFlowCreators.nativeId, nativeId))
      .get();
    if (!source) throw new Error("flow_identity_missing");
    if (
      !tx
        .select({ id: collabsCreators.id })
        .from(collabsCreators)
        .where(eq(collabsCreators.id, creatorId))
        .get()
    )
      throw new Error("creator_missing");
    if (source.creatorId && source.creatorId !== creatorId)
      throw new Error("flow_identity_immutable");
    if (source.creatorId === creatorId) return;
    tx.update(collabsFlowCreators)
      .set({ creatorId })
      .where(eq(collabsFlowCreators.nativeId, nativeId))
      .run();
    audit(tx, actor, "collabs.flow.bind", creatorId, { nativeId });
  });
}
export function attributionState(db: Db) {
  return {
    creators: db
      .select()
      .from(collabsFlowCreators)
      .orderBy(desc(collabsFlowCreators.lastReceivedAt))
      .all()
      .map((c) => {
        const { snapshotJson, ...rest } = c,
          snapshot = JSON.parse(snapshotJson) as Snapshot;
        return {
          ...rest,
          snapshot,
          salesNumber: snapshot.salesNumber,
          linkVisits: snapshot.linkVisitsCumulative,
        };
      }),
    events: db
      .select()
      .from(collabsAttributions)
      .orderBy(desc(collabsAttributions.receivedAt))
      .limit(100)
      .all()
      .map((e) => {
        const { orderJson, ...rest } = e;
        return { ...rest, order: orderJson ? (JSON.parse(orderJson) as OrderEvidence) : null };
      }),
  };
}
export async function refreshAttributions(
  db: Db,
  lookup: (id: string) => Promise<OrderEvidence | null>,
  now = Date.now(),
) {
  const due = db
    .select()
    .from(collabsAttributions)
    .where(and(lte(collabsAttributions.nextAt, now), lte(collabsAttributions.leaseUntil, now)))
    .limit(2)
    .all();
  for (const row of due) {
    if (
      !db
        .update(collabsAttributions)
        .set({ leaseUntil: now + 60000 })
        .where(and(eq(collabsAttributions.id, row.id), lte(collabsAttributions.leaseUntil, now)))
        .run().changes
    )
      continue;
    let error: string | null = null;
    try {
      const order = await lookup(row.orderId);
      if (!order) error = "order_not_found_in_accessible_range";
      else if (order.id !== row.orderId || order.name !== row.orderName)
        error = "order_identity_mismatch";
      else
        db.update(collabsAttributions)
          .set({ orderJson: JSON.stringify(order), checkedAt: now })
          .where(eq(collabsAttributions.id, row.id))
          .run();
    } catch {
      error = "order_lookup_unavailable";
    }
    db.update(collabsAttributions)
      .set({
        error,
        leaseUntil: 0,
        attempts: error ? row.attempts + 1 : 0,
        nextAt:
          now +
          (error
            ? Math.min(3600000, 30000 * 2 ** Math.min(row.attempts, 7))
            : now - row.receivedAt > 90 * 86400000
              ? 86400000
              : 900000),
      })
      .where(eq(collabsAttributions.id, row.id))
      .run();
  }
}
