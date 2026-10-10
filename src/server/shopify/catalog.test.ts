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

  it("asks Shopify for the visitor's market and keeps one cache key per country", async () => {
    // 缓存串味是本文件开头记录的线上事故:同 URL 不同 body 会被 Next 的数据缓存
    // 复用。按国家查询时,国家必须同时进 URL 缓存键与 @inContext 字面量,否则
    // 香港访客会拿到美国市场的 USD 金额。
    const f = mockFetch({ data: { products: { nodes: [] } } });
    await listShopifyProducts(f, "gb");
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("ck=products-list%3AGB");
    expect(String(init.body)).toContain("@inContext(country: GB)");
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
                createdAt: "2026-09-01T00:00:00Z",
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

    const items = await fetchShopifyCollectionProducts("outdoor-sporty系列", "US", f);
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
        createdAt: "2026-09-01T00:00:00Z",
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
        createdAt: null,
      },
    ]);
  });

  it("returns an empty array when the collection has no products", async () => {
    const items = await fetchShopifyCollectionProducts(
      "frontpage",
      "US",
      mockFetch({ data: { collectionByHandle: { title: "x", products: { nodes: [] } } } }),
    );
    expect(items).toEqual([]);
  });

  it("throws when the collection handle does not exist (so the caller can fall back to local)", async () => {
    await expect(
      fetchShopifyCollectionProducts("nope", "US", mockFetch({ data: { collectionByHandle: null } })),
    ).rejects.toThrow();
  });

  it("throws on a non-OK HTTP response", async () => {
    await expect(fetchShopifyCollectionProducts("frontpage", "US", mockFetch({}, false))).rejects.toThrow();
  });

  it("keeps collection + country in the cache key so one series' market prices cannot leak into another's", async () => {
    const f = mockFetch({ data: { collectionByHandle: { title: "x", products: { nodes: [] } } } });
    await fetchShopifyCollectionProducts("frontpage", "hk", f);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("ck=collection-products%3Afrontpage%3AHK");
    expect(String(init.body)).toContain("@inContext(country: HK)");
  });
});
