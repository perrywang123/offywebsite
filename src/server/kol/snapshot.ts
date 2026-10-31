import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "./db";
import * as t from "../db/schema";
import { currentTerms, type Cooperation } from "./core";
import { runtime } from "./sync";
export function snapshot(db: Db) {
  const partners = db
    .select()
    .from(t.kolPartners)
    .orderBy(desc(t.kolPartners.createdAt))
    .all()
    .map((p) => {
      const terms = currentTerms(db, p.id)!;
      const metrics = db
        .select({
          currency: t.kolShopOrders.currency,
          net: sql<number>`coalesce(sum(${t.kolShopOrders.net}),0)`,
          commission: sql<number>`coalesce(sum(${t.kolShopOrders.commission}),0)`,
          orders: sql<number>`count(*)`,
          sessions: sql<number>`count(distinct ${t.kolIntents.referralId})`,
        })
        .from(t.kolShopOrders)
        .leftJoin(t.kolIntents, eq(t.kolIntents.id, t.kolShopOrders.intentId))
        .where(sql`${t.kolShopOrders.kolId}=${p.id} AND ${t.kolShopOrders.status}='verified'`)
        .groupBy(t.kolShopOrders.currency)
        .all();
      return {
        ...p,
        terms: JSON.parse(terms.data) as Cooperation,
        rateBps: terms.rateBps,
        metrics,
      };
    });
  const orders = db
    .select()
    .from(t.kolShopOrders)
    .orderBy(desc(t.kolShopOrders.checkedAt))
    .limit(500)
    .all();
  return {
    partners,
    codes: db.select().from(t.kolCodes).all(),
    jobs: db.select().from(t.kolCodeJobs).orderBy(desc(t.kolCodeJobs.createdAt)).limit(200).all(),
    orders,
    settlements: db
      .select()
      .from(t.kolSettlements)
      .orderBy(desc(t.kolSettlements.createdAt))
      .limit(200)
      .all(),
    balances: db
      .select({
        kolId: t.kolLedger.kolId,
        currency: t.kolLedger.currency,
        amount: sql<number>`coalesce(sum(${t.kolLedger.amount}),0)`,
      })
      .from(t.kolLedger)
      .leftJoin(t.kolSettlementItems, eq(t.kolSettlementItems.ledgerId, t.kolLedger.id))
      .where(sql`${t.kolSettlementItems.ledgerId} IS NULL`)
      .groupBy(t.kolLedger.kolId, t.kolLedger.currency)
      .all(),
    audit: db.select().from(t.kolAudit).orderBy(desc(t.kolAudit.createdAt)).limit(100).all(),
    health: {
      worker: runtime(db, "worker"),
      lastFullScan: runtime(db, "lastFullScan"),
      attributionError: runtime(db, "attributionError"),
      inbox: db
        .select({ status: t.kolInbox.status, count: sql<number>`count(*)` })
        .from(t.kolInbox)
        .groupBy(t.kolInbox.status)
        .all(),
      failures: db
        .select({ id: t.kolInbox.id, error: t.kolInbox.error, attempts: t.kolInbox.attempts })
        .from(t.kolInbox)
        .where(eq(t.kolInbox.status, "retry"))
        .limit(10)
        .all(),
    },
    truncated: orders.length === 500,
  };
}
export type Snapshot = ReturnType<typeof snapshot>;
