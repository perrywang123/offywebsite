import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { internalMetaSource, normalizeMetaSource } from "@/lib/meta/events";
import { metaEvents, metaOrderEvidence } from "../db/schema";
import type { Db } from "../kol/db";
import { evidenceFilterSchema, evidenceRange } from "./filters";
import { lookupShopifyOrderSource, type ShopifyOrderSource } from "./shopify-order-source";

const pageSize = 25;
const retentionMs = 30 * 86400000;
export const orderReconciliationFilter = evidenceFilterSchema
  .pick({
    from: true,
    to: true,
    adId: true,
    campaignId: true,
    source: true,
    includeTests: true,
    page: true,
  })
  .extend({
    basis: z.enum(["checkout", "payment"]).optional(),
    orderNumber: z.string().trim().min(1).max(100).optional(),
  });
type OrderFilter = z.infer<typeof orderReconciliationFilter>;

/** The signed reference was verified when the Shopify order was imported. */
export function readMetaOrderReconciliation(db: Db, filter: OrderFilter, now = Date.now()) {
  const number = filter.orderNumber?.replace(/^#+/, "").toLowerCase();
  const exactLookup = number !== undefined;
  const range = evidenceRange(filter, now);
  const byPayment = !exactLookup && filter.basis === "payment";
  const observations = db
    .select({
      orderId: metaOrderEvidence.orderId,
      orderName: metaOrderEvidence.orderName,
      paidAt: metaOrderEvidence.paidAt,
      financialStatus: metaOrderEvidence.financialStatus,
      canceled: metaOrderEvidence.canceled,
      test: metaOrderEvidence.test,
      currency: metaOrderEvidence.currency,
      totalMinor: metaOrderEvidence.totalMinor,
      refundedMinor: metaOrderEvidence.refundedMinor,
      checkoutAt: metaEvents.createdAt,
      sourceJson: metaEvents.sourceJson,
      hasFbc: metaEvents.hasFbc,
    })
    .from(metaOrderEvidence)
    .innerJoin(metaEvents, eq(metaEvents.attemptId, metaOrderEvidence.attemptId))
    .where(
      and(
        inArray(metaEvents.name, ["CheckoutReady", "InitiateCheckout"]),
        gte(metaEvents.createdAt, now - retentionMs),
        lte(metaEvents.createdAt, now),
        gte(metaOrderEvidence.createdAt, now - retentionMs),
        lte(metaOrderEvidence.createdAt, now),
        filter.includeTests ? undefined : eq(metaOrderEvidence.test, false),
        exactLookup
          ? sql`lower(ltrim(${metaOrderEvidence.orderName}, '#')) = ${number}`
          : undefined,
        byPayment ? gte(metaOrderEvidence.paidAt, range.from) : undefined,
        byPayment ? lt(metaOrderEvidence.paidAt, range.to) : undefined,
      ),
    )
    .orderBy(
      asc(sql`case when ${metaEvents.name} = 'CheckoutReady' then 0 else 1 end`),
      desc(metaEvents.createdAt),
      asc(metaEvents.id),
    )
    .all();
  const seen = new Set<string>();
  const rows = observations.flatMap(({ sourceJson, ...order }) => {
    if (seen.has(order.orderId)) return [];
    seen.add(order.orderId);
    const source = normalizeMetaSource(JSON.parse(sourceJson));
    const test = order.test || internalMetaSource(source);
    if (test && !filter.includeTests) return [];
    if (
      !exactLookup &&
      ((!byPayment && (order.checkoutAt < range.from || order.checkoutAt >= range.to)) ||
        (filter.adId && source.ad_id !== filter.adId) ||
        (filter.campaignId && source.campaign_id !== filter.campaignId) ||
        (filter.source === "ad" && !source.ad_id) ||
        (filter.source === "unlabelled" && source.ad_id))
    )
      return [];
    return [{ ...order, test, source }];
  });
  const orderTime = (row: (typeof rows)[number]) =>
    byPayment ? (row.paidAt ?? 0) : row.checkoutAt;
  rows.sort((a, b) => orderTime(b) - orderTime(a) || a.orderId.localeCompare(b.orderId));
  const currencies = new Map<
    string,
    { currency: string; orders: number; totalMinor: number; refundedMinor: number }
  >();
  for (const order of rows) {
    if (
      order.canceled ||
      !["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.financialStatus)
    )
      continue;
    const totals = currencies.get(order.currency) ?? {
      currency: order.currency,
      orders: 0,
      totalMinor: 0,
      refundedMinor: 0,
    };
    totals.orders++;
    totals.totalMinor += order.totalMinor;
    totals.refundedMinor += order.refundedMinor;
    currencies.set(order.currency, totals);
  }
  const page = filter.page ?? 1;
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    page,
    pageSize,
    currencies: [...currencies.values()],
  };
}

type OrderEvidence = ReturnType<typeof readMetaOrderReconciliation> & {
  shopifyLookup?: ShopifyOrderSource;
};

export async function readMetaOrderEvidence(
  db: Db,
  filter: OrderFilter,
  now = Date.now(),
  lookup = lookupShopifyOrderSource,
): Promise<OrderEvidence> {
  const local = readMetaOrderReconciliation(db, filter, now);
  const { orderNumber, includeTests = false } = filter;
  const order = local.rows[0];
  if (!orderNumber || order?.source.ad_id) return local;
  if (
    !includeTests &&
    !order &&
    readMetaOrderReconciliation(db, { ...filter, includeTests: true }, now).total
  )
    return local;
  return { ...local, shopifyLookup: await lookup(orderNumber, order?.orderId, includeTests, now) };
}
