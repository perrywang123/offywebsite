// @vitest-environment node
import { expect, it } from "vitest";
import { testDb } from "../kol/test-db";
import { saveCreator } from "./service";
import { recordLinkOpen, linkMetrics } from "./links";
const start = Date.parse("2026-11-08T00:00:00Z");
function setup() {
  const db = testDb();
  const creator = saveCreator(
    db,
    {
      name: "Perry",
      alias: "perry-test",
      enabled: true,
      officialLink: "https://isoffy.com/products?dt_id=example-test",
    },
    "owner",
    "https://isoffy.com",
  );
  return { db, creator };
}
it("keeps uncollected history unknown and counts daily opens without pretending they are unique people", () => {
  const { db, creator } = setup();
  expect(linkMetrics(db, 7, start).links[0]).toMatchObject({
    id: creator.id,
    total: 0,
    firstAt: null,
    lastAt: null,
  });
  recordLinkOpen(db, creator.id, start);
  recordLinkOpen(db, creator.id, start + 1);
  recordLinkOpen(db, creator.id, start + 86400000);
  const metrics = linkMetrics(db, 7, start + 86400000);
  expect(metrics.links[0]).toMatchObject({
    total: 3,
    periodTotal: 3,
    firstAt: start,
    lastAt: start + 86400000,
  });
  expect(metrics.links[0].daily.map((d) => d.count)).toEqual([null, null, null, null, null, 2, 1]);
  expect(metrics.timezone).toBe("UTC");
  expect(JSON.stringify(metrics)).not.toMatch(/userAgent|visitor|unique|ipAddress/);
});
it("keeps cumulative and selected-period totals separate, including disabled historical links", () => {
  const { db, creator } = setup();
  recordLinkOpen(db, creator.id, start);
  recordLinkOpen(db, creator.id, start + 30 * 86400000);
  saveCreator(db, { ...creator, enabled: false }, "owner", "https://isoffy.com");
  expect(linkMetrics(db, 7, start + 30 * 86400000).links[0]).toMatchObject({
    total: 2,
    periodTotal: 1,
    enabled: false,
  });
  expect(() => linkMetrics(db, 365, start)).toThrow("invalid_metrics_period");
});
