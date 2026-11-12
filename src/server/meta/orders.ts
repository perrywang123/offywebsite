import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../kol/db";
import { metaEvents, metaOrderEvidence, metaOrderSync } from "../db/schema";
import { adminRequest } from "../kol/shopify";
import { minor } from "../kol/money";
import { verifyCheckoutReference } from "./reference";
import { pruneOrderEvidence } from "./retention";
const DAY = 86400000;
const money = z.object({
  presentmentMoney: z.object({ amount: z.string(), currencyCode: z.string().regex(/^[A-Z]{3}$/) }),
});
const orderSchema = z.object({
  id: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/),
  name: z.string().max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  test: z.boolean(),
  cancelledAt: z.string().nullable(),
  displayFinancialStatus: z
    .string()
    .max(40)
    .nullable()
    .transform((value) => value ?? "UNKNOWN"),
  customAttributes: z.array(z.object({ key: z.string(), value: z.string().nullable() })).max(250),
  totalPriceSet: money,
  currentTotalPriceSet: money,
  totalRefundedSet: money,
});
export type OrderPage = {
  nodes: unknown[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
export type OrderReader = (since: string, cursor: string | null) => Promise<OrderPage>;
export const fetchMarketingOrders: OrderReader = async (since, cursor) => {
  const data = await adminRequest<{ orders: OrderPage }>(
    `query OffyMarketingOrders($query:String!,$after:String){orders(first:25,sortKey:UPDATED_AT,query:$query,after:$after){nodes{
      id name createdAt updatedAt test cancelledAt displayFinancialStatus customAttributes{key value}
      totalPriceSet{presentmentMoney{amount currencyCode}} currentTotalPriceSet{presentmentMoney{amount currencyCode}} totalRefundedSet{presentmentMoney{amount currencyCode}}
    }pageInfo{hasNextPage endCursor}}}`,
    { query: `updated_at:>=${since}`, after: cursor },
    (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
  );
  return data.orders;
};
function recordOrder(db: Db, raw: unknown, key: Buffer, now: number) {
  // Ignore unrelated orders before validating fields used only for reconciliation.
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray((raw as { customAttributes?: unknown }).customAttributes) ||
    !(raw as { customAttributes: { key?: string }[] }).customAttributes.some(
      (a) => a?.key === "offy_checkout_ref",
    )
  )
    return;
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) throw new Error("order_fields_unavailable");
  const o = parsed.data,
    refs = o.customAttributes.filter((a) => a.key === "offy_checkout_ref");
  if (refs.length !== 1 || !refs[0].value) return;
  const attemptId = verifyCheckoutReference(refs[0].value, key);
  if (!attemptId) return;
  const observation = db
    .select()
    .from(metaEvents)
    .where(
      and(
        eq(metaEvents.attemptId, attemptId),
        inArray(metaEvents.name, ["CheckoutReady", "InitiateCheckout"]),
        gte(metaEvents.createdAt, now - 30 * DAY),
        lte(metaEvents.createdAt, now),
      ),
    )
    .get();
  if (!observation) return;
  const createdAt = Date.parse(o.createdAt),
    updatedAt = Date.parse(o.updatedAt);
  if (
    createdAt < observation.createdAt - 300000 ||
    createdAt > now + 300000 ||
    createdAt < now - 30 * DAY
  )
    return;
  const currency = o.totalPriceSet.presentmentMoney.currencyCode;
  if (
    [o.currentTotalPriceSet, o.totalRefundedSet].some(
      (m) => m.presentmentMoney.currencyCode !== currency,
    )
  )
    throw new Error("order_currency_mismatch");
  const values = {
    orderId: o.id,
    orderName: o.name,
    attemptId,
    createdAt,
    updatedAt,
    checkedAt: now,
    financialStatus: o.displayFinancialStatus,
    canceled: !!o.cancelledAt,
    test: o.test,
    currency,
    totalMinor: minor(o.totalPriceSet.presentmentMoney.amount, currency),
    currentMinor: minor(o.currentTotalPriceSet.presentmentMoney.amount, currency),
    refundedMinor: minor(o.totalRefundedSet.presentmentMoney.amount, currency),
  };
  db.insert(metaOrderEvidence)
    .values(values)
    .onConflictDoUpdate({
      target: metaOrderEvidence.orderId,
      set: values,
      setWhere: lte(metaOrderEvidence.updatedAt, updatedAt),
    })
    .run();
}
export async function syncOrderEvidence(db: Db, read: OrderReader, key: Buffer, now = Date.now()) {
  const claimed = db.transaction((tx) => {
    tx.insert(metaOrderSync)
      .values({ id: 1, since: new Date(now - 30 * DAY).toISOString(), startedAt: now, nextAt: now })
      .onConflictDoNothing()
      .run();
    const state = tx.select().from(metaOrderSync).where(eq(metaOrderSync.id, 1)).get()!;
    if (state.nextAt > now || state.leaseUntil > now) return null;
    tx.update(metaOrderSync)
      .set({ leaseUntil: now + 60000 })
      .where(eq(metaOrderSync.id, 1))
      .run();
    return state;
  });
  if (!claimed) return { state: "waiting" as const };
  try {
    const page = await read(claimed.since, claimed.cursor);
    if (
      !Array.isArray(page.nodes) ||
      page.nodes.length > 25 ||
      (page.pageInfo.hasNextPage &&
        (!page.pageInfo.endCursor || page.pageInfo.endCursor === claimed.cursor))
    )
      throw new Error("order_cursor_invalid");
    db.transaction((tx) => {
      if (
        tx.select().from(metaOrderSync).where(eq(metaOrderSync.id, 1)).get()?.leaseUntil !==
        now + 60000
      )
        return;
      for (const order of page.nodes) recordOrder(tx, order, key, now);
      pruneOrderEvidence(tx, now);
      const more = page.pageInfo.hasNextPage;
      tx.update(metaOrderSync)
        .set({
          cursor: more ? page.pageInfo.endCursor : null,
          since: more
            ? claimed.since
            : new Date(Math.max(now - 30 * DAY, claimed.startedAt - 300000)).toISOString(),
          startedAt: more ? claimed.startedAt : now,
          nextAt: more ? now + 10000 : now + 15 * 60000,
          leaseUntil: 0,
          lastSuccess: now,
          lastError: null,
        })
        .where(eq(metaOrderSync.id, 1))
        .run();
    });
    return { state: "ready" as const, scanned: page.nodes.length };
  } catch {
    db.update(metaOrderSync)
      .set({ leaseUntil: 0, nextAt: now + 5 * 60000, lastError: "shopify_order_read_failed" })
      .where(and(eq(metaOrderSync.id, 1), eq(metaOrderSync.leaseUntil, now + 60000)))
      .run();
    return { state: "unavailable" as const, error: "shopify_order_read_failed" };
  }
}
