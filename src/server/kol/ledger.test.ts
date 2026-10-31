// @vitest-environment node
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { testDb } from "./test-db";
import { createPartner, startReferral, confirmReferral, createIntent, bindCart } from "./core";
import {
  applyOrder,
  calculateOrder,
  createSettlement,
  lockSettlement,
  paySettlement,
  cancelSettlement,
  settlementCsv,
} from "./ledger";
import { kolLedger, kolSettlements, kolShopOrders } from "../db/schema";
export const now = Date.parse("2026-10-31T00:00:00Z");
export const bag = (amount: string, currencyCode = "USD") => ({
  presentmentMoney: { amount, currencyCode },
});
export function orderFixture(reference = "") {
  return {
    id: "gid://shopify/Order/1",
    name: "#1001",
    cartToken: "cartA",
    customAttributes: reference ? [{ key: "offy_ref", value: reference }] : [],
    presentmentCurrencyCode: "USD",
    taxesIncluded: false,
    edited: false,
    cancelledAt: null,
    displayFinancialStatus: "PAID",
    disputes: [],
    totalPriceSet: bag("110.00"),
    totalOutstandingSet: bag("0.00"),
    transactions: [
      {
        id: "tx1",
        kind: "SALE",
        status: "SUCCESS",
        amountSet: bag("110.00"),
        processedAt: new Date(now + 1000).toISOString(),
      },
    ],
    lineItems: {
      nodes: [
        {
          id: "line1",
          isGiftCard: false,
          quantity: 1,
          originalTotalSet: bag("120.00"),
          discountAllocations: [{ allocatedAmountSet: bag("20.00") }],
          taxLines: [{ priceSet: bag("10.00") }],
        },
      ],
      pageInfo: { hasNextPage: false },
    },
    refunds: [] as unknown[],
  };
}
function setup() {
  const db = testDb();
  const p = createPartner(
    db,
    {
      name: "Maya",
      alias: "maya",
      platform: "YouTube",
      socialUrl: "https://youtube.com/maya",
      email: "maya@example.com",
      rate: "7.25",
      startsAt: "2026-01-01",
      endsAt: "2027-01-01",
      target: "/products",
      status: "active",
    },
    "admin",
    now,
  );
  const r = startReferral(db, "maya", now)!;
  confirmReferral(db, r.id, now);
  const i = createIntent(db, r.id, "secret", now)!;
  bindCart(db, i.id, "gid://shopify/Cart/cartA", "https://example.com", now);
  return { db, p, i };
}
function refund(amount = "40.00", tax = "4.00", state = "SUCCESS") {
  return {
    id: "refund1",
    totalRefundedSet: bag(String(Number(amount) + Number(tax))),
    transactions: {
      nodes: [
        {
          id: "r1",
          kind: "REFUND",
          status: state,
          amountSet: bag(String(Number(amount) + Number(tax))),
          processedAt: new Date(now + 2000).toISOString(),
        },
      ],
      pageInfo: { hasNextPage: false },
    },
    refundLineItems: {
      nodes: [
        {
          lineItem: { id: "line1", isGiftCard: false },
          quantity: 1,
          subtotalSet: bag(amount),
          totalTaxSet: bag(tax),
        },
      ],
      pageInfo: { hasNextPage: false },
    },
    refundShippingLines: { nodes: [], pageInfo: { hasNextPage: false } },
    orderAdjustments: { nodes: [], pageInfo: { hasNextPage: false } },
  };
}
describe("Shopify facts to immutable commission ledger", () => {
  it("allocates all discounts, handles tax-inclusive prices and only successful full payments", () => {
    const o = orderFixture();
    expect(calculateOrder(o).net).toBe(10000);
    o.taxesIncluded = true;
    expect(calculateOrder(o).net).toBe(9000);
    o.transactions[0].kind = "AUTHORIZATION";
    expect(() => calculateOrder(o)).toThrow("payment_unverified");
  });
  it("does not treat pending refunds, currency mismatches or unallocated refunds as money", () => {
    const o = orderFixture();
    o.refunds = [refund("40.00", "4.00", "PENDING")];
    expect(() => calculateOrder(o)).toThrow("refund_unverified");
    o.refunds = [refund()];
    expect(calculateOrder(o).net).toBe(6000);
    o.refunds = [refund("40.00", "4.00")];
    o.lineItems.nodes[0].originalTotalSet = bag("120.00", "GBP");
    expect(() => calculateOrder(o)).toThrow("currency_mismatch");
  });
  it("is idempotent across duplicate/late events and recomputes rounded remaining commission", () => {
    const { db, i } = setup();
    const o = orderFixture(i.reference);
    applyOrder(db, o, "secret", now + 1001);
    applyOrder(db, o, "secret", now + 2000);
    expect(
      db
        .select()
        .from(kolLedger)
        .all()
        .map((x) => x.amount),
    ).toEqual([725]);
    o.refunds = [refund()];
    o.displayFinancialStatus = "PARTIALLY_REFUNDED";
    applyOrder(db, o, "secret", now + 3000);
    expect(
      db
        .select()
        .from(kolLedger)
        .all()
        .map((x) => x.amount),
    ).toEqual([725, -290]);
    expect(db.select().from(kolShopOrders).get()?.commission).toBe(435);
  });
  it("does not attribute coupon-only or mismatching/late checkout purchases", () => {
    const { db, i } = setup();
    let o = orderFixture();
    applyOrder(db, o, "secret", now + 2000);
    expect(db.select().from(kolLedger).all()).toHaveLength(0);
    o = orderFixture(i.reference);
    o.cartToken = "other";
    applyOrder(db, o, "secret", now + 2000);
    expect(db.select().from(kolShopOrders).get()?.status).toBe("review");
  });
});
describe("manual settlements", () => {
  it("enforces holds, unique inclusion, reconciliation and refunds after payment", async () => {
    const { db, p, i } = setup();
    const o = orderFixture(i.reference);
    applyOrder(db, o, "secret", now + 2000);
    expect(() => createSettlement(db, p.id, "USD", "2026-10", "admin", now + 10000)).toThrow(
      "no_available_entries",
    );
    const later = now + 30 * 86400000 + 2001,
      s = createSettlement(db, p.id, "USD", "2026-10", "admin", later);
    expect(() => createSettlement(db, p.id, "USD", "2026-10", "admin", later)).toThrow(
      "no_available_entries",
    );
    await lockSettlement(db, s.id, "admin", async () => applyOrder(db, o, "secret", later), later);
    await paySettlement(
      db,
      s.id,
      "bank-123",
      "paid externally",
      "admin",
      async () => applyOrder(db, o, "secret", later),
      later,
    );
    await expect(
      paySettlement(db, s.id, "bank-123", "", "admin", async () => {}, later),
    ).rejects.toThrow();
    o.refunds = [refund()];
    applyOrder(db, o, "secret", later + 1);
    const next = createSettlement(db, p.id, "USD", "2026-11", "admin", later + 2);
    expect(next.total).toBe(-290);
    expect(settlementCsv(db, next.id)).toContain(",-2.90,");
    expect(db.select().from(kolSettlements).where(eq(kolSettlements.id, s.id)).get()?.total).toBe(
      725,
    );
    const csv = settlementCsv(db, s.id);
    expect(csv).toContain("100.00");
    expect(csv).not.toContain("60.00");
  });
  it("invalidates locked batches when new refund arrives and releases canceled reservations", async () => {
    const { db, p, i } = setup();
    const o = orderFixture(i.reference);
    applyOrder(db, o, "secret", now + 2000);
    const later = now + 30 * 86400000 + 2001;
    const s = createSettlement(db, p.id, "USD", "2026-10", "admin", later);
    await lockSettlement(
      db,
      s.id,
      "admin",
      async () => {
        applyOrder(db, o, "secret", later);
      },
      later,
    );
    o.refunds = [refund()];
    applyOrder(db, o, "secret", later + 1);
    await expect(
      paySettlement(db, s.id, "bank", "", "admin", async () => {}, later),
    ).rejects.toThrow();
    cancelSettlement(db, s.id, "refund requires rebuild", "admin", later);
    expect(createSettlement(db, p.id, "USD", "2026-10", "admin", later).total).toBe(435);
  });
});

