import { render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ClearCartOnSuccess } from "./ClearCart";
import { rememberCheckoutIntent } from "@/lib/checkout-intent";
const clear = vi.hoisted(() => vi.fn());
vi.mock("./CartProvider", () => ({ useCart: () => ({ clear }) }));
beforeEach(() => {
  clear.mockClear();
  sessionStorage.clear();
});
it("preserves the bag for an explicit Buy Now return, even without storage", () => {
  render(<ClearCartOnSuccess shopifyReturn source="buy-now" />);
  expect(clear).not.toHaveBeenCalled();
});
it("preserves a direct-purchase bag if merchant return configuration omits the query", () => {
  rememberCheckoutIntent("buy-now");
  render(<ClearCartOnSuccess shopifyReturn />);
  expect(clear).not.toHaveBeenCalled();
});
it("normal bag checkout replaces a previous direct marker and still clears", () => {
  rememberCheckoutIntent("buy-now");
  rememberCheckoutIntent("cart");
  render(<ClearCartOnSuccess shopifyReturn />);
  expect(clear).toHaveBeenCalledTimes(1);
});
it("legacy success still clears regardless of previous Shopify direct checkout", () => {
  rememberCheckoutIntent("buy-now");
  render(<ClearCartOnSuccess />);
  expect(clear).toHaveBeenCalledTimes(1);
});
