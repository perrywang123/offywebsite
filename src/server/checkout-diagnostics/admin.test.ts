// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "../kol/test-db";
import { authenticate, addAdmin } from "../kol/auth";
import { createAttempt, finishAttempt } from "./store";
const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../db/client", () => ({ getDb: () => state.db }));
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: ":memory:",
    SITE_URL: "https://offy.test",
    ADMIN_ORIGIN: "https://admin.offy.test",
    KOL_INGRESS_SECRET: "test-ingress",
    OFFY_INTEGRATION_TEST: "true",
    CHECKOUT_DIAGNOSTICS_KEY: "11".repeat(32),
  },
  kolEnabled: () => true,
}));
import { diagnosticAdminGet, diagnosticAdminPost } from "./admin";
describe("diagnostic admin permissions", () => {
  beforeEach(() => {
    state.db = testDb();
  });
  it("requires trusted ingress and a valid session; reveal additionally requires origin and CSRF", async () => {
    const db = state.db as ReturnType<typeof testDb>;
    await addAdmin(db, "admin@example.com", "test-password-2026");
    const session = await authenticate(db, "admin@example.com", "test-password-2026");
    const a = createAttempt(db, {
      items: [{ code: "test", quantity: 1 }],
      locale: "en",
      pagePath: "/cart",
      country: { country: "US", source: "default", candidates: [], ipSource: null, fallback: "US" },
    });
    finishAttempt(db, a.id, {
      ok: true,
      provider: "shopify",
      redirect: { kind: "redirect", url: "https://shop.test/private?key=secret" },
    });
    expect(() =>
      diagnosticAdminGet(new Request("https://admin.offy.test/api/admin/kol/checkouts"), [
        "checkouts",
      ]),
    ).toThrow("not_found");
    const headers = {
      "x-offy-admin-ingress": "test-ingress",
      cookie: `offy_admin=${session!.token}`,
    };
    expect(() =>
      diagnosticAdminGet(
        new Request("https://admin.offy.test/api/admin/kol/checkouts", {
          headers: { "x-offy-admin-ingress": "test-ingress" },
        }),
        ["checkouts"],
      ),
    ).toThrow("login_required");
    const response = diagnosticAdminGet(
      new Request("https://admin.offy.test/api/admin/kol/checkouts", { headers }),
      ["checkouts"],
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(JSON.stringify(await response.json())).not.toContain("secret");
    expect(() =>
      diagnosticAdminPost(
        new Request("https://admin.offy.test/api/admin/kol/checkouts", { method: "POST", headers }),
        ["checkouts", a.id, "reveal"],
      ),
    ).toThrow("invalid_origin");
    const revealed = diagnosticAdminPost(
      new Request("https://admin.offy.test/api/admin/kol/checkouts", {
        method: "POST",
        headers: { ...headers, origin: "https://admin.offy.test", "x-offy-csrf": "1" },
      }),
      ["checkouts", a.id, "reveal"],
    );
    expect((await revealed.json()).checkoutUrl).toContain("key=secret");
  });
});
