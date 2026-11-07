import { and, gte, lte, sql } from "drizzle-orm";
import { collabsCreators, collabsLinkDaily } from "../db/schema";
import type { Db } from "../kol/db";
const DAY = 86400000;
const day = (at: number) => new Date(at).toISOString().slice(0, 10);

/** Called only after resolving an enabled link; callers isolate all observation failures. */
export function recordLinkOpen(db: Db, creatorId: string, now = Date.now()) {
  db.insert(collabsLinkDaily)
    .values({ creatorId, day: day(now), opens: 1, firstAt: now, lastAt: now })
    .onConflictDoUpdate({
      target: [collabsLinkDaily.creatorId, collabsLinkDaily.day],
      set: {
        opens: sql`${collabsLinkDaily.opens} + 1`,
        firstAt: sql`min(${collabsLinkDaily.firstAt}, ${now})`,
        lastAt: sql`max(${collabsLinkDaily.lastAt}, ${now})`,
      },
    })
    .run();
}
export function linkMetrics(db: Db, days = 30, now = Date.now()) {
  if (![7, 30, 90].includes(days)) throw new Error("invalid_metrics_period");
  const to = day(now),
    from = day(now - (days - 1) * DAY);
  const totals = db
    .select({
      id: collabsLinkDaily.creatorId,
      total: sql<number>`sum(${collabsLinkDaily.opens})`,
      firstAt: sql<number>`min(${collabsLinkDaily.firstAt})`,
      lastAt: sql<number>`max(${collabsLinkDaily.lastAt})`,
    })
    .from(collabsLinkDaily)
    .groupBy(collabsLinkDaily.creatorId)
    .all();
  const daily = db
    .select()
    .from(collabsLinkDaily)
    .where(and(gte(collabsLinkDaily.day, from), lte(collabsLinkDaily.day, to)))
    .all();
  const counts = new Map(daily.map((d) => [`${d.creatorId}:${d.day}`, d.opens]));
  const links = db
    .select()
    .from(collabsCreators)
    .all()
    .map((c) => {
      const total = totals.find((t) => t.id === c.id);
      const series = Array.from({ length: days }, (_, i) => {
        const date = day(now - (days - i - 1) * DAY);
        return {
          day: date,
          count: !total || date < day(total.firstAt) ? null : (counts.get(`${c.id}:${date}`) ?? 0),
        };
      });
      return {
        id: c.id,
        name: c.name,
        alias: c.alias,
        enabled: c.enabled,
        total: total?.total ?? 0,
        firstAt: total?.firstAt ?? null,
        lastAt: total?.lastAt ?? null,
        periodTotal: series.reduce((n, d) => n + (d.count ?? 0), 0),
        daily: series,
      };
    });
  return { days, from, to, timezone: "UTC" as const, links };
}
