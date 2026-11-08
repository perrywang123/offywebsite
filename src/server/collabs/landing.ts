import { and, eq, gte, lte, lt, sql } from "drizzle-orm";
import {
  collabsCreators,
  collabsLandingDaily,
  collabsLandingReceipts,
  collabsLandingVisitors,
} from "../db/schema";
import { officialBindingKeys } from "@/lib/collabs/bindings";
import { LANDING_RETENTION_DAYS, landingSchema, type LandingInput } from "@/lib/collabs/landing";
import type { Db } from "../kol/db";
const DAY = 86400000,
  day = (at: number) => new Date(at).toISOString().slice(0, 10);
function trackingId(link: string) {
  try {
    return (
      officialBindingKeys(link)
        .find((k) => k.startsWith("dt_id="))
        ?.slice(6) ?? null
    );
  } catch {
    return null;
  }
}
export function acceptLanding(db: Db, raw: LandingInput, visitorHash: string, now = Date.now()) {
  const input = landingSchema.parse(raw);
  return db.transaction(
    (tx) => {
      if (
        !tx
          .select()
          .from(collabsCreators)
          .all()
          .some((c) => c.enabled && trackingId(c.officialLink) === input.dtId)
      )
        return { accepted: false, duplicate: false };
      if (
        !tx
          .insert(collabsLandingReceipts)
          .values({ id: input.eventId, receivedAt: now })
          .onConflictDoNothing()
          .run().changes
      )
        return { accepted: true, duplicate: true };
      const date = day(now);
      tx.insert(collabsLandingDaily)
        .values({ dtId: input.dtId, day: date, pv: 1, firstAt: now, lastAt: now })
        .onConflictDoUpdate({
          target: [collabsLandingDaily.dtId, collabsLandingDaily.day],
          set: {
            pv: sql`${collabsLandingDaily.pv} + 1`,
            firstAt: sql`min(${collabsLandingDaily.firstAt},${now})`,
            lastAt: sql`max(${collabsLandingDaily.lastAt},${now})`,
          },
        })
        .run();
      tx.insert(collabsLandingVisitors)
        .values({ dtId: input.dtId, day: date, visitorHash, lastAt: now })
        .onConflictDoUpdate({
          target: [
            collabsLandingVisitors.dtId,
            collabsLandingVisitors.day,
            collabsLandingVisitors.visitorHash,
          ],
          set: { lastAt: now },
        })
        .run();
      return { accepted: true, duplicate: false };
    },
    { behavior: "immediate" },
  );
}
export function forgetLandingVisitor(db: Db, visitorHash: string) {
  db.delete(collabsLandingVisitors)
    .where(eq(collabsLandingVisitors.visitorHash, visitorHash))
    .run();
}
export function pruneLandingData(db: Db, now = Date.now()) {
  const from = day(now - (LANDING_RETENTION_DAYS - 1) * DAY);
  db.transaction((tx) => {
    tx.delete(collabsLandingVisitors).where(lt(collabsLandingVisitors.day, from)).run();
    tx.delete(collabsLandingReceipts)
      .where(lt(collabsLandingReceipts.receivedAt, now - LANDING_RETENTION_DAYS * DAY))
      .run();
  });
}
export function landingMetrics(db: Db, days = 30, now = Date.now()) {
  if (![7, 30, 90].includes(days)) throw new Error("invalid_metrics_period");
  const to = day(now),
    from = day(now - (days - 1) * DAY);
  const indexed = db.select().from(collabsCreators).all();
  const totals = db
    .select({
      dtId: collabsLandingDaily.dtId,
      pv: sql<number>`sum(${collabsLandingDaily.pv})`,
      firstAt: sql<number>`min(${collabsLandingDaily.firstAt})`,
      lastAt: sql<number>`max(${collabsLandingDaily.lastAt})`,
    })
    .from(collabsLandingDaily)
    .groupBy(collabsLandingDaily.dtId)
    .all();
  const daily = db
    .select()
    .from(collabsLandingDaily)
    .where(and(gte(collabsLandingDaily.day, from), lte(collabsLandingDaily.day, to)))
    .all();
  const members = db
    .select({
      dtId: collabsLandingVisitors.dtId,
      day: collabsLandingVisitors.day,
      uv: sql<number>`count(distinct ${collabsLandingVisitors.visitorHash})`,
    })
    .from(collabsLandingVisitors)
    .where(and(gte(collabsLandingVisitors.day, from), lte(collabsLandingVisitors.day, to)))
    .groupBy(collabsLandingVisitors.dtId, collabsLandingVisitors.day)
    .all();
  const periods = db
    .select({
      dtId: collabsLandingVisitors.dtId,
      uv: sql<number>`count(distinct ${collabsLandingVisitors.visitorHash})`,
    })
    .from(collabsLandingVisitors)
    .where(and(gte(collabsLandingVisitors.day, from), lte(collabsLandingVisitors.day, to)))
    .groupBy(collabsLandingVisitors.dtId)
    .all();
  const ids = new Set([
    ...indexed.map((c) => trackingId(c.officialLink)).filter((id): id is string => id !== null),
    ...totals.map((t) => t.dtId),
  ]);
  const dailyByKey = new Map(daily.map((row) => [`${row.dtId}:${row.day}`, row]));
  const membersByKey = new Map(members.map((row) => [`${row.dtId}:${row.day}`, row.uv]));
  const periodsById = new Map(periods.map((row) => [row.dtId, row.uv]));
  const totalsById = new Map(totals.map((row) => [row.dtId, row]));
  const groups = [...ids].sort().map((dtId) => {
    const records = indexed.filter((c) => trackingId(c.officialLink) === dtId),
      total = totalsById.get(dtId);
    const series = Array.from({ length: days }, (_, i) => {
      const date = day(now - (days - i - 1) * DAY),
        row = dailyByKey.get(`${dtId}:${date}`);
      const unknown = !total || date < day(total.firstAt);
      return {
        day: date,
        pv: unknown ? null : (row?.pv ?? 0),
        uv: unknown ? null : (membersByKey.get(`${dtId}:${date}`) ?? 0),
      };
    });
    return {
      dtId,
      aliases: records.map((c) => c.alias).sort(),
      names: [...new Set(records.map((c) => c.name))],
      enabled: records.some((c) => c.enabled),
      totalPv: total?.pv ?? 0,
      firstAt: total?.firstAt ?? null,
      lastAt: total?.lastAt ?? null,
      periodPv: series.reduce((n, d) => n + (d.pv ?? 0), 0),
      periodUv: periodsById.get(dtId) ?? 0,
      todayPv: series.at(-1)?.pv ?? 0,
      todayUv: series.at(-1)?.uv ?? 0,
      daily: series,
    };
  });
  return {
    days,
    from,
    to,
    timezone: "UTC" as const,
    retentionDays: LANDING_RETENTION_DAYS,
    source: "offy_consented_landing" as const,
    groups,
  };
}
