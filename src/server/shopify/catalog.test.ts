// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { listShopifyProducts } from "./catalog";

function mockFetch(json: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({ ok, json: async () => json }) as unknown as typeof fetch;
}

describe("listShopifyProducts", () => {
  it("maps published products (handle/title/price/image/available)", async () => {
    const f = mockFetch({
      data: {
        products: {
          nodes: [
            {
              handle: "offy_redrush",
              title: "offy_redrush",
              availableForSale: true,
              featuredImage: { url: "https://cdn.shopify.com/a.jpg" },
              priceRange: { minVariantPrice: { amount: "0.13", currencyCode: "USD" } },
            },
            {
              handle: "no-image",
              title: "No Image",
              availableForSale: false,
              featuredImage: null,
              priceRange: { minVariantPrice: { amount: "12.00", currencyCode: "USD" } },
            },
          ],
        },
      },
    });

    const items = await listShopifyProducts(f);
    expect(items).toEqual([
      { handle: "offy_redrush", title: "offy_redrush", priceCents: 13, currency: "USD", image: "https://cdn.shopify.com/a.jpg", available: true },
      { handle: "no-image", title: "No Image", priceCents: 1200, currency: "USD", image: null, available: false },
    ]);
  });

  it("returns an empty array when Shopify has no products", async () => {
    const items = await listShopifyProducts(mockFetch({ data: { products: { nodes: [] } } }));
    expect(items).toEqual([]);
  });

  it("throws on a non-OK HTTP response (so the page can fall back to local)", async () => {
    await expect(listShopifyProducts(mockFetch({}, false))).rejects.toThrow();
  });
});
