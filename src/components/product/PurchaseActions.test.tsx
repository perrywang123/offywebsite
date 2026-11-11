import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PurchaseActions } from "./PurchaseActions";

const state = vi.hoisted(() => ({
  pending: false,
  failed: false,
  blocked: null as null | { code: string }[],
  destinationChanged: false,
  startCheckout: vi.fn(),
  add: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/cart/CartProvider", () => ({ useCart: () => ({ add: state.add }) }));
vi.mock("@/components/cart/useCheckoutRedirect", () => ({ useCheckoutRedirect: () => state }));
beforeEach(() => {
  Object.assign(state, { pending: false, failed: false, blocked: null, destinationChanged: false });
  state.startCheckout.mockReset();
  state.add.mockReset();
});
const props = { code: "current", isAvailable: true, isUpcoming: false };
it("buys just the current unit, without adding to or opening the bag", () => {
  render(<PurchaseActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "buyNow" }));
  expect(state.startCheckout).toHaveBeenCalledWith([{ code: "current", quantity: 1 }]);
  expect(state.add).not.toHaveBeenCalled();
});
it("keeps Add to Bag as its existing one-unit action", () => {
  render(<PurchaseActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "addToBag" }));
  expect(state.add).toHaveBeenCalledWith("current", 1);
  expect(state.startCheckout).not.toHaveBeenCalled();
});
it("disables both buttons while redirect preparation is pending", () => {
  state.pending = true;
  render(<PurchaseActions {...props} />);
  expect(screen.getByRole("button", { name: "addToBag" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "openingCheckout" })).toBeDisabled();
});
it("offers a retry and keeps Add to Bag available on transient failure", async () => {
  state.failed = true;
  render(<PurchaseActions {...props} />);
  expect(screen.getByRole("alert")).toHaveTextContent("buyNowFailed");
  expect(screen.getByRole("button", { name: "addToBag" })).toBeEnabled();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "tryAgain" })));
  expect(state.startCheckout).toHaveBeenCalledTimes(1);
});
it.each(["blocked", "destinationChanged"])("gives a refresh action on %s", (key) => {
  if (key === "blocked") state.blocked = [{ code: "current" }];
  else state.destinationChanged = true;
  render(<PurchaseActions {...props} />);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "refreshProduct" })).toBeEnabled();
});
it("disables both actions when sold out and omits actions for upcoming", () => {
  const { rerender } = render(<PurchaseActions {...props} isAvailable={false} />);
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "outOfStock" })).toBeDisabled();
  expect(screen.getAllByRole("button").every((b) => b.hasAttribute("disabled"))).toBe(true);
  rerender(<PurchaseActions {...props} isUpcoming />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
