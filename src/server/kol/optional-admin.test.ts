// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "./test-db";
const state = vi.hoisted(() => ({ db: null as unknown }));
const config = vi.hoisted(() => ({
  NODE_ENV: "test",
  SHOPIFY_ADMIN_TOKEN: "",
  SHOPIFY_STORE_DOMAIN: "offy-test.myshopify.com",
  SHOPIFY_API_VERSION: "2026-07",
  KOL_SIGNING_SECRET: "test-signing",
  KOL_INGRESS_SECRET: "test-ingress",
  SITE_URL: "http://offy.test",
  ADMIN_ORIGIN: "http://admin.offy.test",
  OFFY_INTEGRATION_TEST: "true",
}));
vi.mock("@/lib/env", () => ({
  env: config,
  kolEnabled: () => true,
  shopifyOrigin: () => "https://offy-test.myshopify.com",
}));
vi.mock("@/server/db/client", () => ({ getDb: () => state.db }));
import { runWorker, runtime, setRuntime } from "./sync";
import { createPartner } from "./core";
import { snapshot } from "./snapshot";
import { adminRequest } from "./shopify";
import { addAdmin } from "./auth";
import { kolCodeJobs, kolInbox, kolLoginLimits } from "../db/schema";
import { GET, POST } from "@/app/api/admin/kol/[[...path]]/route";
let db: ReturnType<typeof testDb>;
beforeEach(() => {
  db = testDb();
  state.db = db;
  config.SHOPIFY_ADMIN_TOKEN = "";
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unexpected_network")));
});
afterEach(() => {
  db.$client.close();
  vi.unstubAllGlobals();
});
describe("optional manually supplied Shopify Admin token", () => {
  it.each(["", "   "])(
    "pauses remote tasks and keeps local maintenance for token %j",
    async (token) => {
      config.SHOPIFY_ADMIN_TOKEN = token;
      const now = Date.now();
      const p = createPartner(
        db,
        {
          name: "Local partner",
          alias: "local",
          platform: "IG",
          socialUrl: "https://example.com/local",
          email: "local@example.com",
          rate: "7",
          startsAt: "2026-01-01",
          endsAt: "2027-01-01",
          target: "/products",
          status: "active",
        },
        "test",
        now,
      );
      db.insert(kolInbox)
        .values({
          id: "queued",
          orderId: "gid://shopify/Order/1",
          topic: "orders/paid",
          status: "queued",
          nextAt: now,
          createdAt: now,
        })
        .run();
      db.insert(kolCodeJobs)
        .values({
          id: "code",
          kolId: p.id,
          candidate: "LOCAL-TEST",
          campaignId: "campaign",
          status: "queued",
          nextAt: now,
          createdAt: now,
        })
        .run();
      db.insert(kolLoginLimits)
        .values({ key: "expired", attempts: 1, resetsAt: now - 1 })
        .run();
      const scan = { since: "2026-10-01", after: "cursor", startedAt: now - 1000, nextAt: now };
      setRuntime(db, "scan", scan);
      setRuntime(db, "lastFullScan", now - 60000);
      setRuntime(db, "worker", { at: now - 1000, error: "shopify_admin_graphql_error" });
      await expect(runWorker(db, now)).resolves.toMatchObject({
        ok: true,
        shopify: "not_configured",
      });
      expect(fetch).not.toHaveBeenCalled();
      expect(db.select().from(kolInbox).get()).toMatchObject({ status: "queued", attempts: 0 });
      expect(db.select().from(kolCodeJobs).get()).toMatchObject({ status: "queued", attempts: 0 });
      expect(db.select().from(kolLoginLimits).all()).toEqual([]);
      expect(runtime(db, "scan")).toEqual(scan);
      expect(runtime(db, "lastFullScan")).toBe(now - 60000);
      expect(runtime(db, "worker")).toMatchObject({
        at: now,
        error: null,
        shopify: "not_configured",
      });
      expect(runtime(db, "workerLease")).toBe(0);
      expect(snapshot(db).health).toMatchObject({ shopifyAdminConfigured: false });
      expect(snapshot(db).partners).toHaveLength(1);
      await expect(adminRequest("query { orders(first:1){nodes{id}} }")).rejects.toThrow(
        "shopify_admin_not_configured",
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("permits login, local state and diagnostics but fails explicit remote operations", async () => {
    await addAdmin(db, "local@example.com", "local-test-password-only");
    const headers: Record<string, string> = {
      "x-offy-admin-ingress": "test-ingress",
      origin: config.ADMIN_ORIGIN,
      "x-offy-csrf": "1",
      "content-type": "application/json",
    };
    const ctx = (path: string) => ({ params: Promise.resolve({ path: [path] }) });
    const req = (path: string, body?: unknown) =>
      new Request(`${config.ADMIN_ORIGIN}/api/admin/kol/${path}`, {
        headers,
        method: body === undefined ? "GET" : "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    const login = await POST(
      req("login", { email: "local@example.com", password: "local-test-password-only" }),
      ctx("login"),
    );
    expect(login.status).toBe(200);
    headers.cookie = login.headers.get("set-cookie")!.split(";")[0];
    const local = await GET(req("state"), ctx("state"));
    expect(local.status).toBe(200);
    expect((await local.json()).health.shopifyAdminConfigured).toBe(false);
    expect((await GET(req("checkouts"), ctx("checkouts"))).status).toBe(200);
    for (const path of ["connection", "sync"]) {
      const result =
        path === "sync" ? await POST(req(path, {}), ctx(path)) : await GET(req(path), ctx(path));
      expect(result.status).toBe(409);
      expect(await result.json()).toMatchObject({ error: "shopify_admin_not_configured" });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("resumes a paused scan using the manually injected token", async () => {
    const now = Date.now();
    config.SHOPIFY_ADMIN_TOKEN = "test-manual-admin-token";
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        data: { orders: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } },
      }),
    );
    setRuntime(db, "worker", { at: now - 1000, error: null, shopify: "not_configured" });
    await expect(runWorker(db, now)).resolves.toMatchObject({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({
      "X-Shopify-Access-Token": "test-manual-admin-token",
    });
    expect(runtime(db, "lastFullScan")).toBe(now);
    expect(snapshot(db).health).toMatchObject({ shopifyAdminConfigured: true });
  });
  it("keeps configured-token permission errors visible instead of fabricating a successful scan", async () => {
    config.SHOPIFY_ADMIN_TOKEN = "test-insufficient-admin-token";
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        errors: [{ message: "Access denied", extensions: { code: "ACCESS_DENIED" } }],
      }),
    );
    await expect(runWorker(db)).rejects.toThrow("shopify_admin_graphql_error");
    expect(runtime(db, "worker").error).toBe("shopify_admin_graphql_error");
    expect(runtime(db, "lastFullScan")).toBeNull();
    expect(runtime(db, "workerLease")).toBe(0);
  });
});
