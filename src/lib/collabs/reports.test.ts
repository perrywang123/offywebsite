import { describe, expect, it } from "vitest";
import { parseCsv, previewReport, reportMoney, type ReportInput } from "./reports";

const input = (
  csv = "Creator,Order,Currency,Sales,Commission\nMaya,#1040,USD,41.31,3.10",
): ReportInput => ({
  filename: "collabs-sales.csv",
  csv,
  kind: "sales",
  granularity: "order",
  periodFrom: "2026-11-01",
  periodTo: "2026-11-30",
  numberFormat: "dot",
  salesBasis: "unspecified",
  mapping: {
    creator: "Creator",
    orderName: "Order",
    currency: "Currency",
    sales: "Sales",
    commission: "Commission",
  },
});
describe("Collabs source report parsing", () => {
  it("reads BOM, escaped quotes, CRLF and quoted multiline without altering values", () => {
    expect(parseCsv('\uFEFFName,Value\r\n"Ma""ya\nteam","1,234.50"\r\n')).toEqual({
      headers: ["Name", "Value"],
      rows: [['Ma"ya\nteam', "1,234.50"]],
    });
  });
  it.each(["A,A\nx,y", 'A,B\n"x,y', "A,B\nx,y,z", 'A,B\n"x"oops,y', "A,B\n"])(
    "rejects malformed or empty CSV: %s",
    (csv) => expect(() => parseCsv(csv)).toThrow(),
  );
  it("limits bytes and row count", () => {
    expect(() => parseCsv("A\n" + "x".repeat(2_100_000))).toThrow("report_too_large");
    expect(() => parseCsv("A\n" + "x\n".repeat(2001))).toThrow("report_too_many_rows");
  });
  it("requires an actual mapped header and prevents reuse of the same column", () => {
    expect(() =>
      previewReport({ ...input(), mapping: { ...input().mapping, commission: "missing" } }),
    ).toThrow();
    expect(() =>
      previewReport({ ...input(), mapping: { ...input().mapping, commission: "Sales" } }),
    ).toThrow("mapping_column_reused");
  });
  it("does not guess currency, official commission or payout from a paid order", () => {
    const p = previewReport({
      ...input("Creator,Order,Currency,Sales,Commission\nMaya,#1040,USD,41.31,"),
      mapping: input().mapping,
    });
    expect(p.rows[0]).toMatchObject({
      creator: "Maya",
      orderName: "#1040",
      currency: "USD",
      sales: 4131,
      commission: null,
      payout: null,
      status: null,
    });
    expect(p.totals).toEqual([
      { currency: "USD", sales: 4131, commission: null, fee: null, payout: null },
    ]);
    expect(() =>
      previewReport({ ...input(), mapping: { creator: "Creator", sales: "Sales" } }),
    ).toThrow("currency_required");
  });
  it("distinguishes actual zero from a missing source value", () => {
    const p = previewReport(input("Creator,Order,Currency,Sales,Commission\nMaya,#1040,USD,0,0"));
    expect(p.rows[0].commission).toBe(0);
    expect(p.totals[0].commission).toBe(0);
  });
  it("keeps negative source adjustments and independent currencies", () => {
    const p = previewReport(
      input(
        "Creator,Order,Currency,Sales,Commission\nMaya,#1040,USD,41.31,3.10\nMaya,#1041,HKD,369,36.9\nMaya,#1042,USD,-10,-1",
      ),
    );
    expect(p.totals).toEqual([
      { currency: "HKD", sales: 36900, commission: 3690, fee: null, payout: null },
      { currency: "USD", sales: 3131, commission: 210, fee: null, payout: null },
    ]);
  });
  it("does not turn partial totals into a complete official total", () => {
    const p = previewReport(
      input(
        "Creator,Order,Currency,Sales,Commission\nMaya,#1040,USD,41.31,3.10\nMaya,#1041,USD,41.31,",
      ),
    );
    expect(p.totals[0].commission).toBeNull();
    expect(p.warnings).toContain("incomplete_amounts");
  });
  it("requires order identity for order granularity, but permits genuine aggregate reports", () => {
    const aggregate = {
      ...input("Creator,Currency,Commission\nMaya,USD,12.57"),
      mapping: { creator: "Creator", currency: "Currency", commission: "Commission" },
    };
    expect(() => previewReport(aggregate)).toThrow("order_identity_required");
    expect(previewReport({ ...aggregate, granularity: "creator" }).rows[0]).toMatchObject({
      orderId: null,
      orderName: null,
      creator: "Maya",
    });
  });
  it("retains an imported status as a source label, not a verified payout", () => {
    const p = previewReport({
      ...input("Creator,Currency,Amount,State,Ref\nMaya,USD,12.57,Paid,statement-1"),
      kind: "payout",
      granularity: "creator",
      mapping: {
        creator: "Creator",
        currency: "Currency",
        payout: "Amount",
        status: "State",
        reference: "Ref",
      },
    });
    expect(p.rows[0]).toMatchObject({
      payout: 1257,
      status: "Paid",
      reference: "statement-1",
      commission: null,
    });
  });
  it("requires valid explicit reporting dates and a compatible mapping", () => {
    expect(() => previewReport({ ...input(), periodFrom: "2026-02-30" })).toThrow();
    expect(() => previewReport({ ...input(), periodTo: "2026-10-30" })).toThrow(
      "invalid_report_period",
    );
  });
  it("identifies duplicate order/creator rows instead of silently netting them", () => {
    const p = previewReport(
      input(
        "Creator,Order,Currency,Sales,Commission\nMaya,#1040,USD,41.31,3.10\nMaya,#1040,USD,41.31,3.10",
      ),
    );
    expect(p.warnings).toContain("duplicate_source_rows");
    expect(p.rows).toHaveLength(2);
  });
});
describe("explicit report number conventions", () => {
  it.each([
    ["1,234.56", "dot", "USD", 123456],
    ["1.234,56", "comma", "EUR", 123456],
    ["-4.49", "dot", "USD", -449],
    ["123", "dot", "JPY", 123],
    ["1.234", "dot", "BHD", 1234],
  ] as const)("parses %s %s %s exactly", (value, format, currency, expected) =>
    expect(reportMoney(value, currency, format)).toBe(expected),
  );
  it.each(["$4.59", "1e3", "NaN", "12,34.56", "1.234,56", "0.001", "900719925474099.99"])(
    "rejects ambiguous, unsafe or overprecise values: %s",
    (value) => expect(() => reportMoney(value, "USD", "dot")).toThrow(),
  );
});
