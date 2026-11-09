import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MarketContent, MarketProvider } from "./MarketProvider";
import { persistDestination } from "./client";
vi.mock("./client", () => ({ persistDestination: vi.fn() }));
afterEach(() => vi.resetAllMocks());
it("gates weak initial commercial content then reloads the same URL if browser resolution changes destination", async () => {
  const reload = vi.fn();
  let resolve!: (value: Awaited<ReturnType<typeof persistDestination>>) => void;
  vi.mocked(persistDestination).mockReturnValue(new Promise((r) => (resolve = r)));
  render(
    <MarketProvider
      reload={reload}
      initial={{ country: "US", source: "default", persisted: false, countries: null }}
    >
      <MarketContent>Shop</MarketContent>
    </MarketProvider>,
  );
  expect(screen.getByText("Shop").closest(".destination-content")).toHaveAttribute(
    "data-destination-pending",
    "true",
  );
  resolve({ country: "GB", source: "timezone", persisted: true });
  await waitFor(() => expect(reload).toHaveBeenCalledOnce());
});
it("releases content on failed cookie/bootstrap requests and never reloads in a loop", async () => {
  vi.mocked(persistDestination).mockRejectedValue(new Error("cookies blocked"));
  const reload = vi.fn();
  render(
    <MarketProvider
      reload={reload}
      initial={{ country: "US", source: "default", persisted: false, countries: null }}
    >
      <MarketContent>Shop</MarketContent>
    </MarketProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText("Shop").closest(".destination-content")).toHaveAttribute(
      "data-destination-pending",
      "false",
    ),
  );
  expect(reload).not.toHaveBeenCalled();
});
it("uses a saved decision without IP or browser re-evaluation", () => {
  render(
    <MarketProvider initial={{ country: "US", source: "manual", persisted: true, countries: null }}>
      <MarketContent>Shop</MarketContent>
    </MarketProvider>,
  );
  expect(persistDestination).not.toHaveBeenCalled();
  expect(screen.getByText("Shop").closest(".destination-content")).toHaveAttribute(
    "data-destination-pending",
    "false",
  );
});
