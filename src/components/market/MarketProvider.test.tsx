import { render, screen, waitFor } from "@testing-library/react";
import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MarketContent, MarketProvider, useOptionalMarket } from "./MarketProvider";
import { persistDestination } from "./client";
vi.mock("./client", () => ({ persistDestination: vi.fn() }));
const navigation = vi.hoisted(() => ({ path: "/products", query: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.path,
  useSearchParams: () => new URLSearchParams(navigation.query),
}));
beforeEach(() => {
  navigation.path = "/products";
  navigation.query = "";
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
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

it("reloads an expired established automatic context on visibility return even if its country is unchanged", async () => {
  const reload = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ country: "GB", source: "ip", persisted: false })),
      ),
  );
  render(
    <MarketProvider
      reload={reload}
      initial={{
        country: "GB",
        source: "ip",
        resolvedAt: Date.now(),
        persisted: true,
        countries: null,
      }}
    >
      Shop
    </MarketProvider>,
  );
  fireEvent(document, new Event("visibilitychange"));
  await waitFor(() => expect(reload).toHaveBeenCalledOnce());
});

it.each(["route", "query"])(
  "checks expiry after %s navigation while App Router preserves the provider",
  async (kind) => {
    const reload = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ country: "SG", source: "ip", persisted: false })),
        ),
    );
    const initial = {
      country: "GB",
      source: "ip" as const,
      resolvedAt: Date.now(),
      persisted: true,
      countries: null,
    };
    const view = render(
      <MarketProvider reload={reload} initial={initial}>
        Shop
      </MarketProvider>,
    );
    expect(fetch).not.toHaveBeenCalled();
    if (kind === "route") navigation.path = "/products/wild";
    else navigation.query = "series=streetwear";
    view.rerender(
      <MarketProvider reload={reload} initial={initial}>
        Shop
      </MarketProvider>,
    );
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
  },
);

it("does not force idle reloads, re-resolve valid manual choices, or loop after failed bootstrap", async () => {
  vi.useFakeTimers();
  const reload = vi.fn();
  vi.stubGlobal("fetch", vi.fn());
  const view = render(
    <MarketProvider
      reload={reload}
      initial={{
        country: "GB",
        source: "ip",
        resolvedAt: Date.now(),
        persisted: true,
        countries: null,
      }}
    >
      Shop
    </MarketProvider>,
  );
  await act(async () => {
    vi.advanceTimersByTime(31 * 60_000);
  });
  expect(reload).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  view.unmount();
  vi.useRealTimers();
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ country: "GB", source: "manual", persisted: true })),
  );
  const manual = render(
    <MarketProvider
      reload={reload}
      initial={{ country: "GB", source: "manual", persisted: true, countries: null }}
    >
      Shop
    </MarketProvider>,
  );
  fireEvent(document, new Event("visibilitychange"));
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(persistDestination).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
  manual.unmount();
  vi.mocked(persistDestination).mockRejectedValue(new Error("cookies blocked"));
  render(
    <MarketProvider
      reload={reload}
      initial={{ country: "GB", source: "ip", persisted: false, countries: null }}
    >
      Shop
    </MarketProvider>,
  );
  await waitFor(() => expect(persistDestination).toHaveBeenCalledOnce());
  fireEvent(document, new Event("visibilitychange"));
  expect(reload).not.toHaveBeenCalled();
});

it("does not interrupt an open destination selector", async () => {
  const reload = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ country: "SG", persisted: false }))),
  );
  function Controls() {
    const market = useOptionalMarket()!;
    return <button onClick={market.show}>Choose</button>;
  }
  render(
    <MarketProvider
      reload={reload}
      initial={{
        country: "GB",
        source: "ip",
        resolvedAt: Date.now(),
        persisted: true,
        countries: null,
      }}
    >
      <Controls />
    </MarketProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Choose" }));
  fireEvent(document, new Event("visibilitychange"));
  expect(fetch).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});
