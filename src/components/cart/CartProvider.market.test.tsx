import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const market = vi.hoisted(() => ({
  ready: true,
  state: { country: "GB" },
  reloadDestination: vi.fn(),
}));
vi.mock("@/components/market/MarketProvider", () => ({ useOptionalMarket: () => market }));
import { CartProvider, useCart } from "./CartProvider";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
});
it("preserves bag identities and reloads for review instead of showing another market's catalog", async () => {
  localStorage.setItem("offy.cart.v1", JSON.stringify([{ code: "wild", quantity: 2 }]));
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "destination_changed" }), { status: 409 }),
      ),
  );
  function Probe() {
    const bag = useCart();
    return (
      <div>
        {JSON.stringify({ lines: bag.lines, status: bag.catalogStatus, catalog: bag.catalog })}
      </div>
    );
  }
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  await waitFor(() => expect(market.reloadDestination).toHaveBeenCalledWith(true));
  expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toEqual({ "X-Offy-Expected-Country": "GB" });
  expect(screen.getByText(/"status":"unavailable"/)).toHaveTextContent(
    '"lines":[{"code":"wild","quantity":2}]',
  );
  expect(screen.getByText(/"status":"unavailable"/)).toHaveTextContent('"catalog":{}');
  expect(JSON.parse(localStorage.getItem("offy.cart.v1")!)).toEqual([
    { code: "wild", quantity: 2 },
  ]);
});
