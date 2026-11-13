import { and, asc, gte, inArray, lt } from "drizzle-orm";
import { analyticsMetrics, type AnalyticsMetric, type AnalyticsStage } from "@/lib/meta/analytics";
import { normalizeMetaSource } from "@/lib/meta/events";
import type { Db } from "../kol/db";
import { metaEvents, metaOrderEvidence } from "../db/schema";
import { evidenceRange, evidenceWhere, type EvidenceFilter } from "./filters";

const DAY = 86400000;
const shanghaiDay = (at: number) => new Date(at + 8 * 3600000).toISOString().slice(0, 10);
const emptyMetrics = () =>
  Object.fromEntries(analyticsMetrics.map((k) => [k, { events: 0, browsers: 0 }])) as Record<
    AnalyticsMetric,
    { events: number; browsers: number }
  >;
type Observation = {
  id: string;
  visitor: string;
  name: string;
  at: number;
  pagePath: string;
  adJson: string;
  attemptId: string | null;
  status: string;
};
type Order = typeof metaOrderEvidence.$inferSelect;
function adId(row: Observation): string | null {
  const value = normalizeMetaSource(JSON.parse(row.adJson)).ad_id;
  return typeof value === "string" && value ? value : null;
}

function cohort(rows: Observation[], orders: Map<string, Order[]>) {
  const stages: Record<AnalyticsStage, Set<string>> = {
    view: new Set(),
    content: new Set(),
    cart: new Set(),
    checkout: new Set(),
    paid: new Set(),
  };
  const visitors = new Map<string, Observation[]>();
  for (const r of rows) {
    if (!visitors.has(r.visitor)) visitors.set(r.visitor, []);
    visitors.get(r.visitor)!.push(r);
  }
  const paidOrders = new Map<string, Order>();
  for (const [visitor, events] of visitors) {
    const view = events.find((e) => e.name === "PageView");
    if (!view) continue;
    stages.view.add(visitor);
    // Component initialization can publish the product just before its own page.
    // Only that same-path, bounded inversion qualifies; absent pages stay absent.
    const product = events.find(
      (e) =>
        e.name === "ViewContent" &&
        (e.at >= view.at || (e.pagePath === view.pagePath && view.at - e.at <= 2000)),
    );
    if (!product) continue;
    stages.content.add(visitor);
    if (events.some((e) => e.name === "AddToCart" && e.at >= product.at)) stages.cart.add(visitor);
    for (const ready of events) {
      if (ready.name !== "CheckoutReady" || !ready.attemptId || ready.at < product.at) continue;
      stages.checkout.add(visitor);
      for (const order of orders.get(ready.attemptId) ?? []) {
        if (order.createdAt < ready.at) continue;
        stages.paid.add(visitor);
        paidOrders.set(order.orderId, order);
      }
    }
  }
  return {
    stages,
    paidOrders,
    funnel: {
      view: stages.view.size,
      content: stages.content.size,
      cart: stages.cart.size,
      checkout: stages.checkout.size,
      paid: stages.paid.size,
      orders: paidOrders.size,
    },
  };
}

/** Read-only, bounded by the existing 30-day/20k retained-observation policy.
 * Private stage memberships never belong in the HTTP response. */
