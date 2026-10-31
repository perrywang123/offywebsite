import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "./CartProvider";
function Probe() {
  const c = useCart();
  return (
    <>
      <p data-testid="status">{c.catalogStatus}</p>
      <p data-testid="catalog">{JSON.stringify(c.catalog)}</p>
      <p data-testid="lines">{JSON.stringify(c.lines)}</p>
      <button onClick={() => void c.refresh()}>retry</button>
      <button onClick={() => c.add("added", 1)}>add</button>
      <button onClick={c.clear}>clear</button>
    </>
  );
}
const p = {
  code: "saved",
  name: { en: "Live", zh: "Live" },
  images: [],
  price: { amountCents: 99, currency: "GBP" },
  available: true,
};
const ok = () => ({ ok: true, json: async () => ({ products: [p] }) }) as Response;
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
it("preserves saved codes on error, hides old catalog and recovers on retry", async () => {
  localStorage.setItem("offy.cart.v1", JSON.stringify([{ code: "saved", quantity: 2 }]));
  const f = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce(ok())
    .mockResolvedValueOnce({ ok: false, status: 503 });
  vi.stubGlobal("fetch", f);
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unavailable"));
  expect(screen.getByTestId("lines")).toHaveTextContent('"saved"');
  fireEvent.click(screen.getByText("retry"));
  await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));
  expect(screen.getByTestId("catalog")).toHaveTextContent("GBP");
  fireEvent.click(screen.getByText("retry"));
  await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unavailable"));
  expect(screen.getByTestId("catalog")).toHaveTextContent("{}");
});
it("does not restore lines cleared while a refresh is pending", async () => {
  localStorage.setItem("offy.cart.v1", JSON.stringify([{ code: "saved", quantity: 2 }]));
  let resolve!: (v: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    ),
  );
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  fireEvent.click(screen.getByText("clear"));
  await act(async () => resolve(ok()));
  expect(screen.getByTestId("lines")).toHaveTextContent("[]");
  expect(localStorage.getItem("offy.cart.v1")).toBe("[]");
});
it("a failed individual verification keeps the whole bag unverified", async () => {
  localStorage.setItem("offy.cart.v1", JSON.stringify([{ code: "missing", quantity: 1 }]));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce({ ok: false, status: 503 }),
  );
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unavailable"));
  expect(screen.getByTestId("lines")).toHaveTextContent("missing");
  expect(screen.getByTestId("catalog")).toHaveTextContent("{}");
});
