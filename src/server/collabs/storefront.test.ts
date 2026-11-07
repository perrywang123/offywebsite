// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const routes = vi.hoisted(() => vi.fn());
vi.mock("@shopify/hydrogen", async (original) => ({
  ...(await original<typeof import("@shopify/hydrogen")>()),
  handleShopifyRoutes: routes,
}));
import { env } from "@/lib/env";
import {
  discountRedirect,
  getDiscount,
  trackingContext,
  isTrackingPath,
  trackingProxy,
} from "./storefront";
const old = {
  KOL_ACCOUNTING_MODE: env.KOL_ACCOUNTING_MODE,
  SHOPIFY_STORE_DOMAIN: env.SHOPIFY_STORE_DOMAIN,
  SHOPIFY_STOREFRONT_TOKEN: env.SHOPIFY_STOREFRONT_TOKEN,
  SITE_URL: env.SITE_URL,
};
afterEach(() => {
  Object.assign(env, old);
  routes.mockReset();
});
beforeEach(() => {
  env.SITE_URL = "https://isoffy.com";
});
describe("Collabs storefront integration", () => {
  it("uses the configured public origin behind the production reverse proxy", () => {
    env.SITE_URL = "https://isoffy.com";
    const ctx = trackingContext(
      new Request("http://0.0.0.0:3000/api/payments/checkout?source=bag", {
        headers: { "x-forwarded-host": "untrusted.example" },
      }),
      "US",
      "en",
    );
    const outgoing = new Headers();
    ctx.applyStorefrontRequestHeaders(outgoing);
    expect(ctx.url).toBe("https://isoffy.com/api/payments/checkout?source=bag");
    expect(outgoing.get("Sec-Shopify-Storefront-Origin")).toBe("https://isoffy.com");
  });
  it("redirects internal proxy discount requests to the public HTTPS store", () => {
    env.KOL_ACCOUNTING_MODE = "collabs";
    env.SITE_URL = "https://isoffy.com";
    const response = discountRedirect(
      new Request("http://0.0.0.0:3000/discount/MAYA?dt_id=123"),
      "MAYA",
    );
    expect(response.headers.get("location")).toBe("https://isoffy.com/?dt_id=123");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
  it("isolates tracking upstream timeouts and never forwards Offy credentials", async () => {
    env.KOL_ACCOUNTING_MODE = "collabs";
    env.SHOPIFY_STORE_DOMAIN = "offy-test.myshopify.com";
    env.SHOPIFY_STOREFRONT_TOKEN = "test";
    routes.mockRejectedValueOnce(new DOMException("upstream timed out", "TimeoutError"));
    const response = await trackingProxy(
      new Request("https://isoffy.com/__shopify/collect", {
        method: "POST",
        headers: {
          cookie: "offy_admin=private; _shopify_y=visitor",
          authorization: "private",
          "x-offy-admin-ingress": "private",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "tracking_unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    const forwarded = routes.mock.calls[0][0].request as Request;
    expect(forwarded.headers.get("authorization")).toBeNull();
    expect(forwarded.headers.get("x-offy-admin-ingress")).toBeNull();
    expect(forwarded.headers.get("cookie")).toBe(" _shopify_y=visitor".trim());
  });
  it("preserves dt_id and UTM through /discount without touching financial state", async () => {
    env.KOL_ACCOUNTING_MODE = "collabs";
    const response = discountRedirect(
      new Request(
        "https://isoffy.com/discount/MAYA?redirect=%2Fproducts&dt_id=123&utm_source=maya",
      ),
      "MAYA",
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://isoffy.com/products?dt_id=123&utm_source=maya",
    );
    expect(response.headers.get("set-cookie")).toMatch(/offy_collabs_discount=MAYA;.*HttpOnly/);
    expect(getDiscount(new Headers({ cookie: "offy_collabs_discount=MAYA" }))).toBe("MAYA");
  });
  it("rejects external and privileged discount targets", () => {
    env.KOL_ACCOUNTING_MODE = "collabs";
    for (const target of [
      "https://evil.test",
      "/admin",
      "//evil.test",
      "/discount/MAYA",
      "/%2561dmin",
    ])
      expect(
        discountRedirect(
          new Request(`https://isoffy.com/discount/MAYA?redirect=${encodeURIComponent(target)}`),
          "MAYA",
        ).status,
      ).toBe(400);
  });
  it("does not proxy arbitrary endpoints or the admin origin", () => {
    expect(isTrackingPath("/__shopify/collect")).toBe(true);
    expect(isTrackingPath("/api/2026-07/graphql.json")).toBe(true);
    expect(isTrackingPath("/api/unstable/graphql.json")).toBe(true);
    expect(isTrackingPath("/__shopify/api/unstable/graphql.json")).toBe(true);
    expect(isTrackingPath("/api/admin/kol/state")).toBe(false);
    expect(isTrackingPath("/__shopify/admin/api/2026-07/graphql.json")).toBe(false);
  });
  it("forwards Shopify consent and cookies in the checkout request context", () => {
    const ctx = trackingContext(
      new Request("https://isoffy.com/api/payments/checkout", {
        method: "POST",
        headers: { cookie: "_shopify_y=abc; offy_collabs_discount=MAYA", "sec-gpc": "1" },
      }),
      "GB",
      "en",
    );
    const headers = new Headers();
    ctx.applyStorefrontRequestHeaders(headers);
    expect(headers.get("cookie")).toContain("_shopify_y=abc");
    expect(ctx.i18n.country).toBe("GB");
    expect(ctx.i18n.language).toBe("EN");
  });
});
