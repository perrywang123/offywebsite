import { and, count, desc, eq, gte, inArray, lt, sql, isNotNull } from "drizzle-orm";
import type { Db } from "../kol/db";
import { metaEvents, metaOrderEvidence, metaOrderSync, checkoutAttempts } from "../db/schema";
import { evidenceRange, evidenceWhere, labelledTest, type EvidenceFilter } from "./filters";
export function evidenceOverview(db: Db, filter: EvidenceFilter, now = Date.now()) {
  const where = evidenceWhere(filter, now);
  const events = db
    .select({
      name: metaEvents.name,
      count: count(),
      browsers: sql<number>`count(distinct ${metaEvents.visitorHash})`,
      withAdId: sql<number>`sum(case when json_extract(${metaEvents.sourceJson}, '$.ad_id') IS NOT NULL then 1 else 0 end)`,
      withFbc: sql<number>`sum(${metaEvents.hasFbc})`,
      withoutCatalogId: sql<number>`sum(case when coalesce(json_array_length(json_extract(${metaEvents.dataJson}, '$.content_ids')), 0) = 0 then 1 else 0 end)`,
    })
    .from(metaEvents)
    .where(where)
    .groupBy(metaEvents.name)
    .all();
  const attempts = db
    .select({ id: metaEvents.attemptId })
    .from(metaEvents)
    .where(and(where, isNotNull(metaEvents.attemptId)));
  const orderWhere = and(
    inArray(metaOrderEvidence.attemptId, attempts),
    filter.includeTests ? undefined : eq(metaOrderEvidence.test, false),
  );
  const orders = db
    .select()
    .from(metaOrderEvidence)
    .where(orderWhere)
    .orderBy(desc(metaOrderEvidence.createdAt))
    .limit(50)
    .all();
  const orderCount = db.select({ n: count() }).from(metaOrderEvidence).where(orderWhere).get()!.n;
  const currencies = db
    .select({
      currency: metaOrderEvidence.currency,
      orders: count(),
      totalMinor: sql<number>`sum(${metaOrderEvidence.totalMinor})`,
      refundedMinor: sql<number>`sum(${metaOrderEvidence.refundedMinor})`,
    })
    .from(metaOrderEvidence)
    .where(
      and(
        orderWhere,
        eq(metaOrderEvidence.canceled, false),
        inArray(metaOrderEvidence.financialStatus, ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]),
      ),
    )
    .groupBy(metaOrderEvidence.currency)
    .all();
  const excludedTests = db
    .select({ n: count() })
    .from(metaEvents)
    .where(and(evidenceWhere({ ...filter, includeTests: true }, now), labelledTest))
    .get()!.n;
  const sync = db.select().from(metaOrderSync).where(eq(metaOrderSync.id, 1)).get();
  return {
    events,
    orders,
    currencies,
    orderCount,
    excludedTests,
    range: evidenceRange(filter, now),
    sync: sync
      ? {
          lastSuccess: sync.lastSuccess,
          lastError: sync.lastError,
          nextAt: sync.nextAt,
          scanning: !!sync.cursor,
        }
      : null,
  };
}
export function traceEvidence(
  db: Db,
  id: string,
  filter: EvidenceFilter,
  now = Date.now(),
  visitors?: string[],
) {
  const selected = db
    .select()
    .from(metaEvents)
    .where(
      and(
        eq(metaEvents.id, id),
        evidenceWhere(filter, now),
        visitors === undefined
          ? undefined
          : sql`${metaEvents.visitorHash} IN (SELECT value FROM json_each(${JSON.stringify(visitors)}))`,
      ),
    )
    .get();
  if (!selected) return null;
  const range = evidenceRange(filter, now);
  const rows = db
    .select({
      id: metaEvents.id,
      name: metaEvents.name,
      createdAt: metaEvents.createdAt,
      pagePath: metaEvents.pagePath,
      sourceJson: metaEvents.sourceJson,
      attemptId: metaEvents.attemptId,
      status: metaEvents.status,
    })
    .from(metaEvents)
    .where(
      and(
        eq(metaEvents.visitorHash, selected.visitorHash),
        gte(metaEvents.createdAt, range.from),
        lt(metaEvents.createdAt, range.to),
        filter.includeTests ? undefined : sql`NOT ${labelledTest}`,
      ),
    )
    .orderBy(desc(metaEvents.createdAt))
    .limit(51)
    .all();
  const events = rows
    .slice(0, 50)
    .reverse()
    .map(({ sourceJson, ...r }) => ({
      ...r,
      source: JSON.parse(sourceJson) as Record<string, string>,
    }));
  const ids = events.flatMap((e) => (e.attemptId ? [e.attemptId] : []));
  return {
    selectedId: id,
    events,
    truncated: rows.length > 50,
    checkouts: ids.length
      ? db
          .select({
            id: checkoutAttempts.id,
            status: checkoutAttempts.status,
            country: checkoutAttempts.country,
            error: checkoutAttempts.error,
          })
          .from(checkoutAttempts)
          .where(inArray(checkoutAttempts.id, ids))
          .all()
      : [],
    orders: ids.length
      ? db
          .select()
          .from(metaOrderEvidence)
          .where(
            and(
              inArray(metaOrderEvidence.attemptId, ids),
              filter.includeTests ? undefined : eq(metaOrderEvidence.test, false),
            ),
          )
          .all()
      : [],
  };
}
