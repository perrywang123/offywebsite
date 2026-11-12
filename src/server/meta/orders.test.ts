// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { testDb } from "../kol/test-db";
import { metaOrderEvidence, metaOrderSync } from "../db/schema";
import { acceptEvent, forgetVisitor } from "./store";
import { checkoutReference, verifyCheckoutReference } from "./reference";
import { pruneOrderEvidence } from "./retention";
import { syncOrderEvidence } from "./orders";
describe("consented read-only order evidence", () => {
  const key = randomBytes(32),
    now = Date.now();
  function setup() {
    const db = testDb(),
      attemptId = randomUUID(),
      visitorId = randomUUID();
    acceptEvent(
      db,
      {
        eventId: randomUUID(),
        visitorId,
        name: "CheckoutReady",
        occurredAt: now - 1000,
        pagePath: "/products/a",
        source: { ad_id: "120345678", campaign_id: "120123456" },
        data: { currency: "USD", value: 45.9 },
        consent: true,
      },
      { key, origin: "https://isoffy.com", capi: true, attemptId, now },
    );
    const money = (amount: string) => ({ presentmentMoney: { amount, currencyCode: "USD" } });
    const order = {
      id: "gid://shopify/Order/1234",
      name: "#1234",
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      test: false,
      cancelledAt: null,
      displayFinancialStatus: "PAID",
      customAttributes: [{ key: "offy_checkout_ref", value: checkoutReference(attemptId, key) }],
      totalPriceSet: money("45.90"),
      currentTotalPriceSet: money("45.90"),
      totalRefundedSet: money("0.00"),
    };
    return { db, attemptId, visitorId, order };
  }
  it("validates a domain-separated reference and rejects tampering", () => {
    const id = randomUUID(),
      ref = checkoutReference(id, key);
    expect(verifyCheckoutReference(ref, key)).toBe(id);
    expect(verifyCheckoutReference(ref + "x", key)).toBeUndefined();
    expect(verifyCheckoutReference(ref, randomBytes(32))).toBeUndefined();
    expect(verifyCheckoutReference("bad", key)).toBeUndefined();
  });
  it("upserts actual order facts once, backs off completed scans and never creates Meta Purchase", async () => {
    const { db, order, attemptId } = setup();
    const read = vi
      .fn()
      .mockResolvedValue({ nodes: [order], pageInfo: { hasNextPage: false, endCursor: null } });
    await syncOrderEvidence(db, read, key, now);
    await syncOrderEvidence(db, read, key, now + 1000);
    expect(read).toHaveBeenCalledTimes(1);
    await syncOrderEvidence(db, read, key, now + 16 * 60000);
    expect(db.select().from(metaOrderEvidence).all()).toHaveLength(1);
    expect(db.select().from(metaOrderEvidence).get()).toMatchObject({
      attemptId,
      orderName: "#1234",
      totalMinor: 4590,
      currency: "USD",
      financialStatus: "PAID",
      test: false,
    });
    expect(JSON.stringify(db.select().from(metaOrderEvidence).all())).not.toContain(
      "offy_checkout_ref",
    );
  });
  it("does not import unrelated, forged, or withdrawn records", async () => {
    const { db, order, visitorId } = setup();
    const read = vi.fn().mockResolvedValue({
      nodes: [order, { ...order, id: "gid://shopify/Order/1235", customAttributes: [] }],
      pageInfo: { hasNextPage: false, endCursor: null },
    });
    await syncOrderEvidence(db, read, key, now);
    forgetVisitor(db, visitorId, key);
    expect(db.select().from(metaOrderEvidence).all()).toHaveLength(0);
    await syncOrderEvidence(db, read, key, now + 16 * 60000);
    expect(db.select().from(metaOrderEvidence).all()).toHaveLength(0);
  });
  it("refreshes refunds/cancellations and refuses an older order snapshot", async () => {
    const { db, order } = setup();
    const read = vi
      .fn()
      .mockResolvedValue({ nodes: [order], pageInfo: { hasNextPage: false, endCursor: null } });
    await syncOrderEvidence(db, read, key, now);
    const updated = {
      ...order,
      updatedAt: new Date(now + 600000).toISOString(),
      cancelledAt: new Date(now + 600000).toISOString(),
      displayFinancialStatus: "REFUNDED",
      totalRefundedSet: order.totalPriceSet,
    };
    read.mockResolvedValue({ nodes: [updated], pageInfo: { hasNextPage: false, endCursor: null } });
    await syncOrderEvidence(db, read, key, now + 16 * 60000);
    expect(db.select().from(metaOrderEvidence).get()).toMatchObject({
      canceled: true,
      refundedMinor: 4590,
      financialStatus: "REFUNDED",
    });
    read.mockResolvedValue({ nodes: [order], pageInfo: { hasNextPage: false, endCursor: null } });
    await syncOrderEvidence(db, read, key, now + 32 * 60000);
    expect(db.select().from(metaOrderEvidence).get()?.refundedMinor).toBe(4590);
  });
  it("continues bounded pages with the same lower date bound", async () => {
    const { db, order } = setup();
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        nodes: [order],
        pageInfo: { hasNextPage: true, endCursor: "page2" },
      })
      .mockResolvedValueOnce({ nodes: [], pageInfo: { hasNextPage: false, endCursor: null } });
    await syncOrderEvidence(db, read, key, now);
    await syncOrderEvidence(db, read, key, now + 11000);
    expect(read.mock.calls[1]).toEqual([read.mock.calls[0][0], "page2"]);
    expect(db.select().from(metaOrderSync).get()).toMatchObject({ cursor: null, lastError: null });
  });
  it("expires order evidence without requiring a successful Shopify read", async () => {
    const { db, order } = setup();
    await syncOrderEvidence(
      db,
      async () => ({ nodes: [order], pageInfo: { hasNextPage: false, endCursor: null } }),
      key,
      now,
    );
    pruneOrderEvidence(db, now + 31 * 86400000);
    expect(db.select().from(metaOrderEvidence).all()).toHaveLength(0);
  });
  it("isolates API failures, preserves cursor and waits before retrying", async () => {
    const { db } = setup();
    const read = vi.fn().mockRejectedValue(new Error("secret-token upstream details"));
    expect(await syncOrderEvidence(db, read, key, now)).toMatchObject({ state: "unavailable" });
    await syncOrderEvidence(db, read, key, now + 1000);
    expect(read).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(await syncOrderEvidence(db, read, key, now + 1000))).not.toContain(
      "secret-token",
    );
  });
});
