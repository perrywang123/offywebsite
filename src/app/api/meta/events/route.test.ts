// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "@/server/kol/test-db";
import { randomUUID } from "node:crypto";
const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/env", () => ({
  env: { SITE_URL: "http://localhost:3000", DATABASE_URL: ":memory:" },
}));
vi.mock("@/server/meta/config", () => ({ metaConfig: () => ({ enabled: true, capi: true }) }));
vi.mock("@/server/meta/runtime", () => ({
  getMetaDb: () => state.db,
  receiptAttempt: () => undefined,
}));
import { POST, DELETE } from "./route";
import { metaEvents } from "@/server/db/schema";
describe("Meta ingestion boundary", () => {
  beforeEach(() => {
    state.db = testDb();
  });
  const event = () => ({
    eventId: randomUUID(),
    visitorId: randomUUID(),
    name: "AddToCart",
    occurredAt: Date.now(),
    pagePath: "/cart",
    source: {},
    data: {},
    consent: true,
  });
  function request(input: unknown, extra: Record<string, string> = {}, method = "POST") {
    return new Request("http://localhost:3000/api/meta/events", {
      method,
      headers: { origin: "http://localhost:3000", "Content-Type": "application/json", ...extra },
      body: JSON.stringify(input),
    });
  }
  it("rejects cross-site, unknown fields, purchase and oversize payloads", async () => {
    expect((await POST(request(event(), { origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(request({ ...event(), name: "Purchase" }))).status).toBe(400);
    expect((await POST(request({ ...event(), email: "private@example.com" }))).status).toBe(400);
    expect((await POST(request(event(), { "content-length": "13000" }))).status).toBe(400);
  });
  it("honors GPC and deletes only a matching visitor cookie", async () => {
    const input = event();
    expect((await POST(request(input, { "sec-gpc": "1" }))).status).toBe(204);
    expect((state.db as ReturnType<typeof testDb>).select().from(metaEvents).all()).toHaveLength(0);
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    expect((await POST(request(input))).status).toBe(200);
    expect((state.db as ReturnType<typeof testDb>).select().from(metaEvents).all()).toHaveLength(1);
    expect((await DELETE(request({ visitorId: input.visitorId }, {}, "DELETE"))).status).toBe(403);
    expect(
      (
        await DELETE(
          request(
            { visitorId: input.visitorId },
            { cookie: response.headers.get("set-cookie")!.split(";")[0] },
            "DELETE",
          ),
        )
      ).status,
    ).toBe(204);
    expect((state.db as ReturnType<typeof testDb>).select().from(metaEvents).all()).toHaveLength(0);
  });
  it("returns an isolated tracking failure when storage is unavailable", async () => {
    state.db = null;
    expect((await POST(request(event()))).status).toBe(503);
  });
});
