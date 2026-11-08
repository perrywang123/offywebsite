// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { testDb } from "../kol/test-db";
import { acceptEvent, claimJobs, finishJob, listMetaEvents, forgetVisitor } from "./store";
import { decryptDiagnostic } from "../checkout-diagnostics/crypto";
import { metaEvents } from "../db/schema";
describe("Meta durable outbox", () => {
  const key = randomBytes(32),
    now = Date.now();
  function event() {
    return {
      eventId: randomUUID(),
      visitorId: randomUUID(),
      name: "AddToCart" as const,
      occurredAt: now,
      pagePath: "/products/a",
      source: { utm_source: "meta" },
      data: { value: 49.9, currency: "USD" },
      consent: true as const,
      fbc: "fb.1.1234567890000.test-click",
      fbp: "fb.1.1234567890000.1234",
    };
  }
  it("deduplicates ingestion, encrypts matching data and redacts admin output", () => {
    const db = testDb(),
      input = event();
    expect(acceptEvent(db, input, { key, capi: true, origin: "https://isoffy.com", now })).toEqual({
      duplicate: false,
    });
    expect(acceptEvent(db, input, { key, capi: true, origin: "https://isoffy.com", now })).toEqual({
      duplicate: true,
    });
    const row = db.select().from(metaEvents).get()!;
    expect(row.payload).not.toContain(input.fbc);
    expect(decryptDiagnostic(row.payload!, key, row.id)).toMatchObject({
      event_id: input.eventId,
      event_name: "AddToCart",
      event_time: Math.floor(now / 1000),
    });
    expect(JSON.stringify(listMetaEvents(db, {}, now))).not.toContain(input.fbc);
    expect(JSON.stringify(listMetaEvents(db, {}, now))).not.toContain(input.visitorId);
  });
  it("leases jobs once, retries with the same ID and stops after finite attempts", () => {
    const db = testDb(),
      input = event();
    acceptEvent(db, input, { key, capi: true, origin: "https://isoffy.com", now });
    const [first] = claimJobs(db, now);
    expect(claimJobs(db, now)).toHaveLength(0);
    finishJob(db, first, { ok: false, retryable: true, error: "http_503" }, now);
    expect(claimJobs(db, now)).toHaveLength(0);
    let time = now + 3600000;
    for (let i = 0; i < 4; i++) {
      const [job] = claimJobs(db, time);
      expect(job.id).toBe(input.eventId);
      finishJob(db, job, { ok: false, retryable: true, error: "timeout" }, time);
      time += 3600000;
    }
    expect(db.select().from(metaEvents).get()?.status).toBe("failed");
    expect(claimJobs(db, time)).toHaveLength(0);
  });
  it("does not queue PageView, skips expired events and erases withdrawn visitors", () => {
    const db = testDb(),
      input = event();
    acceptEvent(
      db,
      { ...input, name: "PageView" },
      { key, capi: true, origin: "https://isoffy.com", now },
    );
    expect(claimJobs(db, now)).toHaveLength(0);
    acceptEvent(
      db,
      { ...input, eventId: randomUUID() },
      { key, capi: true, origin: "https://isoffy.com", now },
    );
    expect(claimJobs(db, now + 25 * 3600000)).toHaveLength(0);
    forgetVisitor(db, input.visitorId, key);
    expect(db.select().from(metaEvents).all()).toHaveLength(0);
  });
});
