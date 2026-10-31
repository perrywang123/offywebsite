// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("../catalog/live", () => ({
  getLiveProductByCode: vi.fn().mockRejectedValue(new Error("timeout")),
}));
import { ShopifyPaymentProvider } from "./shopify/provider";
import { PayPalPaymentProvider } from "./paypal/provider";
import { createCheckoutSession } from "../checkout/create-checkout-session";
it("all payment paths fail closed before creating a cart/order/session", async () => {
  const createCart = vi.fn();
  const input = {
    items: [{ code: "swan-princess", quantity: 1 }],
    locale: "en" as const,
    country: "US",
  };
  expect(
    await new ShopifyPaymentProvider({ configured: () => true, createCart }).createCheckout(input),
  ).toMatchObject({ ok: false, status: 503, error: "catalog_unavailable" });
  expect(createCart).not.toHaveBeenCalled();
  expect(await new PayPalPaymentProvider().createCheckout(input)).toMatchObject({
    ok: false,
    status: 503,
    error: "catalog_unavailable",
  });
  expect(await createCheckoutSession(input.items, "en")).toMatchObject({
    ok: false,
    status: 503,
    error: "catalog_unavailable",
  });
});
