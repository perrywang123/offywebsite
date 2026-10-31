import { expect, it } from "vitest";
import { checkoutRedirectUrl } from "./checkout-redirect";
it.each([
  null,
  {},
  { kind: "redirect" },
  { url: "/checkout" },
  { url: "javascript:alert(1)" },
  { url: "http://example.com" },
])("rejects missing or unsafe redirect data", (value) => {
  expect(checkoutRedirectUrl(value)).toBeUndefined();
});
it("accepts an absolute HTTPS checkout or approval target", () => {
  expect(checkoutRedirectUrl({ kind: "redirect", url: "https://shop.example/cart/c/1" })).toBe(
    "https://shop.example/cart/c/1",
  );
  expect(
    checkoutRedirectUrl({ kind: "approve", approveUrl: "https://paypal.example/approve" }),
  ).toBe("https://paypal.example/approve");
});
