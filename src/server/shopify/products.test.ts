// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchProductData } from "./products";

function mockFetch(json: unknown, ok = true): typeof fetch {
  const complete = (v: unknown): void => {
    if (!v || typeof v !== "object") return;
    const n = v as {
      nodes?: unknown[];
      pageInfo?: unknown;
      availableForSale?: boolean;
      variants?: { nodes: Array<{ availableForSale?: boolean }> };
    };
    if (n.variants)
      for (const variant of n.variants.nodes) variant.availableForSale ??= n.availableForSale;
    if (n.nodes) n.pageInfo = { hasNextPage: false, endCursor: null };
    Object.values(n).forEach((x) => (Array.isArray(x) ? x.forEach(complete) : complete(x)));
  };
  complete(json);

  return vi.fn().mockResolvedValue({
    ok,
    json: async () => json,
  }) as unknown as typeof fetch;
}

describe("fetchProductData", () => {
  it("parses title/description/images/price/variantId/available/collections from the product(handle) response", async () => {
    const f = mockFetch({
      data: {
        product: {
          title: "offy_redrush",
          description: "A cool sporty Offy.",
          descriptionHtml: "<p><b>A cool sporty Offy.</b></p><p><span>Body copy here.</span></p>",
          availableForSale: true,
          images: {
            nodes: [
              { url: "https://cdn.shopify.com/a.jpg" },
              { url: "https://cdn.shopify.com/b.jpg" },
            ],
          },
          // @inContext(US) 下返回 USD 价
          variants: {
            nodes: [
              {
                id: "gid://shopify/ProductVariant/1",
                sku: "NEON-RUSH-01",
                price: { amount: "45.0", currencyCode: "USD" },
              },
            ],
          },
          collections: { nodes: [{ handle: "outdoor-sporty系列" }] },
        },
      },
    });

    const data = await fetchProductData("offy_redrush", f);
    expect(data).toEqual({
      title: "offy_redrush",
      description: "A cool sporty Offy.",
      descriptionBlocks: [
        { text: "A cool sporty Offy.", bold: true },
        { text: "Body copy here.", bold: false },
      ],
      images: ["https://cdn.shopify.com/a.jpg", "https://cdn.shopify.com/b.jpg"],
      priceCents: 4500,
      currency: "USD",
      variantId: "gid://shopify/ProductVariant/1",
      available: true,
      collectionHandles: ["outdoor-sporty系列"],
      sku: "NEON-RUSH-01",
    });
  });

  it("returns empty descriptionBlocks when descriptionHtml is missing", async () => {
    const f = mockFetch({
      data: {
        product: {
          title: "x",
          description: "",
          availableForSale: true,
          collections: { nodes: [] },
          images: { nodes: [] },
          variants: { nodes: [{ id: "v", price: { amount: "0", currencyCode: "USD" } }] },
        },
      },
    });
    const data = await fetchProductData("x", f);
    expect(data?.descriptionBlocks).toEqual([]);
  });

  it("rejects missing required facts instead of inventing availability or price", async () => {
    await expect(
      fetchProductData(
        "x",
        mockFetch({
          data: { product: { title: "x", images: { nodes: [] }, variants: { nodes: [] } } },
        }),
      ),
    ).rejects.toThrow();
  });

  it("falls back to null sku when the variant's sku is an empty string (unset in Shopify)", async () => {
    const f = mockFetch({
      data: {
        product: {
          title: "x",
          description: "",
          availableForSale: true,
          collections: { nodes: [] },
          images: { nodes: [] },
          variants: { nodes: [{ id: "v", sku: "", price: { amount: "0", currencyCode: "USD" } }] },
        },
      },
    });
    const data = await fetchProductData("x", f);
    expect(data?.sku).toBeNull();
  });

  it("surfaces availableForSale: false (sold out / unpublished)", async () => {
    const f = mockFetch({
      data: {
        product: {
          title: "x",
          description: "",
          collections: { nodes: [] },
          availableForSale: false,
          images: { nodes: [] },
          variants: { nodes: [{ id: "v", price: { amount: "0", currencyCode: "USD" } }] },
        },
      },
    });
    const data = await fetchProductData("x", f);
    expect(data?.available).toBe(false);
  });

  it("returns null when the product is missing", async () => {
    const data = await fetchProductData("nope", mockFetch({ data: { product: null } }));
    expect(data).toBeNull();
  });

  it("throws on a non-OK HTTP response", async () => {
    await expect(fetchProductData("x", mockFetch({}, false))).rejects.toThrow();
  });

  it("prices by the visitor's market: country goes into both @inContext and the cache key", async () => {
    const f = mockFetch({
      data: {
        product: {
          title: "NOIR",
          availableForSale: true,
          images: { nodes: [] },
          variants: { nodes: [{ id: "v", price: { amount: "37.9", currencyCode: "GBP" } }] },
          collections: { nodes: [] },
        },
      },
    });
    const data = await fetchProductData("noir", f, "gb");
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("ck=product:noir:GB");
    expect(String(init.body)).toContain("@inContext(country: GB)");
    expect(data?.priceCents).toBe(3790);
    expect(data?.currency).toBe("GBP");
  });
});
