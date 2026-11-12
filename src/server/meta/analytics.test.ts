// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { testDb } from "../kol/test-db";
import { metaEvents, metaOrderEvidence } from "../db/schema";
import { readMetaAnalytics } from "./analytics";
import { evidenceFilterSchema } from "./filters";
import { listMetaEvents } from "./store";

const now = Date.parse("2026-11-13T12:00:00Z");
const base = Date.parse("2026-11-12T01:00:00Z");
type Db = ReturnType<typeof testDb>;
function event(
  db: Db,
  visitor: string,
  name: string,
  at = base,
  source = {},
  attemptId?: string,
  status = "observed",
) {
  const id = randomUUID();
  db.insert(metaEvents)
    .values({
      id,
      visitorHash: visitor,
      name,
      createdAt: at,
      pagePath: "/",
      sourceJson: JSON.stringify(source),
      dataJson: "{}",
      attemptId,
      hasFbc: false,
      hasFbp: false,
      pixelAttempted: true,
      status,
      dueAt: at,
    })
    .run();
  return id;
}
function order(
  db: Db,
  attemptId: string,
  at = base + 30,
  changes: Partial<typeof metaOrderEvidence.$inferInsert> = {},
) {
  db.insert(metaOrderEvidence)
    .values({
      orderId: randomUUID(),
      orderName: "#TEST",
      attemptId,
      createdAt: at,
      updatedAt: at,
      checkedAt: now,
      financialStatus: "PAID",
      canceled: false,
      test: false,
      currency: "USD",
      totalMinor: 4590,
      currentMinor: 4590,
      refundedMinor: 0,
      ...changes,
    })
    .run();
}
function journey(db: Db, visitor: string, source = {}, at = base) {
  const attempt = randomUUID();
  event(db, visitor, "PageView", at, source);
  event(db, visitor, "ViewContent", at + 10, source);
  event(db, visitor, "CheckoutReady", at + 20, source, attempt);
  return attempt;
}
const scope = { from: "2026-11-12", to: "2026-11-13" };