export function readMetaAnalytics(db: Db, filter: EvidenceFilter, now = Date.now()) {
  const scope = {
    ...filter,
    name: undefined,
    status: undefined,
    stage: undefined,
    page: undefined,
  };
  const range = evidenceRange(scope, now);
  const rows = db
    .select({
      id: metaEvents.id,
      visitor: metaEvents.visitorHash,
      name: metaEvents.name,
      at: metaEvents.createdAt,
      pagePath: metaEvents.pagePath,
      adJson: metaEvents.sourceJson,
      attemptId: metaEvents.attemptId,
      status: metaEvents.status,
    })
    .from(metaEvents)
    .where(evidenceWhere(scope, now))
    .orderBy(asc(metaEvents.createdAt), asc(metaEvents.id))
    .all();
  const attempts = [
    ...new Set(
      rows.filter((r) => r.name === "CheckoutReady" && r.attemptId).map((r) => r.attemptId!),
    ),
  ];
  const orderRows = attempts.length
    ? db
        .select()
        .from(metaOrderEvidence)
        .where(
          and(
            inArray(metaOrderEvidence.attemptId, attempts),
            gte(metaOrderEvidence.createdAt, range.from),
            lt(metaOrderEvidence.createdAt, range.to),
          ),
        )
        .all()
    : [];
  const orders = new Map<string, Order[]>();
  for (const order of orderRows) {
    if (
      order.canceled ||
      (!filter.includeTests && order.test) ||
      !["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.financialStatus)
    )
      continue;
    if (!orders.has(order.attemptId)) orders.set(order.attemptId, []);
    orders.get(order.attemptId)!.push(order);
  }
  const result = cohort(rows, orders);
  const totals = emptyMetrics();
  const seen = new Map<string, Set<string>>();
  const daily = new Map<string, ReturnType<typeof emptyMetrics>>();
  for (
    let at = Date.parse(shanghaiDay(range.from) + "T00:00:00+08:00");
    at < range.to && daily.size < 31 && range.from < range.to;
    at += DAY
  )
    daily.set(shanghaiDay(at), emptyMetrics());
  const groups = new Map<string | null, Observation[]>();
  const labelled = new Set<string>();
  const capi = { total: 0, sent: 0, pending: 0, failed: 0, unconfigured: 0 };
  for (const r of rows) {
    const ad = adId(r);
    if (!groups.has(ad)) groups.set(ad, []);
    groups.get(ad)!.push(r);
    if (r.name === "PageView" && ad) labelled.add(r.visitor);
    if (r.name === "AddToCart") {
      if (r.status === "sent") capi.sent++;
      else if (["pending", "sending"].includes(r.status)) capi.pending++;
      else if (r.status === "failed") capi.failed++;
      else if (r.status === "unconfigured") capi.unconfigured++;
    }
    if (!analyticsMetrics.includes(r.name as AnalyticsMetric)) continue;
    const metric = r.name as AnalyticsMetric,
      day = shanghaiDay(r.at);
    totals[metric].events++;
    const dayMetrics = daily.get(day);
    if (dayMetrics) dayMetrics[metric].events++;
    for (const [key, counter] of [
      [metric, totals[metric]],
      [`${day}:${metric}`, dayMetrics?.[metric]],
    ] as const) {
      if (!counter) continue;
      if (!seen.has(key)) seen.set(key, new Set());
      if (!seen.get(key)!.has(r.visitor)) {
        seen.get(key)!.add(r.visitor);
        counter.browsers++;
      }
    }
  }
  capi.total = capi.sent + capi.pending + capi.failed;
  const currencies = new Map<
    string,
    { currency: string; orders: number; totalMinor: number; refundedMinor: number }
  >();
  for (const order of result.paidOrders.values()) {
    const c = currencies.get(order.currency) ?? {
      currency: order.currency,
      orders: 0,
      totalMinor: 0,
      refundedMinor: 0,
    };
    c.orders++;
    c.totalMinor += order.totalMinor;
    c.refundedMinor += order.refundedMinor;
    currencies.set(order.currency, c);
  }
  const ads = [...groups]
    .map(([adId, events]) => ({ adId, funnel: cohort(events, orders).funnel }))
    .sort((a, b) => b.funnel.view - a.funnel.view || (a.adId ?? "").localeCompare(b.adId ?? ""));
  return {
    analytics: {
      generatedAt: now,
      range,
      scope: {
        source: filter.source ?? "all",
        adId: filter.adId ?? "",
        campaignId: filter.campaignId ?? "",
        includeTests: !!filter.includeTests,
      },
      totals,
      daily: [...daily].map(([day, metrics]) => ({ day, metrics })),
      funnel: result.funnel,
      currencies: [...currencies.values()],
      ads: ads.slice(0, 20),
      adGroupCount: ads.length,
      health: { capi, labelledVisitors: labelled.size, visitBrowsers: totals.PageView.browsers },
    },
    stageVisitors: Object.fromEntries(
      Object.entries(result.stages).map(([stage, ids]) => [stage, [...ids]]),
    ) as Record<AnalyticsStage, string[]>,
  };
}
export type MetaAnalyticsData = ReturnType<typeof readMetaAnalytics>["analytics"];
