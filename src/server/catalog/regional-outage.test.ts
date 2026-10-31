// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("../../lib/env", () => ({
  env: { SHOPIFY_REGIONS: "US,GB,HK", SHOPIFY_TARGET_MARKETS: "US,GB,HK" },
}));
vi.mock("../shopify/catalog", () => ({ listShopifyProducts: vi.fn() }));
import { listShopifyProducts } from "../shopify/catalog";
import { getRegionalProducts } from "./regional";
it("does not infer regional exclusivity from incomplete country probes", async () => {
  vi.mocked(listShopifyProducts).mockImplementation(async (_fetch, country) => {
    if (country === "HK") throw new Error("timeout");
    return country === "US"
      ? [
          {
            handle: "live",
            title: "Live",
            priceCents: 100,
            currency: "USD",
            image: null,
            available: true,
          },
        ]
      : [];
  });
  expect(await getRegionalProducts("US")).toEqual([]);
});
