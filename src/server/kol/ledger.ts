import { randomUUID } from "node:crypto";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./db";
import {
  kolIntents,
  kolLedger,
  kolShopOrders,
  kolSettlements,
  kolSettlementItems,
} from "../db/schema";
import { audit, verifyAttribution } from "./core";
import { commission, minor, csvCell, decimal } from "./money";
const money = z.object({
  presentmentMoney: z.object({ amount: z.string(), currencyCode: z.string() }),
});
const transaction = z.object({
  id: z.string(),
  kind: z.string(),
  status: z.string(),
  amountSet: money,
  processedAt: z.string().nullable(),
});
const connection = <T extends z.ZodType>(node: T) =>
  z.object({ nodes: z.array(node), pageInfo: z.object({ hasNextPage: z.literal(false) }) });
const line = z.object({
  id: z.string(),
  isGiftCard: z.boolean(),
  quantity: z.number().int().nonnegative(),
  originalTotalSet: money,
  discountAllocations: z.array(z.object({ allocatedAmountSet: money })),
  taxLines: z.array(z.object({ priceSet: money })),
});
const refund = z.object({
  id: z.string(),
  totalRefundedSet: money,
  transactions: connection(transaction),
  refundLineItems: connection(
    z.object({
      lineItem: z.object({ id: z.string(), isGiftCard: z.boolean() }),
      quantity: z.number().int().nonnegative(),
      subtotalSet: money,
      totalTaxSet: money,
    }),
  ),
  refundShippingLines: connection(z.object({ subtotalAmountSet: money, taxAmountSet: money })),
  orderAdjustments: connection(z.object({ id: z.string() })),
});
export const orderSchema = z.object({
  id: z.string(),
  name: z.string(),
  cartToken: z.string().nullable(),
  customAttributes: z.array(z.object({ key: z.string(), value: z.string().nullable() })),
  presentmentCurrencyCode: z.string(),
  taxesIncluded: z.boolean(),
  edited: z.boolean(),
  cancelledAt: z.string().nullable(),
  displayFinancialStatus: z.string().nullable(),
  disputes: z.array(z.object({ status: z.string() })),
  totalPriceSet: money,
  totalOutstandingSet: money,
  transactions: z.array(transaction).max(99),
  lineItems: connection(line),
  refunds: z.array(refund),
});
export function calculateOrder(raw: unknown) {
  const o = orderSchema.parse(raw),
    currency = o.presentmentCurrencyCode;
  const amount = (bag: z.infer<typeof money>) => {
    if (bag.presentmentMoney.currencyCode !== currency) throw new Error("currency_mismatch");
    return minor(bag.presentmentMoney.amount, currency);
  };
  if (o.edited || o.cancelledAt || o.disputes.length) throw new Error("order_requires_review");
  if (
    !["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(o.displayFinancialStatus ?? "") ||
    amount(o.totalOutstandingSet) !== 0
  )
    throw new Error("payment_unverified");
  const payments = o.transactions.filter(
    (t) => ["SALE", "CAPTURE"].includes(t.kind) && t.status === "SUCCESS",
  );
  if (
    !payments.length ||
    o.transactions.some(
      (t) =>
        ["SALE", "CAPTURE"].includes(t.kind) &&
        ["PENDING", "AWAITING_RESPONSE", "UNKNOWN"].includes(t.status),
    ) ||
    payments.reduce((n, t) => n + amount(t.amountSet), 0) !== amount(o.totalPriceSet)
  )
    throw new Error("payment_unverified");
  const times = payments.map((t) => Date.parse(t.processedAt ?? ""));
  if (times.some((t) => !Number.isFinite(t))) throw new Error("payment_time_missing");
  // Multiple capture/payment chains require manual verification rather than assuming session continuity.
  if (payments.length !== 1) throw new Error("split_payment_review");
  const original = new Map<string, number>();
  let gross = 0,
    refundNet = 0;
  for (const l of o.lineItems.nodes) {
    const value =
      amount(l.originalTotalSet) -
      l.discountAllocations.reduce((n, d) => n + amount(d.allocatedAmountSet), 0) -
      (o.taxesIncluded ? l.taxLines.reduce((n, t) => n + amount(t.priceSet), 0) : 0);
    if (value < 0) throw new Error("invalid_line_net");
    original.set(l.id, value);
    if (!l.isGiftCard) gross += value;
  }
  const deducted = new Map<string, number>();
  for (const r of o.refunds) {
    if (r.orderAdjustments.nodes.length) throw new Error("refund_adjustment_review");
    const ts = r.transactions.nodes;
    if (
      !ts.length ||
      ts.some((t) => t.kind !== "REFUND" || t.status !== "SUCCESS") ||
      ts.reduce((n, t) => n + amount(t.amountSet), 0) !== amount(r.totalRefundedSet)
    )
      throw new Error("refund_unverified");
    let allocated = 0;
    for (const l of r.refundLineItems.nodes) {
      const subtotal = amount(l.subtotalSet),
        tax = amount(l.totalTaxSet),
        value = subtotal - (o.taxesIncluded ? tax : 0);
      allocated += subtotal + (o.taxesIncluded ? 0 : tax);
      if (value < 0 || !original.has(l.lineItem.id)) throw new Error("refund_allocation_review");
      const total = (deducted.get(l.lineItem.id) ?? 0) + value;
      deducted.set(l.lineItem.id, total);
      if (total > original.get(l.lineItem.id)!) throw new Error("refund_exceeds_line");
      if (!l.lineItem.isGiftCard) refundNet += value;
    }
    for (const s of r.refundShippingLines.nodes)
      allocated += amount(s.subtotalAmountSet) + amount(s.taxAmountSet);
    if (allocated !== amount(r.totalRefundedSet)) throw new Error("refund_allocation_review");
  }
  if (refundNet > gross) throw new Error("refund_exceeds_merchandise");
  if (![gross, refundNet, gross - refundNet].every(Number.isSafeInteger))
    throw new Error("money_overflow");
  return {
    order: o,
    currency,
    net: gross - refundNet,
    gross,
    refundNet,
    paidAt: Math.max(...times),
  };
}
export function applyOrder(db: Db, raw: unknown, secret: string, now = Date.now()) {
  // Keep only accounting evidence; never persist addresses, email or complete webhook bodies.
  const basic = z
    .object({
      id: z.string(),
      name: z.string(),
      presentmentCurrencyCode: z.string(),
      customAttributes: z.array(z.object({ key: z.string(), value: z.string().nullable() })),
    })
    .parse(raw);
  const reference = basic.customAttributes.find((a) => a.key === "offy_ref")?.value;
  let result: ReturnType<typeof calculateOrder> | undefined,
    intent: ReturnType<typeof verifyAttribution> | undefined,
    reason: string | null = null;
  try {
    result = calculateOrder(raw);
    if (reference)
      intent = verifyAttribution(
        db,
        reference,
        result.order.cartToken,
        basic.id,
        result.paidAt,
        secret,
      );
  } catch (error) {
    reason = error instanceof Error ? error.message : "invalid_order";
  }
  return db.transaction((tx) => {
    const old = tx.select().from(kolShopOrders).where(eq(kolShopOrders.id, basic.id)).get();
    if (intent && reference && result) {
      try {
        intent = verifyAttribution(
          tx,
          reference,
          result.order.cartToken,
          basic.id,
          result.paidAt,
          secret,
        );
      } catch (error) {
        reason = error instanceof Error ? error.message : "intent_replay";
        intent = undefined;
      }
    }
    if (old && old.currency !== basic.presentmentCurrencyCode) reason = "order_currency_changed";
    const existing = tx.select().from(kolLedger).where(eq(kolLedger.orderId, basic.id)).all(),
      previous = existing.reduce((n, l) => n + l.amount, 0);
    const hinted = reference
      ? tx
          .select()
          .from(kolIntents)
          .where(eq(kolIntents.id, reference.split(".")[0]))
          .get()
      : undefined;
    const kolId = intent?.kolId ?? old?.kolId ?? hinted?.kolId ?? null;
    const target = intent && result && !reason ? commission(result.net, intent.rateBps) : null;
    const status = reason ? "review" : intent ? "verified" : "unattributed";
    const snapshot = {
      name: basic.name,
      kolId,
      intentId: intent?.id ?? old?.intentId ?? null,
      currency: basic.presentmentCurrencyCode,
      net: result?.net ?? null,
      commission: target,
      rateBps: intent?.rateBps ?? old?.rateBps ?? null,
      status,
      reason,
      paidAt: result?.paidAt ?? old?.paidAt ?? null,
      holdUntil: intent && result ? result.paidAt + 30 * 86400000 : (old?.holdUntil ?? null),
      evidence: JSON.stringify({
        gross: result?.gross,
        refundNet: result?.refundNet,
        cartMatched: Boolean(intent),
        rule: "merchandise-net-v1",
        error: reason,
      }),
      checkedAt: now,
    };
    if (old?.reason?.startsWith("manual_hold:")) {
      snapshot.status = "review";
      snapshot.reason = old.reason;
      snapshot.commission = null;
    }
    // A late stale snapshot may never erase a recorded successful refund. Re-fetch/review instead.
    if (target !== null && existing.length > 0 && target > previous) {
      snapshot.status = "review";
      snapshot.reason = "commission_increase_review";
      snapshot.commission = null;
    }
    tx.insert(kolShopOrders)
      .values({ id: basic.id, ...snapshot })
      .onConflictDoUpdate({ target: kolShopOrders.id, set: snapshot })
      .run();
    if (intent)
      tx.update(kolIntents).set({ orderId: basic.id }).where(eq(kolIntents.id, intent.id)).run();
    if (
      snapshot.status === "verified" &&
      snapshot.commission !== null &&
      kolId &&
      snapshot.commission !== previous
    ) {
      tx.insert(kolLedger)
        .values({
          id: randomUUID(),
          orderId: basic.id,
          kolId,
          currency: snapshot.currency,
          amount: snapshot.commission - previous,
          availableAt: snapshot.holdUntil!,
          createdAt: now,
        })
        .run();
    }
    if (
      old &&
      (old.commission !== snapshot.commission ||
        old.status !== snapshot.status ||
        old.net !== snapshot.net)
    ) {
      const included = tx
        .select({ id: kolSettlementItems.settlementId })
        .from(kolSettlementItems)
        .innerJoin(kolLedger, eq(kolLedger.id, kolSettlementItems.ledgerId))
        .where(eq(kolLedger.orderId, basic.id))
        .all();
      for (const id of new Set(included.map((s) => s.id)))
        tx.update(kolSettlements)
          .set({ status: "needs_review", revision: sql`${kolSettlements.revision}+1` })
          .where(
            and(eq(kolSettlements.id, id), inArray(kolSettlements.status, ["draft", "locked"])),
          )
          .run();
    }
    if (!old || old.status !== snapshot.status || old.commission !== snapshot.commission)
      audit(
        tx,
        "shopify",
        "order.reconcile",
        basic.id,
        {
          before: old?.commission,
          after: snapshot.commission,
          status: snapshot.status,
          reason: snapshot.reason,
        },
        now,
      );
    return { id: basic.id, ...snapshot };
  });
}
export function createSettlement(
  db: Db,
  kolId: string,
  currency: string,
  month: string,
  actor: string,
  now = Date.now(),
) {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) throw new Error("invalid_month");
  const [year, monthNumber] = month.split("-").map(Number);
  const monthEnd = Date.UTC(year, monthNumber, 1) - 8 * 3600000;
  return db.transaction((tx) => {
    const selected = tx
      .select({ ledger: kolLedger, order: kolShopOrders })
      .from(kolLedger)
      .innerJoin(kolShopOrders, eq(kolShopOrders.id, kolLedger.orderId))
      .leftJoin(kolSettlementItems, eq(kolSettlementItems.ledgerId, kolLedger.id))
      .where(
        and(
          eq(kolLedger.kolId, kolId),
          eq(kolLedger.currency, currency),
          lte(kolLedger.availableAt, now),
          eq(kolShopOrders.status, "verified"),
          sql`${kolSettlementItems.ledgerId} IS NULL`,
        ),
      )
      .all()
      .filter((row) => row.ledger.amount < 0 || (row.order.paidAt ?? Infinity) < monthEnd);
    if (!selected.length) throw new Error("no_available_entries");
    const batch = {
      id: randomUUID(),
      kolId,
      currency,
      month,
      status: "draft",
      total: selected.reduce((n, r) => n + r.ledger.amount, 0),
      revision: 1,
      createdAt: now,
    };
    tx.insert(kolSettlements).values(batch).run();
    tx.insert(kolSettlementItems)
      .values(
        selected.map((r) => ({
          ledgerId: r.ledger.id,
          settlementId: batch.id,
          snapshot: JSON.stringify({
            name: r.order.name,
            net: r.order.net,
            rateBps: r.order.rateBps,
            amount: r.ledger.amount,
            currency: r.ledger.currency,
          }),
        })),
      )
      .run();
    audit(tx, actor, "settlement.create", batch.id, batch, now);
    return batch;
  });
}
export function settlementOrders(db: Db, id: string) {
  return [
    ...new Set(
      db
        .select({ orderId: kolLedger.orderId })
        .from(kolLedger)
        .innerJoin(kolSettlementItems, eq(kolSettlementItems.ledgerId, kolLedger.id))
        .where(eq(kolSettlementItems.settlementId, id))
        .all()
        .map((r) => r.orderId),
    ),
  ];
}
function checkedBatch(db: Db, id: string) {
  const b = db.select().from(kolSettlements).where(eq(kolSettlements.id, id)).get();
  if (!b) throw new Error("settlement_not_found");
  return b;
}
function assertReconciled(db: Db, id: string, now: number) {
  const orders = settlementOrders(db, id).map((oid) =>
    db.select().from(kolShopOrders).where(eq(kolShopOrders.id, oid)).get(),
  );
  if (orders.some((o) => !o || o.status !== "verified" || o.checkedAt < now - 60_000))
    throw new Error("reconciliation_required");
}
export async function lockSettlement(
  db: Db,
  id: string,
  actor: string,
  reconcile: () => Promise<unknown>,
  now = Date.now(),
) {
  const before = checkedBatch(db, id);
  if (before.status !== "draft") throw new Error("invalid_settlement_state");
  await reconcile();
  db.transaction((tx) => {
    const b = checkedBatch(tx, id);
    if (b.status !== "draft" || b.revision !== before.revision)
      throw new Error("settlement_changed");
    assertReconciled(tx, id, now);
    tx.update(kolSettlements)
      .set({ status: "locked", revision: b.revision + 1 })
      .where(eq(kolSettlements.id, id))
      .run();
    audit(tx, actor, "settlement.lock", id, {}, now);
  });
}
export async function paySettlement(
  db: Db,
  id: string,
  ref: string,
  note: string,
  actor: string,
  reconcile: () => Promise<unknown>,
  now = Date.now(),
) {
  if (!ref.trim() || ref.length > 500 || note.length > 2000)
    throw new Error("payment_reference_required");
  const before = checkedBatch(db, id);
  if (before.status !== "locked" || before.total <= 0) throw new Error("invalid_settlement_state");
  await reconcile();
  db.transaction((tx) => {
    const b = checkedBatch(tx, id);
    if (b.status !== "locked" || b.revision !== before.revision)
      throw new Error("settlement_changed");
    assertReconciled(tx, id, now);
    tx.update(kolSettlements)
      .set({
        status: "paid",
        paymentRef: ref.trim(),
        paymentNote: note,
        paidAt: now,
        revision: b.revision + 1,
      })
      .where(eq(kolSettlements.id, id))
      .run();
    audit(
      tx,
      actor,
      "settlement.payment_recorded",
      id,
      { reference: ref, note, total: b.total, currency: b.currency },
      now,
    );
  });
}
export function cancelSettlement(
  db: Db,
  id: string,
  reason: string,
  actor: string,
  now = Date.now(),
) {
  if (!reason.trim()) throw new Error("reason_required");
  db.transaction((tx) => {
    const b = checkedBatch(tx, id);
    if (b.status === "paid" || b.status === "canceled") throw new Error("invalid_settlement_state");
    tx.delete(kolSettlementItems).where(eq(kolSettlementItems.settlementId, id)).run();
    tx.update(kolSettlements)
      .set({ status: "canceled", revision: b.revision + 1 })
      .where(eq(kolSettlements.id, id))
      .run();
    audit(tx, actor, "settlement.cancel", id, { reason }, now);
  });
}
export function correctPayment(
  db: Db,
  id: string,
  reference: string,
  reason: string,
  actor: string,
) {
  if (!reason.trim() || !reference.trim() || reference.length > 500 || reason.length > 2000)
    throw new Error("reason_required");
  db.transaction((tx) => {
    const b = checkedBatch(tx, id);
    if (b.status !== "paid") throw new Error("invalid_settlement_state");
    tx.update(kolSettlements)
      .set({ paymentRef: reference, paymentNote: reason, revision: b.revision + 1 })
      .where(eq(kolSettlements.id, id))
      .run();
    audit(tx, actor, "settlement.payment_corrected", id, {
      before: b.paymentRef,
      after: reference,
      reason,
    });
  });
}
export function settlementCsv(db: Db, id: string) {
  const b = checkedBatch(db, id),
    rows = db
      .select()
      .from(kolSettlementItems)
      .where(eq(kolSettlementItems.settlementId, id))
      .all();
  const schema = z.object({
    name: z.string(),
    net: z.number().int(),
    rateBps: z.number().int(),
    amount: z.number().int(),
    currency: z.string(),
  });
  const entries = rows.map((row) => {
    const value = schema.safeParse(JSON.parse(row.snapshot));
    if (!value.success || value.data.currency !== b.currency)
      throw new Error("settlement_snapshot_missing");
    return value.data;
  });
  return (
    "\uFEFF" +
    [
      [
        "批次",
        "月份",
        "订单",
        "币种",
        "商品净额（批次快照）",
        "佣金比例%",
        "本次佣金调整",
        "结算状态",
      ],
      ...entries.map((o) => [
        b.id,
        b.month,
        o.name,
        b.currency,
        decimal(o.net, b.currency),
        String(o.rateBps / 100),
        decimal(o.amount, b.currency),
        b.status,
      ]),
    ]
      .map((row, index) =>
        row
          .map((value, column) =>
            index > 0 && [4, 5, 6].includes(column) ? value : csvCell(value),
          )
          .join(","),
      )
      .join("\r\n")
  );
}
