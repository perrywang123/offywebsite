import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetaProductView, MetaTracking } from "./MetaTracking";

vi.mock("next/navigation", () => ({
  usePathname: () => "/products/a",
  useSearchParams: () =>
    new URLSearchParams("utm_source=meta&utm_medium=paid_social&utm_content=123"),
}));

describe("marketing component initialization", () => {
  it("publishes one page and product observation from the router snapshot even after URL cleanup", async () => {
    localStorage.clear();
    history.replaceState({}, "", "/products/a");
    Object.assign(window, {
      Shopify: {
        customerPrivacy: {
          analyticsProcessingAllowed: () => true,
          marketingAllowed: () => true,
          saleOfDataAllowed: () => true,
        },
      },
      fbq: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));
    render(
      <>
        <MetaProductView product={{ code: "a", quantity: 1, currency: "USD", priceCents: 4990 }} />
        <MetaTracking config={{ enabled: true, pixelId: "1120625754196383", catalogIds: {} }} />
      </>,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const bodies = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(init!.body as string));
    expect(bodies.map((b) => b.name).sort()).toEqual(["PageView", "ViewContent"]);
    expect(bodies.every((b) => b.source.ad_id === "123")).toBe(true);
    document.dispatchEvent(new Event("shopifyCustomerPrivacyApiLoaded"));
    document.dispatchEvent(new Event("offy:meta-ready"));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
