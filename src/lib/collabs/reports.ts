import { z } from "zod";
import { minor } from "@/server/kol/money";

export const amountFields = ["sales", "commission", "fee", "payout"] as const;
export const reportFields = [
  "creator",
  "orderId",
  "orderName",
  "currency",
  ...amountFields,
  "status",
  "occurredAt",
  "reference",
] as const;
export type ReportField = (typeof reportFields)[number];
export const reportSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  csv: z.string().max(2_097_152),
  kind: z.enum(["sales", "billing", "payout"]),
  granularity: z.enum(["order", "creator", "period"]),
  periodFrom: z.string(),
  periodTo: z.string(),
  numberFormat: z.enum(["dot", "comma"]),
  salesBasis: z.enum(["merchandise-net", "order-total", "unspecified"]),
  mapping: z.object(
    Object.fromEntries(reportFields.map((f) => [f, z.string().min(1).optional()])) as Record<
      ReportField,
      z.ZodOptional<z.ZodString>
    >,
  ),
});
export type ReportInput = z.infer<typeof reportSchema>;
export type ReportRow = {
  creator: string | null;
  orderId: string | null;
  orderName: string | null;
  currency: string;
  sales: number | null;
  commission: number | null;
  fee: number | null;
  payout: number | null;
  status: string | null;
  occurredAt: string | null;
  reference: string | null;
};
export type ReportTotal = Pick<ReportRow, "currency" | (typeof amountFields)[number]>;
export function parseCsv(source: string): { headers: string[]; rows: string[][] } {
  if (new TextEncoder().encode(source).length > 2_097_152) throw new Error("report_too_large");
  const text = source.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  function endCell() {
    row.push(cell);
    cell = "";
    closed = false;
  }
  function endRow() {
    endCell();
    records.push(row);
    row = [];
    if (records.length > 2001) throw new Error("report_too_many_rows");
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else cell += c;
    } else if (c === ",") endCell();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else if (closed) throw new Error("invalid_csv");
    else if (c === '"') {
      if (cell) throw new Error("invalid_csv");
      quoted = true;
    } else cell += c;
    if (cell.length > 20_000 || row.length > 100) throw new Error("invalid_csv");
  }
  if (quoted) throw new Error("invalid_csv");
  if (cell || row.length || closed) endRow();
  const headers = records.shift() || [];
  if (
    !headers.length ||
    headers.length > 100 ||
    headers.some((h) => !h.trim()) ||
    new Set(headers).size !== headers.length ||
    !records.length ||
    records.some((r) => r.length !== headers.length)
  )
    throw new Error("invalid_csv");
  return { headers, rows: records };
}
export function reportMoney(value: string, currency: string, format: "dot" | "comma"): number {
  const text = value.trim(),
    negative = text.startsWith("-"),
    unsigned = negative ? text.slice(1) : text;
  const valid =
    format === "dot"
      ? /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/
      : /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/;
  if (!valid.test(unsigned)) throw new Error("invalid_report_money");
  const canonical =
    format === "dot" ? unsigned.replace(/,/g, "") : unsigned.replace(/\./g, "").replace(",", ".");
  const amount = minor(canonical, currency);
  return negative ? -amount : amount;
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function previewReport(raw: ReportInput) {
  if (new TextEncoder().encode(raw.csv).length > 2_097_152) throw new Error("report_too_large");
  const input = reportSchema.parse(raw),
    { headers, rows: sourceRows } = parseCsv(input.csv),
    mapping = input.mapping;
  if (
    !validDate(input.periodFrom) ||
    !validDate(input.periodTo) ||
    input.periodFrom > input.periodTo
  )
    throw new Error("invalid_report_period");
  const mapped = Object.values(mapping).filter((x): x is string => !!x);
  if (mapped.some((h) => !headers.includes(h))) throw new Error("mapping_header_missing");
  if (new Set(mapped).size !== mapped.length) throw new Error("mapping_column_reused");
  if (!mapping.currency) throw new Error("currency_required");
  if (input.granularity === "order" && !mapping.orderId && !mapping.orderName)
    throw new Error("order_identity_required");
  if (input.granularity === "creator" && !mapping.creator) throw new Error("creator_required");
  if (!amountFields.some((f) => mapping[f])) throw new Error("amount_required");
  const warnings = new Set<string>(),
    seen = new Set<string>();
  const rows = sourceRows.map((source, index) => {
    const get = (field: ReportField) => {
      const h = mapping[field];
      return h ? source[headers.indexOf(h)].trim() || null : null;
    };
    const currency = get("currency")?.toUpperCase();
    if (!currency) throw new Error(`currency_required:row_${index + 2}`);
    reportMoney("0", currency, input.numberFormat);
    const row = Object.fromEntries(
      reportFields.map((f) => [
        f,
        f === "currency"
          ? currency
          : (amountFields as readonly string[]).includes(f)
            ? get(f) === null
              ? null
              : reportMoney(get(f)!, currency, input.numberFormat)
            : get(f),
      ]),
    ) as ReportRow;
    if (input.granularity === "order" && !row.orderId && !row.orderName)
      throw new Error(`order_identity_required:row_${index + 2}`);
    if (input.granularity === "creator" && !row.creator)
      throw new Error(`creator_required:row_${index + 2}`);
    if (input.granularity === "order") {
      const key = JSON.stringify([row.creator, row.orderId || row.orderName, currency]);
      if (seen.has(key)) warnings.add("duplicate_source_rows");
      seen.add(key);
    }
    return row;
  });
  const totals: ReportTotal[] = [...new Set(rows.map((r) => r.currency))].sort().map((currency) => {
    const group = rows.filter((r) => r.currency === currency);
    const amounts = Object.fromEntries(
      amountFields.map((field) => {
        const complete = group.every((r) => r[field] !== null);
        if (!complete && group.some((r) => r[field] !== null)) warnings.add("incomplete_amounts");
        const value = complete
          ? group.reduce((sum, r) => sum + BigInt(r[field]!), BigInt(0))
          : null;
        if (
          value !== null &&
          (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER))
        )
          throw new Error("money_overflow");
        return [field, value === null ? null : Number(value)];
      }),
    );
    return { currency, ...amounts } as ReportTotal;
  });
  return { headers, rows, totals, warnings: [...warnings] };
}
