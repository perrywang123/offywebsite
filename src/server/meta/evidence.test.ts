// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { testDb } from "../kol/test-db";
import { acceptEvent, listMetaEvents } from "./store";
import { evidenceOverview, traceEvidence } from "./evidence";
import { metaOrderEvidence } from "../db/schema";
describe("scoped marketing evidence", () => {
  const now = Date.parse("2026-11-12T06:00:00Z"),
    key = randomBytes(32);
  it("excludes labelled tests by default, respects Shanghai dates and never exposes visitor identity", () => {
    const db = testDb(),
      visitorId = randomUUID();
    const e = {
      eventId: randomUUID(),
      visitorId,
      name: "PageView" as const,
      occurredAt: now,
      pagePath: "/",
      source: { ad_id: "123456" },
      data: {},
      consent: true as const,
    };
    acceptEvent(db, e, { key, capi: true, origin: "https://isoffy.com", now });
    acceptEvent(
      db,
      { ...e, eventId: randomUUID(), source: { utm_medium: "internal_test" } },
      { key, capi: true, origin: "https://isoffy.com", now },
    );
    expect(listMetaEvents(db, {}, now).total).toBe(1);
    expect(listMetaEvents(db, { includeTests: true }, now).total).toBe(2);
    expect(listMetaEvents(db, { from: "2026-11-13" }, now).total).toBe(0);
    expect(evidenceOverview(db, { adId: "123456" }, now).events[0]).toMatchObject({
      name: "PageView",
      count: 1,
      browsers: 1,
    });
    const trace = traceEvidence(db, e.eventId, {}, now);
    expect(trace?.events).toHaveLength(1);
    expect(JSON.stringify(trace)).not.toContain(visitorId);
    expect(JSON.stringify(trace)).not.toContain("visitorHash");
  });
  it("groups linked orders by currency, keeps cancellations explicit and excludes Shopify test orders", () => {
    const db = testDb(),
      attemptId = randomUUID();
    acceptEvent(
      db,
      {
        eventId: randomUUID(),
        visitorId: randomUUID(),
        name: "CheckoutReady",
        occurredAt: now,
        pagePath: "/products/a",
        source: { ad_id: "123456" },
        data: {},
        consent: true,
      },
      { key, capi: false, origin: "https://isoffy.com", attemptId, now },
    );
    const base = {
      orderId: "gid://shopify/Order/1",
      orderName: "#1",
      attemptId,
      createdAt: now,
      updatedAt: now,
      checkedAt: now,
      financialStatus: "PAID",
      canceled: false,
      test: false,
      currency: "USD",
      totalMinor: 4590,
      currentMinor: 4590,
      refundedMinor: 0,
    };
    db.insert(metaOrderEvidence)
      .values([
        base,
        { ...base, orderId: "gid://shopify/Order/2", currency: "HKD", totalMinor: 36900 },
        { ...base, orderId: "gid://shopify/Order/3", test: true },
      ])
      .run();
    const result = evidenceOverview(db, {}, now);
    expect(result.orders).toHaveLength(2);
    expect(result.currencies).toHaveLength(2);
    expect(result.currencies.find((x) => x.currency === "USD")?.totalMinor).toBe(4590);
    expect(evidenceOverview(db, { includeTests: true }, now).orders).toHaveLength(3);
  });
});
