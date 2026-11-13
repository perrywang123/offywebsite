// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
vi.mock("./mode", () => ({ collabsMode: () => true }));
import { testDb } from "../kol/test-db";
import { collabsCreators, collabsLinkDaily, kolAudit } from "../db/schema";
import { archiveCreator, restoreCreator, listArchivedCreators } from "./archive";
import { listCreators, saveCreator, importReport, reconcileReport, reportDetail } from "./service";
import { linkMetrics, recordLinkOpen } from "./links";
import { acceptLanding, landingMetrics } from "./landing";
import { acceptAttribution, attributionState, bindFlowCreator } from "./events";
import { collabsGet, collabsPost } from "./admin";

const now = Date.parse("2026-11-14T00:00:00Z");
const site = "https://isoffy.com";
function setup() {
  const db = testDb();
  const creator = saveCreator(
    db,
    {
      name: "Test creator",
      alias: "test-creator",
      creatorKey: "official-test-key",
      enabled: true,
      officialLink: `${site}/products?dt_id=test-tracking`,
    },
    "owner",
    site,
  );
  return { db, creator };
}
const landing = () => ({
  version: 1 as const,
  eventId: randomUUID(),
  dtId: "test-tracking",
  path: "/products",
  analyticsAllowed: true as const,
});
const event = {
  version: 1,
  shop: "shop.myshopify.com",
  sentAt: String(now / 1000),
  communityMemberId: 123,
  firstName: "Test",
  lastName: null,
  primaryUsername: "test",
  salesNumber: 1,
  linkVisitsCumulative: 5,
  salesCumulativeCents: 4590,
  commissionCumulativeCents: 459,
  orderId: "gid://shopify/Order/1",
  orderName: "#1001",
  orderCreatedAt: new Date(now).toISOString(),
};

