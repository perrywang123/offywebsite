// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
import { testDb } from "../kol/test-db";
import type { Db } from "../kol/db";
import { metaOrderEvidence } from "../db/schema";
import { acceptEvent } from "./store";
import { readMetaOrderEvidence, readMetaOrderReconciliation } from "./reconciliation";
import type { MetaSource } from "@/lib/meta/events";

const key = randomBytes(32);
const checkoutAt = Date.parse("2026-11-18T15:59:00Z");
const paidAt = Date.parse("2026-11-18T16:02:00Z");
const now = Date.parse("2026-11-20T08:00:00Z");
const ad = "120257887844680211";
const paidSource = { utm_source: "instagram", utm_medium: "paid", utm_content: ad };

function record(
  db: Db,
  id: number,
  source: MetaSource,
  options: {
    hasFbc?: boolean;
    paymentTime?: number | null;
    test?: boolean;
  } = {},
) {
  const attemptId = randomUUID();
  const visitorId = randomUUID();
  acceptEvent(
    db,
    {
      eventId: randomUUID(),
      visitorId,
      name: "CheckoutReady",
      occurredAt: checkoutAt,
      pagePath: "/products/a",
      source,
      data: {},
      consent: true,
      fbc: options.hasFbc ? "fb.1.1795017540000.sample_click_id" : undefined,
    },
    { key, origin: "https://isoffy.com", capi: false, attemptId, now: checkoutAt },
  );
  db.insert(metaOrderEvidence)
    .values({
      orderId: `gid://shopify/Order/${id}`,
      orderName: `#${id}`,
      attemptId,
      createdAt: paidAt - 1000,
      updatedAt: paidAt,
      checkedAt: paidAt,
      paidAt: options.paymentTime === undefined ? paidAt : options.paymentTime,
      financialStatus: "PAID",
      canceled: false,
      test: !!options.test,
      currency: "USD",
      totalMinor: 4590,
      currentMinor: 4590,
      refundedMinor: 0,
    })
    .run();
  return visitorId;
}

describe("order-level ad source reconciliation", () => {
  it("looks up only exact searches missing local ad evidence and keeps existing rows", async () => {
    const db = testDb();
    record(db, 1179, paidSource);
    record(db, 1180, {}, { hasFbc: true });
    const lookup = vi.fn().mockResolvedValue({ status: "unavailable" });

    await readMetaOrderEvidence(db, {}, now, lookup);
    await readMetaOrderEvidence(db, { orderNumber: "#1179" }, now, lookup);
    expect(lookup).not.toHaveBeenCalled();
    const result = await readMetaOrderEvidence(db, { orderNumber: "#1180" }, now, lookup);
    expect(lookup).toHaveBeenCalledWith("#1180", "gid://shopify/Order/1180", false, now);
    expect(result.rows[0]).toMatchObject({ orderName: "#1180", hasFbc: true });
    expect(result.shopifyLookup).toEqual({ status: "unavailable" });
    await readMetaOrderEvidence(db, { orderNumber: "#1181" }, now, lookup);
    expect(lookup).toHaveBeenLastCalledWith("#1181", undefined, false, now);
  });

  it("does not reintroduce locally excluded test orders through the Shopify lookup", async () => {
    const db = testDb();
    record(db, 1180, { utm_source: "offy_validation" });
    const lookup = vi.fn();
    const result = await readMetaOrderEvidence(db, { orderNumber: "#1180" }, now, lookup);
    expect(result.total).toBe(0);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("finds the same order on either Shanghai date and applies ad and campaign filters", () => {
    const db = testDb();
    record(db, 1179, { ...paidSource, utm_campaign: "99" });
    const checkouts = readMetaOrderReconciliation(
      db,
      {
        basis: "checkout",
        from: "2026-11-18",
        to: "2026-11-18",
        adId: ad,
      },
      now,
    );
    expect(checkouts.rows).toMatchObject([
      { orderName: "#1179", checkoutAt, paidAt, source: { ad_id: ad, campaign_id: "99" } },
    ]);
    const payments = readMetaOrderReconciliation(
      db,
      {
        basis: "payment",
        from: "2026-11-19",
        to: "2026-11-19",
        campaignId: "99",
      },
      now,
    );
    expect(payments.rows).toEqual(checkouts.rows);
    expect(
      readMetaOrderReconciliation(
        db,
        {
          basis: "payment",
          from: "2026-11-18",
          to: "2026-11-18",
        },
        now,
      ).total,
    ).toBe(0);
  });
  it("looks up an exact order across retention without deriving an ad from a click signal", () => {
    const db = testDb();
    const visitor = record(db, 1180, {}, { hasFbc: true, paymentTime: null });
    record(db, 11801, paidSource);
    const order = readMetaOrderReconciliation(
      db,
      {
        orderNumber: "1180",
        basis: "payment",
        from: "2026-11-20",
        adId: ad,
      },
      now,
    );
    expect(order.rows).toMatchObject([
      { orderName: "#1180", hasFbc: true, paidAt: null, source: {} },
    ]);
    expect(order.rows[0]?.source.ad_id).toBeUndefined();
    expect(JSON.stringify(order)).not.toMatch(new RegExp(`visitorHash|sample_click_id|${visitor}`));
    expect(readMetaOrderReconciliation(db, { basis: "payment" }, now).total).toBe(1);
    expect(readMetaOrderReconciliation(db, { orderNumber: "#9999" }, now).total).toBe(0);
    expect(
      readMetaOrderReconciliation(db, { orderNumber: "#1180" }, now + 31 * 86400000).total,
    ).toBe(0);
  });
  it("excludes internal observations and Shopify test orders from listing and exact lookup", () => {
    const db = testDb();
    record(db, 1181, { utm_medium: "internal_test", ad_id: ad });
    record(db, 1182, paidSource, { test: true });
    expect(readMetaOrderReconciliation(db, {}, now).total).toBe(0);
    expect(readMetaOrderReconciliation(db, { orderNumber: "#1182" }, now).total).toBe(0);
    expect(readMetaOrderReconciliation(db, { includeTests: true }, now).total).toBe(2);
  });
});
