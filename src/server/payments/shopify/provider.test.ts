// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { ShopifyPaymentProvider } from "./provider";

const MOTARO_VARIANT = "gid://shopify/ProductVariant/53491815579937";

describe("ShopifyPaymentProvider.createCheckout", () => {
  it("creates a Shopify cart and returns the checkoutUrl as a redirect", async () => {
    const createCart = vi.fn().mockResolvedValue({
      id: "gid://shopify/Cart/abc",
      checkoutUrl: "https://ujc6x6-41.myshopify.com/cart/c/abc?key=k",
    });
    const provider = new ShopifyPaymentProvider({ createCart, configured: () => true });

    // offy_redrush is mapped to the MOTARO variant in the catalog.
    const result = await provider.createCheckout({
      items: [{ code: "offy_redrush", quantity: 2 }],
      locale: "en",
    });

    expect(result).toEqual({
      ok: true,
      provider: "shopify",
      redirect: { kind: "redirect", url: "https://ujc6x6-41.myshopify.com/cart/c/abc?key=k" },
    });
    expect(createCart).toHaveBeenCalledWith([{ merchandiseId: MOTARO_VARIANT, quantity: 2 }]);
  });

  it("returns 400 invalid_items for an unknown product", async () => {
    const provider = new ShopifyPaymentProvider({ createCart: vi.fn(), configured: () => true });
    const result = await provider.createCheckout({ items: [{ code: "NOPE", quantity: 1 }], locale: "en" });
    expect(result).toEqual({ ok: false, status: 400, error: "invalid_items" });
  });

  it("returns 400 invalid_items when a product has no Shopify variant mapping", async () => {
    // PCOF1-A3 has no shopifyVariantId.
    const createCart = vi.fn();
    const provider = new ShopifyPaymentProvider({ createCart, configured: () => true });
    const result = await provider.createCheckout({ items: [{ code: "PCOF1-A3", quantity: 1 }], locale: "en" });
    expect(result).toEqual({ ok: false, status: 400, error: "invalid_items" });
    expect(createCart).not.toHaveBeenCalled();
  });

  it("returns 503 when Shopify is not configured", async () => {
    const provider = new ShopifyPaymentProvider({ createCart: vi.fn(), configured: () => false });
    const result = await provider.createCheckout({ items: [{ code: "offy_redrush", quantity: 1 }], locale: "en" });
    expect(result).toEqual({ ok: false, status: 503, error: "shopify_unavailable" });
  });

  it("returns 502 shopify_error when the Storefront API call fails", async () => {
    const createCart = vi.fn().mockRejectedValue(new Error("boom"));
    const provider = new ShopifyPaymentProvider({ createCart, configured: () => true });
    const result = await provider.createCheckout({ items: [{ code: "offy_redrush", quantity: 1 }], locale: "en" });
    expect(result).toEqual({ ok: false, status: 502, error: "shopify_error" });
  });
});

describe("ShopifyPaymentProvider.capture / parseCallback", () => {
  it("capture is a no-op (order owned by Shopify)", async () => {
    const provider = new ShopifyPaymentProvider({ configured: () => true });
    const result = await provider.capture();
    expect(result).toEqual({ ok: false, status: 409, error: "not_supported" });
  });

  it("parseCallback returns null", async () => {
    const provider = new ShopifyPaymentProvider({ configured: () => true });
    const result = await provider.parseCallback();
    expect(result).toBeNull();
  });
});