describe("recoverable collaboration cleanup", () => {
  it("archives atomically, disables the old storefront field and keeps observations and audit", () => {
    const { db, creator } = setup();
    recordLinkOpen(db, creator.id, now);
    acceptLanding(db, landing(), "browser-a", now);
    archiveCreator(
      db,
      { id: creator.id, reason: "test", note: "Owner confirmed", confirmed: true },
      "owner",
    );
    expect(listCreators(db)).toEqual([]);
    expect(
      db.select().from(collabsCreators).where(eq(collabsCreators.id, creator.id)).get(),
    ).toMatchObject({ ...creator, enabled: false, updatedAt: expect.any(Number) });
    expect(listArchivedCreators(db)[0]).toMatchObject({
      id: creator.id,
      alias: creator.alias,
      archiveReason: "test",
      archiveNote: "Owner confirmed",
      archivedBy: "owner",
    });
    expect(db.select().from(collabsLinkDaily).all()).toHaveLength(1);
    expect(linkMetrics(db, 7, now).links).toEqual([]);
    expect(landingMetrics(db, 7, now).groups).toEqual([]);
    expect(linkMetrics(db, 7, now, true).links[0].total).toBe(1);
    expect(landingMetrics(db, 7, now, true).groups[0]).toMatchObject({ totalPv: 1, periodUv: 1 });
    expect(acceptLanding(db, landing(), "browser-b", now).accepted).toBe(false);
    const audits = db.select().from(kolAudit).all();
    archiveCreator(db, { id: creator.id, reason: "ended", confirmed: true }, "owner");
    expect(db.select().from(kolAudit).all()).toEqual(audits);
    expect(listArchivedCreators(db)[0].archiveReason).toBe("test");
  });

  it("restores the same identity without reactivating the link, and restore is idempotent", () => {
    const { db, creator } = setup();
    archiveCreator(db, { id: creator.id, reason: "ended", confirmed: true }, "owner");
    restoreCreator(db, creator.id, "owner");
    expect(listArchivedCreators(db)).toEqual([]);
    expect(listCreators(db)[0]).toMatchObject({
      id: creator.id,
      alias: creator.alias,
      enabled: false,
    });
    const audits = db.select().from(kolAudit).all();
    restoreCreator(db, creator.id, "owner");
    expect(db.select().from(kolAudit).all()).toEqual(audits);
    expect(audits.filter((a) => a.entity === creator.id).map((a) => a.action)).toEqual([
      "collabs.creator.save",
      "collabs.creator.archive",
      "collabs.creator.restore",
    ]);
  });

  it("requires a reason and confirmation, blocks edits and preserves reserved tracking/alias identity", () => {
    const { db, creator } = setup();
    expect(() =>
      archiveCreator(db, { id: creator.id, reason: "test", confirmed: false }, "owner"),
    ).toThrow();
    expect(() =>
      archiveCreator(db, { id: creator.id, reason: "", confirmed: true }, "owner"),
    ).toThrow();
    expect(listCreators(db)[0].enabled).toBe(true);
    archiveCreator(db, { id: creator.id, reason: "test", confirmed: true }, "owner");
    expect(() => saveCreator(db, { ...creator, enabled: true }, "owner", site)).toThrow(
      "creator_archived",
    );
    expect(() =>
      saveCreator(db, { ...creator, id: undefined, alias: "new-alias" }, "owner", site),
    ).toThrow("official_tracking_already_bound");
    expect(() =>
      saveCreator(
        db,
        { ...creator, id: undefined, creatorKey: null, officialLink: `${site}/products?dt_id=new` },
        "owner",
        site,
      ),
    ).toThrow(/UNIQUE/);
    expect(listCreators(db, true)).toHaveLength(1);
    expect(() => restoreCreator(db, randomUUID(), "owner")).toThrow("creator_missing");
  });

  it("retains complete shared-dt_id history when a legacy duplicate remains active", () => {
    const { db, creator } = setup();
    const legacy = { ...creator, id: randomUUID(), alias: "legacy", creatorKey: null };
    db.insert(collabsCreators).values(legacy).run();
    acceptLanding(db, landing(), "browser-a", now);
    archiveCreator(db, { id: creator.id, reason: "test", confirmed: true }, "owner");
    expect(landingMetrics(db, 7, now).groups[0]).toMatchObject({
      aliases: ["legacy"],
      totalPv: 1,
      periodUv: 1,
    });
    expect(landingMetrics(db, 7, now, true).groups[0].aliases).toEqual(["legacy", "test-creator"]);
    archiveCreator(db, { id: legacy.id, reason: "test", confirmed: true }, "owner");
    expect(landingMetrics(db, 7, now).groups).toEqual([]);
  });

  it("keeps bound Flow evidence and report matching after archive; new Flow binding is rejected", async () => {
    const { db, creator } = setup();
    acceptAttribution(db, event, event.shop, now);
    bindFlowCreator(db, "123", creator.id, "owner");
    const report = importReport(
      db,
      {
        filename: "history.csv",
        csv: "Creator,Currency,Commission\nofficial-test-key,USD,4.59",
        kind: "sales",
        granularity: "creator",
        periodFrom: "2026-11-01",
        periodTo: "2026-11-30",
        numberFormat: "dot",
        salesBasis: "unspecified",
        mapping: { creator: "Creator", currency: "Currency", commission: "Commission" },
      },
      "owner",
      { key: Buffer.alloc(32, 7), confirmed: true },
    );
    const before = attributionState(db);
    archiveCreator(db, { id: creator.id, reason: "ended", confirmed: true }, "owner");
    expect(attributionState(db)).toEqual(before);
    expect(reportDetail(db, report.id).rows[0].commission).toBe(459);
    const result = await reconcileReport(db, report.id, "owner", async () => null);
    expect(result.findings.some((f) => f.code === "creator_unmapped")).toBe(false);
    acceptAttribution(
      db,
      { ...event, communityMemberId: 124, orderId: "gid://shopify/Order/2" },
      event.shop,
      now,
    );
    expect(() => bindFlowCreator(db, "124", creator.id, "owner")).toThrow("creator_archived");
  });

  it("does not infer contract expiry from age, inactivity or a missing report", () => {
    const { db, creator } = setup();
    db.update(collabsCreators).set({ createdAt: 1, updatedAt: 1 }).run();
    expect(listCreators(db).map((c) => c.id)).toEqual([creator.id]);
    expect(listArchivedCreators(db)).toEqual([]);
  });
  it("does not request report identity binding for an archived unbound test record", async () => {
    const { db, creator } = setup();
    const pending = saveCreator(
      db,
      {
        name: "Finished test",
        alias: "finished-test",
        officialLink: `${site}/products?dt_id=finished-test`,
        enabled: true,
      },
      "owner",
      site,
    );
    archiveCreator(db, { id: pending.id, reason: "test", confirmed: true }, "owner");
    const report = importReport(
      db,
      {
        filename: "real.csv",
        csv: "Creator,Currency,Commission\nofficial-test-key,USD,4.59",
        kind: "sales",
        granularity: "creator",
        periodFrom: "2026-11-01",
        periodTo: "2026-11-30",
        numberFormat: "dot",
        salesBasis: "unspecified",
        mapping: { creator: "Creator", currency: "Currency", commission: "Commission" },
      },
      "owner",
      { key: Buffer.alloc(32, 7), confirmed: true },
    );
    const result = await reconcileReport(db, report.id, "owner", async () => null);
    expect(result.findings.some((f) => f.code === "creator_identity_pending")).toBe(false);
    expect(listCreators(db)[0].id).toBe(creator.id);
  });
});

describe("archive administrator endpoints", () => {
  it("returns archived records separately and excludes them from default metrics, including period endpoints", async () => {
    const { db, creator } = setup();
    recordLinkOpen(db, creator.id, now);
    await collabsPost(
      db,
      ["collabs", "archive"],
      "owner",
      new Request(`${site}/api/admin/kol/collabs/archive`, {
        method: "POST",
        body: JSON.stringify({ id: creator.id, reason: "test", confirmed: true }),
      }),
    );
    const normal = await collabsGet(db, ["collabs"]).json();
    expect(normal.creators).toEqual([]);
    expect(normal.archivedCreators).toHaveLength(1);
    expect(normal.linkMetrics.links).toEqual([]);
    const historical = await collabsGet(
      db,
      ["collabs", "links"],
      new Request(`${site}/api/admin/kol/collabs/links?days=7&includeArchived=1`),
    ).json();
    expect(historical.links).toHaveLength(1);
    await collabsPost(
      db,
      ["collabs", "restore"],
      "owner",
      new Request(`${site}/api/admin/kol/collabs/restore`, {
        method: "POST",
        body: JSON.stringify({ id: creator.id }),
      }),
    );
    expect(listCreators(db)[0]).toMatchObject({ id: creator.id, enabled: false });
  });
});
