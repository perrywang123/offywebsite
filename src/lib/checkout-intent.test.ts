import { afterEach, expect, it, vi } from "vitest";
import {
  preserveBagOnShopifyReturn,
  rememberCheckoutIntent,
  shopifyCheckoutReturnUrl,
} from "./checkout-intent";
afterEach(() => vi.unstubAllGlobals());
it("still preserves an explicit direct return and allows redirect when storage is blocked", () => {
  vi.stubGlobal("sessionStorage", {
    setItem() {
      throw new Error("blocked");
    },
    getItem() {
      throw new Error("blocked");
    },
  });
  expect(() => rememberCheckoutIntent("buy-now")).not.toThrow();
  expect(preserveBagOnShopifyReturn("buy-now")).toBe(true);
  expect(preserveBagOnShopifyReturn()).toBe(false);
});
it("adds the direct marker to the locale-correct return URL only for Buy Now", () => {
  expect(shopifyCheckoutReturnUrl("https://isoffy.com", "/zh/checkout/return", "buy-now")).toBe(
    "https://isoffy.com/zh/checkout/return?source=buy-now",
  );
  expect(shopifyCheckoutReturnUrl("https://isoffy.com", "/checkout/return")).toBe(
    "https://isoffy.com/checkout/return",
  );
});
