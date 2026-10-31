// @vitest-environment node
import { describe, expect, it } from "vitest";
import { testDb } from "./test-db";
import { createPartner } from "./core";
import { bindExistingCode, queueCode, processCodeJob, type CodeGateway } from "./codes";
import { kolCodes, kolCodeJobs } from "../db/schema";
const now = Date.parse("2026-10-31"),
  shop = "offy-test.myshopify.com";
function setup() {
  const db = testDb();
  const p = createPartner(
    db,
    {
      name: "Maya",
      alias: "maya",
      platform: "IG",
      socialUrl: "https://instagram.com/maya",
      email: "maya@example.com",
      rate: "12",
      startsAt: "2026-01-01",
      endsAt: "2027-01-01",
      target: "/products",
      status: "active",
    },
    "a",
    now,
  );
  return { db, p };
}
const remote = (code: string) => ({
  id: "campaignA",
  code,
  status: "ACTIVE",
  summary: "Shopify规则",
  title: "Fans",
});
function gateway(): CodeGateway {
  const codes = new Map<string, ReturnType<typeof remote>>();
  return {
    shop,
    scopes: async () => ["read_discounts", "write_discounts"],
    lookup: async (c) => codes.get(c) ?? null,
    campaign: async () => ({
      id: "campaignA",
      type: "DiscountCodeBasic",
      status: "ACTIVE",
      summary: "Fans",
      title: "Fans",
    }),
    add: async (_id, c) => {
      codes.set(c, remote(c));
      return "jobA";
    },
    poll: async () => ({ done: true, failedCount: 0, codes: [{ code: "MAYA10", errors: [] }] }),
  };
}
describe("two Shopify code methods", () => {
  it("binds only remotely verified codes and reserves historical ownership case-insensitively", async () => {
    const { db, p } = setup(),
      g = gateway();
    g.lookup = async (c) => (c === "MAYA10" ? remote(c) : null);
    await expect(bindExistingCode(db, p.id, "unknown", g, "admin", now)).rejects.toThrow(
      "code_not_found",
    );
    await bindExistingCode(db, p.id, "maya10", g, "admin", now);
    expect(db.select().from(kolCodes).get()?.normalized).toBe("MAYA10");
  });
  it("persists operation before remote request and confirms async result/readback before distribution", async () => {
    const { db, p } = setup(),
      g = gateway();
    const job = await queueCode(db, p.id, "campaignA", "maya10", g, "a", now);
    expect(db.select().from(kolCodes).all()).toHaveLength(0);
    await processCodeJob(db, job.id, g, now);
    expect(db.select().from(kolCodes).all()).toHaveLength(0);
    await processCodeJob(db, job.id, g, now + 10000);
    expect(db.select().from(kolCodes).get()?.status).toBe("bound");
    expect(db.select().from(kolCodeJobs).get()?.status).toBe("bound");
  });
  it("reconciles a lost creation response without blindly issuing another code", async () => {
    const { db, p } = setup(),
      g = gateway();
    let calls = 0,
      created = false;
    g.add = async () => {
      calls++;
      created = true;
      throw new Error("network_timeout");
    };
    g.lookup = async (c) => (created ? remote(c) : null);
    const job = await queueCode(db, p.id, "campaignA", "MAYA10", g, "a", now);
    await processCodeJob(db, job.id, g, now);
    expect(db.select().from(kolCodeJobs).get()?.status).toBe("uncertain");
    await processCodeJob(db, job.id, g, now + 10000);
    expect(calls).toBe(1);
    expect(db.select().from(kolCodes).get()?.normalized).toBe("MAYA10");
  });
  it("blocks writes without scope and preserves the old code while a new task fails", async () => {
    const { db, p } = setup(),
      g = gateway();
    g.scopes = async () => ["read_discounts"];
    await expect(queueCode(db, p.id, "campaignA", "MAYA10", g, "a", now)).rejects.toThrow(
      "write_discounts_required",
    );
  });
});