describe("financial edge cases", () => {
  it("excludes gift-card products, preserves shipping-only refund bases, and rejects truncated evidence", () => {
    const o = orderFixture();
    o.lineItems.nodes.push({
      ...o.lineItems.nodes[0],
      id: "gift-card",
      isGiftCard: true,
      originalTotalSet: bag("20.00"),
      discountAllocations: [],
      taxLines: [],
    });
    expect(calculateOrder(o).net).toBe(10000);
    o.refunds = [
      {
        ...refund("0.00", "0.00"),
        totalRefundedSet: bag("5.00"),
        refundLineItems: { nodes: [], pageInfo: { hasNextPage: false } },
        transactions: {
          nodes: [
            {
              id: "shipping-refund",
              kind: "REFUND",
              status: "SUCCESS",
              processedAt: new Date(now + 3000).toISOString(),
              amountSet: bag("5.00"),
            },
          ],
          pageInfo: { hasNextPage: false },
        },
        refundShippingLines: {
          nodes: [{ subtotalAmountSet: bag("5.00"), taxAmountSet: bag("0.00") }],
          pageInfo: { hasNextPage: false },
        },
      },
    ];
    expect(calculateOrder(o).net).toBe(10000);
    expect(() =>
      calculateOrder({ ...o, lineItems: { ...o.lineItems, pageInfo: { hasNextPage: true } } }),
    ).toThrow();
  });
  it("rejects successful-payment chains with unresolved disputes and edited orders", () => {
    const o = orderFixture();
    expect(() => calculateOrder({ ...o, edited: true })).toThrow("order_requires_review");
    expect(() => calculateOrder({ ...o, disputes: [{ status: "NEEDS_RESPONSE" }] })).toThrow(
      "order_requires_review",
    );
  });
  it("keeps stale larger commissions in review even after a prior review snapshot", () => {
    const { db, i } = setup();
    const o = orderFixture(i.reference);
    applyOrder(db, o, "secret", now + 2000);
    o.refunds = [refund()];
    applyOrder(db, o, "secret", now + 3000);
    const stale = orderFixture(i.reference);
    applyOrder(db, stale, "secret", now + 4000);
    applyOrder(db, stale, "secret", now + 5000);
    expect(db.select().from(kolShopOrders).get()?.status).toBe("review");
    expect(
      db
        .select()
        .from(kolLedger)
        .all()
        .reduce((n, l) => n + l.amount, 0),
    ).toBe(435);
  });
});
