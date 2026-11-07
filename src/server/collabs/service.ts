import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, lte, gte } from "drizzle-orm";
import { z } from "zod";
import { officialLink } from "@/lib/collabs/links";
import {
  previewReport,
  reportFields,
  type ReportInput,
  type ReportRow,
  type ReportTotal,
} from "@/lib/collabs/reports";
import {
  collabsCreators,
  collabsReports,
  collabsReportRows,
  collabsChecks,
  collabsReviews,
} from "../db/schema";
import type { Db } from "../kol/db";
import { audit } from "../kol/core";
import { encryptDiagnostic, diagnosticKey } from "../checkout-diagnostics/crypto";

export const creatorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  alias: z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}$/),
  creatorKey: z
    .string()
    .trim()
    .max(254)
    .nullish()
    .transform((value) => value || null),
  officialLink: z.string().max(2000),
  enabled: z.boolean(),
});
export function listCreators(db: Db) {
  return db.select().from(collabsCreators).orderBy(desc(collabsCreators.createdAt)).all();
}
export function saveCreator(
  db: Db,
  raw: z.input<typeof creatorSchema>,
  actor: string,
  siteUrl: string,
) {
  const input = creatorSchema.parse(raw),
    link = officialLink(input.officialLink, siteUrl),
    now = Date.now();
  return db.transaction((tx) => {
    const old = input.id
      ? tx.select().from(collabsCreators).where(eq(collabsCreators.id, input.id)).get()
      : undefined;
    if (input.id && !old) throw new Error("creator_missing");
    if (
      old &&
      (old.alias !== input.alias ||
        (old.creatorKey !== null && old.creatorKey !== input.creatorKey))
    )
      throw new Error("creator_identity_immutable");
    const row = {
      ...input,
      id: old?.id ?? randomUUID(),
      officialLink: link,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    };
    tx.insert(collabsCreators)
      .values(row)
      .onConflictDoUpdate({
        target: collabsCreators.id,
        set: {
          name: row.name,
          creatorKey: row.creatorKey,
          officialLink: link,
          enabled: row.enabled,
          updatedAt: now,
        },
      })
      .run();
    audit(tx, actor, "collabs.creator.save", row.id, { alias: row.alias, enabled: row.enabled });
    if (old && old.creatorKey === null && row.creatorKey !== null)
      audit(tx, actor, "collabs.creator.bind", row.id, { creatorKey: row.creatorKey });
    return row;
  });
}
function metadata(batch: typeof collabsReports.$inferSelect) {
  const { originalEncrypted: _, mappingJson, totalsJson, warningsJson, ...rest } = batch;
  void _; // encrypted source never enters the response DTO
  return {
    ...rest,
    mapping: JSON.parse(mappingJson) as ReportInput["mapping"],
    totals: JSON.parse(totalsJson) as ReportTotal[],
    warnings: JSON.parse(warningsJson) as string[],
  };
}
export function listReports(db: Db) {
  return db
    .select()
    .from(collabsReports)
    .orderBy(desc(collabsReports.createdAt))
    .limit(100)
    .all()
    .map(metadata);
}
export function reportDetail(db: Db, id: string) {
  const batch = db.select().from(collabsReports).where(eq(collabsReports.id, id)).get();
  if (!batch) throw new Error("report_missing");
  const checks = db
    .select()
    .from(collabsChecks)
    .where(eq(collabsChecks.reportId, id))
    .orderBy(desc(collabsChecks.checkedAt))
    .all()
    .map((row) => ({ ...row, ...(JSON.parse(row.dataJson) as CheckData), dataJson: undefined }));
  const reviews = checks.flatMap((c) =>
    db.select().from(collabsReviews).where(eq(collabsReviews.checkId, c.id)).all(),
  );
  return {
    ...metadata(batch),
    rows: db
      .select()
      .from(collabsReportRows)
      .where(eq(collabsReportRows.reportId, id))
      .orderBy(collabsReportRows.rowNumber)
      .all()
      .map((row) => JSON.parse(row.dataJson) as ReportRow),
    checks,
    reviews,
  };
}
export function importReport(
  db: Db,
  input: ReportInput,
  actor: string,
  options: { key?: Buffer; confirmed?: boolean; allowOverlap?: boolean; supersedes?: string } = {},
) {
  if (!options.confirmed) throw new Error("source_confirmation_required");
  const preview = previewReport(input),
    fileSha = createHash("sha256").update(input.csv).digest("hex");
  const digest = createHash("sha256")
    .update(
      JSON.stringify([
        fileSha,
        input.kind,
        input.granularity,
        input.salesBasis,
        input.periodFrom,
        input.periodTo,
        input.numberFormat,
        reportFields.map((f) => [f, input.mapping[f] ?? null]),
      ]),
    )
    .digest("hex");
  return db.transaction((tx) => {
    const duplicate = tx
      .select()
      .from(collabsReports)
      .where(eq(collabsReports.digest, digest))
      .get();
    if (duplicate) return metadata(duplicate);
    const overlap = tx
      .select()
      .from(collabsReports)
      .where(
        and(
          eq(collabsReports.status, "active"),
          eq(collabsReports.kind, input.kind),
          lte(collabsReports.periodFrom, input.periodTo),
          gte(collabsReports.periodTo, input.periodFrom),
        ),
      )
      .all();
    if (options.supersedes && !overlap.some((b) => b.id === options.supersedes))
      throw new Error("invalid_superseded_report");
    if (overlap.some((b) => b.id !== options.supersedes) && !options.allowOverlap)
      throw new Error("report_overlap_confirmation_required");
    const id = randomUUID(),
      now = Date.now();
    const batch = {
      id,
      digest,
      fileSha,
      filename: input.filename,
      kind: input.kind,
      granularity: input.granularity,
      salesBasis: input.salesBasis,
      periodFrom: input.periodFrom,
      periodTo: input.periodTo,
      mappingJson: JSON.stringify(input.mapping),
      totalsJson: JSON.stringify(preview.totals),
      warningsJson: JSON.stringify(preview.warnings),
      originalEncrypted: encryptDiagnostic(
        { csv: input.csv, numberFormat: input.numberFormat },
        options.key ?? diagnosticKey(),
        `collabs:${id}`,
      ),
      rowCount: preview.rows.length,
      status: "active",
      supersedes: options.supersedes ?? null,
      actor,
      createdAt: now,
    };
    tx.insert(collabsReports).values(batch).run();
    for (const [i, row] of preview.rows.entries())
      tx.insert(collabsReportRows)
        .values({ reportId: id, rowNumber: i + 2, dataJson: JSON.stringify(row) })
        .run();
    if (options.supersedes)
      tx.update(collabsReports)
        .set({ status: "superseded" })
        .where(eq(collabsReports.id, options.supersedes))
        .run();
    audit(tx, actor, "collabs.report.import", id, {
      fileSha,
      rows: preview.rows.length,
      supersedes: options.supersedes ?? null,
      overlapAcknowledged: !!options.allowOverlap,
    });
    return metadata(batch);
  });
}
export type OrderEvidence = {
  id: string;
  name: string;
  currency: string;
  total: number;
  merchandiseNet?: number | null;
  canceled: boolean;
  refunded: boolean;
  refundedTotal?: number;
  financialStatus: string;
};
export type Finding = { key: string; row: number | null; code: string; detail: string };
export type CheckData = {
  findings: Finding[];
  verifiedOrders: number;
  source: "shopify_admin_readonly";
  rowsChecked: number;
  complete: boolean;
  nextOffset: number | null;
  interrupted: boolean;
};
export async function reconcileReport(
  db: Db,
  id: string,
  actor: string,
  lookup: (row: ReportRow) => Promise<OrderEvidence | null>,
  chunk?: { offset: number; previousId?: string },
) {
  const batch = reportDetail(db, id),
    creators = listCreators(db),
    findings: Finding[] = [];
  const offset = chunk?.offset ?? 0,
    end = chunk ? Math.min(offset + 5, batch.rows.length) : batch.rows.length;
  let verifiedOrders = 0,
    interrupted = false,
    rowsChecked = end;
  if (offset) {
    const previous = batch.checks.find((c) => c.id === chunk?.previousId);
    if (!previous || previous.actor !== actor || previous.nextOffset !== offset)
      throw new Error("invalid_reconciliation_cursor");
    findings.push(...previous.findings);
    verifiedOrders = previous.verifiedOrders;
  }
  const add = (code: string, row: number | null, detail: string) =>
    findings.push({ key: `${row ?? "all"}:${code}`, row, code, detail });
  const pendingIdentities = creators.filter((c) => c.creatorKey === null).length;
  if (!offset && pendingIdentities)
    add(
      "creator_identity_pending",
      null,
      `${pendingIdentities} 条合作记录的报告标识待绑定，暂不进行按创作者核对；不会按姓名或推广别名猜测归属。订单核对独立进行。`,
    );
  if (!offset && batch.granularity !== "order")
    add(
      "aggregate_only",
      null,
      "源报告为汇总粒度，不能核对单笔订单或付款到账。佣金与付款金额只代表导入来源。",
    );
  if (!offset && batch.warnings.includes("duplicate_source_rows"))
    add(
      "duplicate_source_rows",
      null,
      "存在同一创作者和订单的多行，可能是重复或调整；须查看原始报告，不能直接相加结算。",
    );
  for (const [i, row] of batch.rows.slice(offset, end).entries()) {
    const line = offset + i + 2;
    if (row.creator && !creators.some((c) => c.creatorKey !== null && c.creatorKey === row.creator))
      add("creator_unmapped", line, `来源创作者 ${row.creator} 尚未关联本地合作记录。`);
    if (batch.granularity !== "order") continue;
    let order: OrderEvidence | null;
    try {
      order = await lookup(row);
    } catch {
      add(
        "shopify_unavailable",
        line,
        "Shopify 查询不可用、缺少权限或超出历史访问范围，请稍后重试；未认定订单不存在。",
      );
      interrupted = true;
      rowsChecked = offset + i + 1;
      break;
    }
    if (!order) {
      add("order_not_found", line, "在当前可访问范围内未找到唯一订单，请核对订单标识及权限。");
      continue;
    }
    if (row.orderId && row.orderId !== order.id) {
      add("order_identity_mismatch", line, "来源订单 ID 与 Shopify 不一致。");
      continue;
    }
    if (row.orderName && row.orderName !== order.name) {
      add("order_identity_mismatch", line, "来源订单号与 Shopify 不一致。");
      continue;
    }
    verifiedOrders++;
    if (order.currency !== row.currency)
      add(
        "currency_not_comparable",
        line,
        `来源 ${row.currency}，订单 ${order.currency}；未进行汇率换算或跨币种金额比较。`,
      );
    else if (row.sales !== null) {
      const expected =
        batch.salesBasis === "order-total"
          ? order.total
          : batch.salesBasis === "merchandise-net"
            ? order.merchandiseNet
            : null;
      if (expected === null || expected === undefined)
        add(
          "sales_basis_unconfirmed",
          line,
          "来源销售额口径未明确或 Shopify 无同口径值，金额暂不可核对。",
        );
      else if (expected !== row.sales)
        add(
          "sales_amount_difference",
          line,
          "当前 Shopify 同币种、同口径金额与导入报告有差异；须结合报告截止日和退款时间人工复核。",
        );
    }
    if ((order.canceled || order.refunded) && (row.commission ?? 0) > 0)
      add(
        "refunded_or_canceled_with_commission",
        line,
        "订单已退款或取消但来源仍有正佣金，可能是报告尚未更新。请在 Collabs 复核，Offy 不自动撤佣或付款。",
      );
    if (!["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.financialStatus))
      add(
        "order_payment_unconfirmed",
        line,
        `Shopify 订单支付状态 ${order.financialStatus}，不能据此确认 Collabs 已支付佣金。`,
      );
  }
  if (!offset && batch.kind !== "sales")
    add(
      "payout_not_independently_verified",
      null,
      "账单或付款状态仅来自管理员导入报告，Shopify 订单 API 不能证明创作者已到账；需与 Collabs 及 Shopify 账单逐期核对。",
    );
  const data: CheckData = {
      findings,
      verifiedOrders,
      source: "shopify_admin_readonly",
      rowsChecked,
      interrupted,
      complete: !interrupted && end === batch.rows.length,
      nextOffset: !interrupted && end < batch.rows.length ? end : null,
    },
    check = { id: randomUUID(), reportId: id, actor, checkedAt: Date.now(), ...data };
  db.transaction((tx) => {
    tx.insert(collabsChecks)
      .values({
        id: check.id,
        reportId: id,
        actor,
        checkedAt: check.checkedAt,
        dataJson: JSON.stringify(data),
      })
      .run();
    audit(tx, actor, "collabs.report.reconcile", id, {
      checkId: check.id,
      findings: findings.length,
    });
  });
  return check;
}
export function reviewFinding(
  db: Db,
  checkId: string,
  findingKey: string,
  actor: string,
  reason: string,
) {
  const text = reason.trim();
  if (!text || text.length > 1000) throw new Error("reason_required");
  const check = db.select().from(collabsChecks).where(eq(collabsChecks.id, checkId)).get();
  if (
    !check ||
    (JSON.parse(check.dataJson) as CheckData).findings.every((f) => f.key !== findingKey)
  )
    throw new Error("finding_missing");
  db.transaction((tx) => {
    tx.insert(collabsReviews)
      .values({ id: randomUUID(), checkId, findingKey, actor, reason: text, createdAt: Date.now() })
      .run();
    audit(tx, actor, "collabs.finding.review", checkId, { findingKey, reason: text });
  });
}
