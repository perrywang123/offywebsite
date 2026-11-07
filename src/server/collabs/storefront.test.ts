// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { discountRedirect, getDiscount, trackingContext, isTrackingPath } from "./storefront";
const old = env.KOL_ACCOUNTING_MODE;
afterEach(() => {
  env.KOL_ACCOUNTING_MODE = old;
});
describe("Collabs storefront integration", () => {
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
