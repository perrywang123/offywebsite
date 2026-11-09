import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { CountrySelector, CountryTrigger } from "./CountrySelector";
import { MarketProvider } from "./MarketProvider";
const cart = vi.hoisted(() => ({ count: 1 }));
vi.mock("@/components/cart/CartProvider", () => ({ useCart: () => cart }));
const countries = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
];
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.stubGlobal("fetch", vi.fn());
});
it("searches Shopify destinations, confirms explicitly and leaves the bag intact until confirmation", async () => {
  const reload = vi.fn();
  vi.mocked(fetch).mockImplementation(
    async () => new Response(JSON.stringify({ country: "GB", source: "manual", persisted: true })),
  );
  render(
    <MarketProvider
      reload={reload}
      initial={{ country: "US", source: "manual", persisted: true, countries }}
    >
      <CountryTrigger />
      <CountrySelector />
    </MarketProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Ship to/ }));
  fireEvent.change(screen.getByPlaceholderText("Search destinations"), {
    target: { value: "kingdom" },
  });
  fireEvent.click(screen.getByRole("radio", { name: /United Kingdom/ }));
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByText(/keep your OFFYs/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Switch & review bag" }));
  await waitFor(() => expect(reload).toHaveBeenCalledOnce());
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({
    mode: "select",
    country: "GB",
  });
});
it("cancel makes no request and unavailable settings offer a retry", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  render(
    <MarketProvider
      initial={{ country: "US", source: "default", persisted: true, countries: null }}
    >
      <CountryTrigger />
      <CountrySelector />
    </MarketProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Ship to/ }));
  await screen.findByText(/couldn’t load destinations/);
  expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Confirm destination" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Close destination selector" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
