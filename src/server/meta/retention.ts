import { and, gte, isNotNull, lt, notInArray } from "drizzle-orm";
import type { Db } from "../kol/db";
import { metaEvents, metaOrderEvidence } from "../db/schema";
/** Also run without Shopify credentials, so order evidence cannot outlive consented observations. */
export function pruneOrderEvidence(db: Db, now = Date.now()) {
  const retained = db
    .select({ id: metaEvents.attemptId })
    .from(metaEvents)
    .where(and(isNotNull(metaEvents.attemptId), gte(metaEvents.createdAt, now - 30 * 86400000)));
  db.delete(metaOrderEvidence).where(notInArray(metaOrderEvidence.attemptId, retained)).run();
  db.delete(metaOrderEvidence)
    .where(lt(metaOrderEvidence.createdAt, now - 30 * 86400000))
    .run();
}
