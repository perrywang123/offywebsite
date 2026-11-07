// @vitest-environment node
import { describe, expect, it } from "vitest";
import { testDb } from "../kol/test-db";
import {
  importReport,
  reportDetail,
  listReports,
  reconcileReport,
  saveCreator,
  listCreators,
  reviewFinding,
} from "./service";
import type { ReportInput } from "@/lib/collabs/reports";
const input: ReportInput = {
  filename: "official.csv",
  csv: "Creator,Order,Currency,Sales,Commission\nMaya,#1040,USD,41.31,3.10",
  kind: "sales",
  granularity: "order",
  periodFrom: "2026-11-01",
  periodTo: "2026-11-30",
  numberFormat: "dot",
  salesBasis: "order-total",
  mapping: {
    creator: "Creator",
    orderName: "Order",
    currency: "Currency",
    sales: "Sales",
    commission: "Commission",
  },
};
const key = Buffer.alloc(32, 7);
describe("immutable Collabs report evidence", () => {
  it("requires source attestation and stores only normalized fields outside encrypted originals", () => {
    const db = testDb();
    expect(() => importReport(db, input, "owner", { key })).toThrow("source_confirmation_required");
    const batch = importReport(db, input, "owner", { key, confirmed: true });
    expect(reportDetail(db, batch.id)).toMatchObject({
      kind: "sales",
      actor: "owner",
      rowCount: 1,
      rows: [{ creator: "Maya", commission: 310 }],
    });
    expect(JSON.stringify(listReports(db))).not.toContain("Creator,Order");
  });
  it("deduplicates the same source, retains corrections and requires acknowledging overlap", () => {
    const db = testDb(),
      first = importReport(db, input, "owner", { key, confirmed: true });
    expect(importReport(db, input, "owner", { key, confirmed: true }).id).toBe(first.id);
    expect(() =>
      importReport(db, { ...input, csv: input.csv.replace("3.10", "3.20") }, "owner", {
        key,
        confirmed: true,
      }),
    ).toThrow("report_overlap_confirmation_required");
    const correction = importReport(
      db,
      { ...input, csv: input.csv.replace("3.10", "3.20") },
      "owner",
      { key, confirmed: true, supersedes: first.id },
    );
    expect(reportDetail(db, first.id).status).toBe("superseded");
    expect(reportDetail(db, correction.id).supersedes).toBe(first.id);
    expect(listReports(db)).toHaveLength(2);
  });
  it("keeps reconciliation read-only, currency-aware and separate from official commission", async () => {
    const db = testDb();
    saveCreator(
      db,
      {
        name: "Maya",
        alias: "maya",
        creatorKey: "Maya",
        officialLink: "https://isoffy.com/discount/MAYA",
        enabled: true,
      },
      "owner",
      "https://isoffy.com",
    );
    const batch = importReport(db, input, "owner", { key, confirmed: true });
    const check = await reconcileReport(db, batch.id, "owner", async () => ({
      id: "gid://shopify/Order/1040",
      name: "#1040",
      currency: "USD",
      total: 4131,
      canceled: false,
      refunded: false,
      financialStatus: "PAID",
    }));
    expect(check.findings).toEqual([]);
    expect(reportDetail(db, batch.id).rows[0].commission).toBe(310);
    const changed = await reconcileReport(db, batch.id, "owner", async () => ({
      id: "gid://shopify/Order/1040",
      name: "#1040",
      currency: "HKD",
      total: 4131,
      canceled: false,
      refunded: true,
      financialStatus: "REFUNDED",
    }));
    expect(changed.findings.map((f) => f.code)).toEqual(
      expect.arrayContaining(["currency_not_comparable", "refunded_or_canceled_with_commission"]),
    );
    expect(() => reviewFinding(db, changed.id, changed.findings[0].key, "owner", "")).toThrow(
      "reason_required",
    );
    reviewFinding(db, changed.id, changed.findings[0].key, "owner", "等待新一期官方报告");
    expect(reportDetail(db, batch.id).checks).toHaveLength(2);
    expect(reportDetail(db, batch.id).reviews).toHaveLength(1);
  });
  it("does not claim aggregate reports or unavailable Shopify data are order-verified", async () => {
    const db = testDb(),
      batch = importReport(
        db,
        {
          ...input,
          granularity: "creator",
          mapping: { creator: "Creator", currency: "Currency", commission: "Commission" },
        },
        "owner",
        { key, confirmed: true },
      );
    const check = await reconcileReport(db, batch.id, "owner", async () => {
      throw new Error("must_not_call");
    });
    expect(check.findings[0].code).toBe("aggregate_only");
    expect(check.verifiedOrders).toBe(0);
  });
  it("reserves aliases and records edits without reassigning identity", () => {
    const db = testDb(),
      creator = saveCreator(
        db,
        {
          name: "Maya",
          alias: "maya",
          creatorKey: "Maya",
          officialLink: "https://isoffy.com/discount/MAYA",
          enabled: true,
        },
        "owner",
        "https://isoffy.com",
      );
    expect(listCreators(db)).toHaveLength(1);
    expect(() =>
      saveCreator(db, { ...creator, creatorKey: "Other" }, "owner", "https://isoffy.com"),
    ).toThrow("creator_identity_immutable");
  });
});
it("continues bounded read-only checks with a server-verified cursor", async () => {
  const db = testDb(),
    report = {
      ...input,
      csv:
        "Creator,Order,Currency,Sales,Commission\n" +
        Array.from({ length: 7 }, (_, i) => `Maya,#${i},USD,10,1`).join("\n"),
    };
  const batch = importReport(db, report, "owner", { key, confirmed: true });
  const lookup = async (row: { orderName: string | null }) => ({
    id: "gid://shopify/Order/1",
    name: row.orderName!,
    currency: "USD",
    total: 1000,
    canceled: false,
    refunded: false,
    financialStatus: "PAID",
  });
  const first = await reconcileReport(db, batch.id, "owner", lookup, { offset: 0 });
  expect(first.complete).toBe(false);
  expect(first.nextOffset).toBe(5);
  expect(first.verifiedOrders).toBe(5);
  await expect(
    reconcileReport(db, batch.id, "owner", lookup, { offset: 5, previousId: "invalid" }),
  ).rejects.toThrow("invalid_reconciliation_cursor");
  const second = await reconcileReport(db, batch.id, "owner", lookup, {
    offset: 5,
    previousId: first.id,
  });
  expect(second.complete).toBe(true);
  expect(second.verifiedOrders).toBe(7);
});
it("stops a remote outage after the first failed order without claiming a completed check", async () => {
  const db = testDb(),
    report = {
      ...input,
      csv: "Creator,Order,Currency,Sales,Commission\nMaya,#1,USD,10,1\nMaya,#2,USD,10,1",
    };
  const batch = importReport(db, report, "owner", { key, confirmed: true });
  let calls = 0;
  const result = await reconcileReport(
    db,
    batch.id,
    "owner",
    async () => {
      calls++;
      throw new Error("unavailable");
    },
    { offset: 0 },
  );
  expect(calls).toBe(1);
  expect(result.complete).toBe(false);
  expect(result.interrupted).toBe(true);
});
