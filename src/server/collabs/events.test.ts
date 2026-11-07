// @vitest-environment node
import { expect, it } from "vitest";
import { testDb } from "../kol/test-db";
import {
  acceptAttribution,
  attributionState,
  bindFlowCreator,
  refreshAttributions,
} from "./events";
import { saveCreator } from "./service";
const now = Date.parse("2026-11-08T00:00:00Z");
const event = {
  version: 1,
  shop: "shop.myshopify.com",
  sentAt: String(now / 1000),
  communityMemberId: 123,
  firstName: "Maya",
  lastName: null,
  primaryUsername: "maya",
  salesNumber: 1,
  linkVisitsCumulative: 5,
  salesCumulativeCents: 4706,
  commissionCumulativeCents: 471,
  orderId: "gid://shopify/Order/1",
  orderName: "#1001",
  orderCreatedAt: "2026-11-07T23:00:00Z",
};
it("deduplicates retries by official creator/order identity and never guesses alias, report identity or a commission currency", () => {
  const db = testDb();
  saveCreator(
    db,
    {
      name: "Maya",
      alias: "maya",
      creatorKey: "123",
      enabled: true,
      officialLink: "https://isoffy.com/products?dt_id=123",
    },
    "owner",
    "https://isoffy.com",
  );
  expect(acceptAttribution(db, event, event.shop, now)).toBe(true);
  expect(
    acceptAttribution(db, { ...event, sentAt: String(now / 1000 + 5) }, event.shop, now + 5000),
  ).toBe(false);
  const state = attributionState(db);
  expect(state.events).toHaveLength(1);
  expect(state.creators[0]).toMatchObject({
    nativeId: "123",
    creatorId: null,
    linkVisits: 5,
    salesNumber: 1,
  });
  expect(state.events[0]).toMatchObject({
    orderId: event.orderId,
    orderName: "#1001",
    receivedAt: now,
    flowSentAt: now,
  });
  expect(state.events[0].order).toBeNull();
  expect(state.creators[0].snapshot).toMatchObject({ commissionCumulativeCents: 471 });
  expect(JSON.stringify(state)).not.toContain('"currency":"USD"');
});
it("only binds explicit unique native identities and preserves out-of-order snapshots", () => {
  const db = testDb();
  acceptAttribution(
    db,
    {
      ...event,
      orderId: "gid://shopify/Order/2",
      salesNumber: 2,
      sentAt: String(now / 1000 + 100),
    },
    event.shop,
    now + 100000,
  );
  acceptAttribution(db, event, event.shop, now + 200000);
  const creator = saveCreator(
    db,
    {
      name: "Maya",
      alias: "maya",
      enabled: true,
      officialLink: "https://isoffy.com/products?dt_id=example",
    },
    "owner",
    "https://isoffy.com",
  );
  expect(attributionState(db).creators[0].salesNumber).toBe(2);
  expect(() => bindFlowCreator(db, "not-received", creator.id, "owner")).toThrow(
    "flow_identity_missing",
  );
  bindFlowCreator(db, "123", creator.id, "owner");
  expect(attributionState(db).creators[0].creatorId).toBe(creator.id);
  const other = saveCreator(
    db,
    {
      name: "Other",
      alias: "other",
      enabled: true,
      officialLink: "https://isoffy.com/products?dt_id=other",
    },
    "owner",
    "https://isoffy.com",
  );
  expect(() => bindFlowCreator(db, "123", other.id, "owner")).toThrow("flow_identity_immutable");
});
it("rejects wrong shop, malformed ids and unexpected personal fields before storing", () => {
  const db = testDb();
  for (const invalid of [
    { ...event, shop: "other.myshopify.com" },
    { ...event, communityMemberId: 1.5 },
    { ...event, orderId: "123" },
    { ...event, email: "customer@example.test" },
  ])
    expect(() => acceptAttribution(db, invalid, event.shop, now)).toThrow();
  expect(attributionState(db).events).toHaveLength(0);
});
it("refreshes order facts independently, retries outages and never changes official commission or reports", async () => {
  const db = testDb();
  acceptAttribution(db, event, event.shop, now);
  await refreshAttributions(
    db,
    async () => {
      throw new Error("access denied with secret");
    },
    now,
  );
  expect(attributionState(db).events[0]).toMatchObject({
    error: "order_lookup_unavailable",
    order: null,
  });
  await refreshAttributions(
    db,
    async () => ({
      id: event.orderId,
      name: event.orderName,
      currency: "HKD",
      total: 36900,
      refundedTotal: 36900,
      canceled: false,
      refunded: true,
      financialStatus: "REFUNDED",
    }),
    now + 3600000,
  );
  const result = attributionState(db);
  expect(result.events[0].order).toMatchObject({ currency: "HKD", total: 36900, refunded: true });
  expect(result.creators[0].snapshot.commissionCumulativeCents).toBe(471);
  expect(JSON.stringify(result)).not.toContain("access denied with secret");
});
