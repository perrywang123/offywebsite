// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchShopifyCollectionProducts, fetchShopifyCollections, listShopifyProducts } from "./catalog";

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

describe("fetchShopifyCollections", () => {
  it("maps live collections (handle/title/description)", async () => {
    const f = mockFetch({
      data: {
        collections: {
          nodes: [
            { handle: "frontpage", title: "OFFY Princess Series", description: "A bespoke wardrobe." },
            { handle: "outdoor-sporty系列", title: "OFFY Streetwear Series", description: "Unfiltered attitude." },
          ],
        },
      },
    });
    const items = await fetchShopifyCollections(f);
    expect(items).toEqual([
      { handle: "frontpage", title: "OFFY Princess Series", description: "A bespoke wardrobe." },
      { handle: "outdoor-sporty系列", title: "OFFY Streetwear Series", description: "Unfiltered attitude." },
    ]);
  });

  it("throws on a non-OK HTTP response", async () => {
    await expect(fetchShopifyCollections(mockFetch({}, false))).rejects.toThrow();
  });

  it("throws on a GraphQL error payload", async () => {
    await expect(
      fetchShopifyCollections(mockFetch({ errors: [{ message: "boom" }] })),
    ).rejects.toThrow();
  });
});

describe("fetchShopifyCollectionProducts", () => {
  it("maps the live product roster of a collection, including variant id", async () => {
    const f = mockFetch({
      data: {
        collectionByHandle: {
          title: "OFFY Streetwear Series",
          products: {
            nodes: [
              {
                handle: "noir",
                title: "NOIR",
                availableForSale: true,
                featuredImage: { url: "https://cdn.shopify.com/noir.jpg" },
                priceRange: { minVariantPrice: { amount: "45.00", currencyCode: "USD" } },
                variants: { nodes: [{ id: "gid://shopify/ProductVariant/1", sku: "CLUB-28" }] },
              },
              {
                handle: "ease",
                title: "EASE",
                availableForSale: false,
                featuredImage: null,
                priceRange: { minVariantPrice: { amount: "0", currencyCode: "USD" } },
                variants: { nodes: [] },
              },
            ],
          },
        },
      },
    });

    const items = await fetchShopifyCollectionProducts("outdoor-sporty系列", f);
    expect(items).toEqual([
      {
        handle: "noir",
        title: "NOIR",
        priceCents: 4500,
        currency: "USD",
        image: "https://cdn.shopify.com/noir.jpg",
        available: true,
        variantId: "gid://shopify/ProductVariant/1",
        sku: "CLUB-28",
      },
      {
        handle: "ease",
        title: "EASE",
        priceCents: 0,
        currency: "USD",
        image: null,
        available: false,
        variantId: null,
        sku: null,
      },
    ]);
  });

  it("returns an empty array when the collection has no products", async () => {
    const items = await fetchShopifyCollectionProducts(
      "frontpage",
      mockFetch({ data: { collectionByHandle: { title: "x", products: { nodes: [] } } } }),
    );
    expect(items).toEqual([]);
  });

  it("throws when the collection handle does not exist (so the caller can fall back to local)", async () => {
    await expect(
      fetchShopifyCollectionProducts("nope", mockFetch({ data: { collectionByHandle: null } })),
    ).rejects.toThrow();
  });

  it("throws on a non-OK HTTP response", async () => {
    await expect(fetchShopifyCollectionProducts("frontpage", mockFetch({}, false))).rejects.toThrow();
  });
});