describe("read-only visual marketing analytics", () => {
  it("aggregates every retained page and keeps daily distincts separate from period distincts", () => {
    const db = testDb();
    for (let i = 0; i < 65; i++)
      event(db, "same-browser", "PageView", Date.parse("2026-11-12T15:59:00Z") + i);
    event(db, "same-browser", "PageView", Date.parse("2026-11-12T16:00:00Z"));
    const { analytics } = readMetaAnalytics(
      db,
      { ...scope, page: 2, name: "AddToCart", status: "failed" },
      now,
    );
    expect(analytics.totals.PageView).toEqual({ events: 66, browsers: 1 });
    expect(analytics.daily.map((d) => d.metrics.PageView)).toEqual([
      { events: 65, browsers: 1 },
      { events: 1, browsers: 1 },
    ]);
    expect(analytics.range.timeZone).toBe("Asia/Shanghai");
  });

  it("uses sequential browser cohorts and permits Buy Now to skip cart", () => {
    const db = testDb();
    const attempt = journey(db, "complete");
    event(db, "complete", "CheckoutReady", base + 21, {}, attempt);
    order(db, attempt);
    order(db, attempt, base + 40);
    event(db, "missing-page", "ViewContent");
    event(db, "missing-page", "CheckoutReady", base + 20, {}, "missing");
    event(db, "reverse", "ViewContent", base - 1);
    event(db, "reverse", "PageView");
    event(db, "cart-only", "PageView");
    event(db, "cart-only", "ViewContent", base + 1);
    event(db, "cart-only", "AddToCart", base + 2);
    const result = readMetaAnalytics(db, scope, now);
    expect(result.analytics.funnel).toMatchObject({
      view: 3,
      content: 2,
      cart: 1,
      checkout: 1,
      paid: 1,
      orders: 2,
    });
    expect(result.analytics.totals.ViewContent.browsers).toBe(4);
    expect(result.stageVisitors.paid).toEqual(["complete"]);
  });

  it("never associates a payment with an earlier different checkout attempt of the same browser", () => {
    const db = testDb();
    event(db, "visitor", "CheckoutReady", base - 5, {}, "before-product");
    journey(db, "visitor");
    order(db, "before-product");
    expect(readMetaAnalytics(db, scope, now).analytics.funnel.paid).toBe(0);
  });

  it("accepts equal event timestamps without inventing missing product observations", () => {
    const db = testDb();
    event(db, "equal", "ViewContent");
    event(db, "equal", "PageView");
    event(db, "equal", "CheckoutReady", base, {}, "equal-attempt");
    order(db, "equal-attempt", base);
    event(db, "missing-product", "PageView");
    event(db, "missing-product", "CheckoutReady", base + 1, {}, "other");
    order(db, "other");
    expect(readMetaAnalytics(db, scope, now).analytics.funnel).toMatchObject({
      view: 2,
      content: 1,
      checkout: 1,
      paid: 1,
    });
  });

  it("isolates recorded source groups and defaults to excluding internal tests", () => {
    const db = testDb();
    const a = { ad_id: "111", campaign_id: "222" };
    journey(db, "ad", a);
    journey(db, "test", { ...a, utm_medium: "internal_test" });
    journey(db, "other", {});
    event(db, "ad", "PageView", base + 50, { ad_id: "333" });
    const result = readMetaAnalytics(db, scope, now).analytics;
    expect(result.ads.find((a) => a.adId === "111")?.funnel.checkout).toBe(1);
    expect(result.ads.find((a) => a.adId === "333")?.funnel.checkout).toBe(0);
    expect(result.ads.find((a) => a.adId === null)?.funnel.view).toBe(1);
    expect(result.funnel.view).toBe(2);
    expect(result.ads.reduce((n, a) => n + a.funnel.view, 0)).toBe(3);
    expect(
      readMetaAnalytics(db, { ...scope, source: "ad", adId: "111" }, now).analytics.funnel.view,
    ).toBe(1);
    expect(
      readMetaAnalytics(db, { ...scope, source: "unlabelled" }, now).analytics.funnel.view,
    ).toBe(1);
    expect(readMetaAnalytics(db, { ...scope, includeTests: true }, now).analytics.funnel.view).toBe(
      3,
    );
    expect(evidenceFilterSchema.parse({ source: "ad", stage: "paid" })).toMatchObject({
      source: "ad",
      stage: "paid",
    });
  });

  it("requires an in-window order after its checkout and excludes canceled/unpaid/test orders", () => {
    const db = testDb();
    const attempt = journey(db, "paid");
    order(db, attempt, base + 30, { financialStatus: "REFUNDED", refundedMinor: 4590 });
    order(db, attempt, base + 31, {
      financialStatus: "PARTIALLY_REFUNDED",
      currency: "HKD",
      totalMinor: 36900,
    });
    for (const [visitor, changes] of [
      ["canceled", { canceled: true }],
      ["test", { test: true }],
      ["pending", { financialStatus: "PENDING" }],
      ["partial", { financialStatus: "PARTIALLY_PAID" }],
    ] as const) {
      const a = journey(db, visitor);
      order(db, a, base + 30, changes);
    }
    const before = journey(db, "early-order"),
      later = journey(db, "out-of-window");
    order(db, before, base - 1);
    order(db, later, Date.parse("2026-11-14T00:00:00+08:00"));
    const result = readMetaAnalytics(db, scope, now).analytics;
    expect(result.funnel).toMatchObject({ paid: 1, orders: 2 });
    expect(result.currencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ currency: "USD", totalMinor: 4590, refundedMinor: 4590 }),
        expect.objectContaining({ currency: "HKD", totalMinor: 36900 }),
      ]),
    );
    expect(readMetaAnalytics(db, { ...scope, includeTests: true }, now).analytics.funnel.paid).toBe(
      2,
    );
  });

  it("does not turn historical checkout events into checkout preparation or CAPI failures", () => {
    const db = testDb();
    event(db, "v", "PageView", base, {}, undefined, "failed");
    event(db, "v", "ViewContent", base + 1);
    event(db, "v", "InitiateCheckout", base + 2, {}, "legacy", "sent");
    order(db, "legacy");
    event(db, "v", "AddToCart", base + 3, {}, undefined, "sent");
    event(db, "v", "AddToCart", base + 4, {}, undefined, "pending");
    event(db, "v", "AddToCart", base + 5, {}, undefined, "failed");
    const a = readMetaAnalytics(db, scope, now).analytics;
    expect(a.funnel).toMatchObject({ checkout: 0, paid: 0 });
    expect(a.health.capi).toMatchObject({ total: 3, sent: 1, pending: 1, failed: 1 });
  });

  it("keeps aggregation read-only and identities server-only; stage detail honors pagination", () => {
    const db = testDb();
    const attempt = journey(db, "SECRET-HASH", { ad_id: "111" });
    order(db, attempt);
    journey(db, "not-paid");
    const before = db.$client.prepare("SELECT total_changes() AS n").get();
    const result = readMetaAnalytics(db, scope, now);
    const detail = listMetaEvents(db, { ...scope, stage: "paid" }, now, result.stageVisitors.paid);
    expect(detail.total).toBe(3);
    expect(listMetaEvents(db, scope, now, []).total).toBe(0);
    expect(JSON.stringify(result.analytics)).not.toContain("SECRET-HASH");
    expect(JSON.stringify(detail)).not.toContain("SECRET-HASH");
    expect(db.$client.prepare("SELECT total_changes() AS n").get()).toEqual(before);
  });

  it("returns a bounded empty daily grid for invalid-looking future and retained ranges", () => {
    const db = testDb();
    const a = readMetaAnalytics(db, { from: "2020-01-01", to: "2026-11-13" }, now).analytics;
    expect(a.daily.length).toBeLessThanOrEqual(31);
    expect(a.funnel.view).toBe(0);
    expect(a.health.capi.total).toBe(0);
    expect(
      readMetaAnalytics(db, { from: "2026-11-14", to: "2026-11-15" }, now).analytics.daily,
    ).toEqual([]);
  });
});
