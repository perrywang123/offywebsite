// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { ShopifyPaymentProvider } from "./provider";
import { cartCreate } from "./client";
import { trackingContext } from "@/server/collabs/storefront";
import { env } from "@/lib/env";

vi.mock("../../catalog/live", () => ({
  getLiveProductByCode: vi.fn(async () => ({
    name: { en: "Current", zh: "Current" },
    shopifyVariantId: "variant-current",
    isAvailable: true,
    priceCents: 3790,
    currency: "GBP",
  })),
}));
vi.mock("./client", () => ({
  cartCreate: vi.fn(async () => ({
    id: "cart-current",
    checkoutUrl: "https://shop.test/checkouts/current",
  })),
}));
beforeEach(() => vi.mocked(cartCreate).mockClear());

it("preserves direct origin in the return attribute, country, tracking and diagnostic observer", async () => {
  const context = trackingContext(
    new Request("https://isoffy.com/products/current?dt_id=123"),
    "GB",
    "en",
  );
  const diagnostics = vi.fn();
  const shopifyTracking = { context, discountCode: "CREATOR" };
  const provider = new ShopifyPaymentProvider({ configured: () => true });
  const result = await provider.createCheckout({
    intent: "buy-now",
    items: [{ code: "current", quantity: 1 }],
    locale: "en",
    country: "GB",
    diagnostics,
    shopifyTracking,
  });
  expect(result).toMatchObject({
    ok: true,
    redirect: { url: "https://shop.test/checkouts/current" },
  });
  expect(cartCreate).toHaveBeenCalledWith(
    [{ merchandiseId: "variant-current", quantity: 1 }],
    fetch,
    "en",
    "GB",
    `${env.SITE_URL}/checkout/return?source=buy-now`,
    undefined,
    diagnostics,
    shopifyTracking,
  );
  expect(diagnostics).toHaveBeenCalledWith(expect.objectContaining({ type: "catalog_checked" }));
});

it("does not change the normal bag checkout return URL", async () => {
  const provider = new ShopifyPaymentProvider({ configured: () => true });
  await provider.createCheckout({
    items: [{ code: "current", quantity: 2 }],
    locale: "en",
    country: "US",
  });
  expect(vi.mocked(cartCreate).mock.calls[0][4]).toBe(`${env.SITE_URL}/checkout/return`);
});
