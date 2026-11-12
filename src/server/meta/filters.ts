import { and, eq, gte, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { metaEvents } from "../db/schema";
import { eventNames } from "@/lib/meta/events";
const DAY = 86400000;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const ms = Date.parse(s + "T00:00:00Z");
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s;
  });
export const evidenceFilterSchema = z.object({
  name: z.enum(eventNames).optional(),
  status: z
    .enum(["observed", "unconfigured", "pending", "sending", "sent", "failed", "suppressed"])
    .optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  from: date.optional(),
  to: date.optional(),
  campaignId: z
    .string()
    .regex(/^\d{1,30}$/)
    .optional(),
  adId: z
    .string()
    .regex(/^\d{1,30}$/)
    .optional(),
  includeTests: z.preprocess((v) => v === true || v === "true", z.boolean()).optional(),
});
export type EvidenceFilter = z.infer<typeof evidenceFilterSchema>;
export function evidenceRange(filter: EvidenceFilter, now: number) {
  const today = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
  const dayStart = Date.parse(today + "T00:00:00+08:00");
  return {
    from: Math.max(
      now - 30 * DAY,
      filter.from ? Date.parse(filter.from + "T00:00:00+08:00") : dayStart - 6 * DAY,
    ),
    to: Math.min(
      now + 1,
      filter.to ? Date.parse(filter.to + "T00:00:00+08:00") + DAY : dayStart + DAY,
    ),
    timeZone: "Asia/Shanghai" as const,
  };
}
export const labelledTest = sql<boolean>`(lower(coalesce(json_extract(${metaEvents.sourceJson}, '$.utm_source'), '')) = 'offy_validation' OR lower(coalesce(json_extract(${metaEvents.sourceJson}, '$.utm_medium'), '')) = 'internal_test')`;
export function evidenceWhere(filter: EvidenceFilter, now: number) {
  const range = evidenceRange(filter, now);
  return and(
    filter.name ? eq(metaEvents.name, filter.name) : undefined,
    filter.status ? eq(metaEvents.status, filter.status) : undefined,
    filter.campaignId
      ? sql`json_extract(${metaEvents.sourceJson}, '$.campaign_id') = ${filter.campaignId}`
      : undefined,
    filter.adId
      ? sql`json_extract(${metaEvents.sourceJson}, '$.ad_id') = ${filter.adId}`
      : undefined,
    filter.includeTests ? undefined : sql`NOT ${labelledTest}`,
    gte(metaEvents.createdAt, range.from),
    lt(metaEvents.createdAt, range.to),
    lte(metaEvents.createdAt, now),
  );
}
