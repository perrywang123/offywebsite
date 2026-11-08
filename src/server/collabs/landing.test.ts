// @vitest-environment node
import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { testDb } from "../kol/test-db";
import { saveCreator } from "./service";
import { collabsCreators, collabsLandingVisitors, collabsLandingReceipts } from "../db/schema";
import { acceptLanding, landingMetrics, forgetLandingVisitor, pruneLandingData } from "./landing";

const start = Date.UTC(2026, 10, 7, 12),
  DAY = 86400000;
const view = (dtId = "3689395") => ({
  version: 1 as const,
  dtId,
  eventId: randomUUID(),
  path: "/products",
  analyticsAllowed: true as const,
});
function seed() {
  const db = testDb();
  const creator = saveCreator(
    db,
    {
      name: "Perry",
      alias: "perry",
      officialLink: "https://isoffy.com/products?dt_id=3689395",
      enabled: true,
    },
    "owner",
    "https://isoffy.com",
  );
  return { db, creator };
}
it("counts distinct views once and period UV across days without summing daily UV", () => {
  const { db } = seed();
  const first = view();
  expect(acceptLanding(db, first, "browser-a", start)).toEqual({
    accepted: true,
    duplicate: false,
  });
  expect(acceptLanding(db, first, "browser-a", start + 1)).toEqual({
    accepted: true,
    duplicate: true,
  });
  acceptLanding(db, view(), "browser-a", start + 2);
  acceptLanding(db, view(), "browser-a", start + DAY);
  acceptLanding(db, view(), "browser-b", start + DAY + 1);
  const group = landingMetrics(db, 7, start + DAY).groups[0];
  expect(group).toMatchObject({
    dtId: "3689395",
    periodPv: 4,
    periodUv: 2,
    totalPv: 4,
    todayPv: 2,
    todayUv: 2,
  });
  expect(group.daily.slice(-2)).toEqual([
    { day: "2026-11-07", pv: 2, uv: 1 },
    { day: "2026-11-08", pv: 2, uv: 2 },
  ]);
});
it("combines historical aliases under one dt_id and preserves known collection start", () => {
  const { db, creator } = seed();
  db.insert(collabsCreators)
    .values({ ...creator, id: randomUUID(), alias: "legacy-test" })
    .run();
  acceptLanding(db, view(), "browser-a", start);
  const state = landingMetrics(db, 30, start);
  expect(state.groups).toHaveLength(1);
  expect(state.groups[0]).toMatchObject({
    aliases: ["legacy-test", "perry"],
    periodPv: 1,
    periodUv: 1,
    firstAt: start,
  });
  expect(state.groups[0].daily[0].pv).toBeNull();
});
it("does not store unknown or disabled tracking groups", () => {
  const { db, creator } = seed();
  expect(acceptLanding(db, view("unknown"), "browser-a", start).accepted).toBe(false);
  saveCreator(db, { ...creator, enabled: false }, "owner", "https://isoffy.com");
  expect(acceptLanding(db, view(), "browser-a", start).accepted).toBe(false);
  expect(landingMetrics(db, 7, start).groups[0]).toMatchObject({
    totalPv: 0,
    periodUv: 0,
    firstAt: null,
  });
});
it("removes withdrawn membership while keeping anonymous PV and idempotency", () => {
  const { db } = seed();
  const event = view();
  acceptLanding(db, event, "browser-a", start);
  acceptLanding(db, view(), "browser-b", start);
  forgetLandingVisitor(db, "browser-a");
  expect(landingMetrics(db, 7, start).groups[0]).toMatchObject({ periodPv: 2, periodUv: 1 });
  expect(acceptLanding(db, event, "browser-a", start + 1).duplicate).toBe(true);
  expect(landingMetrics(db, 7, start).groups[0].periodUv).toBe(1);
});
it("prunes 90-day identifiers and receipts without deleting PV history or unrelated creator data", () => {
  const { db, creator } = seed();
  acceptLanding(db, view(), "old-browser", start - 91 * DAY);
  acceptLanding(db, view(), "new-browser", start);
  pruneLandingData(db, start);
  expect(db.select().from(collabsLandingVisitors).all()).toHaveLength(1);
  expect(db.select().from(collabsLandingReceipts).all()).toHaveLength(1);
  const group = landingMetrics(db, 90, start).groups[0];
  expect(group).toMatchObject({ totalPv: 2, periodPv: 1, periodUv: 1 });
  expect(db.select().from(collabsCreators).all()).toEqual([creator]);
});
