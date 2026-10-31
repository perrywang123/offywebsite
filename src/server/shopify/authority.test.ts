// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchProductData } from "./products";
import { listShopifyProducts, fetchShopifyCollections } from "./catalog";
const response = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 401, json: async () => body }) as typeof fetch;
const product = {
  title: "Live",
  availableForSale: true,
  images: { nodes: [] },
  collections: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
  variants: {
    nodes: [
      {
        id: "gid://shopify/ProductVariant/1",
        availableForSale: true,
        price: { amount: "0", currencyCode: "SGD" },
      },
    ],
  },
};
describe("Storefront response integrity", () => {
  it.each([
    {},
    { errors: [{ message: "denied" }], data: { product: null } },
    { data: { product: { ...product, availableForSale: undefined } } },
    {
      data: {
        product: {
          ...product,
          variants: { nodes: [{ id: "v", price: { amount: "bad", currencyCode: "USD" } }] },
        },
      },
    },
  ])("rejects malformed/partial data as unavailable, never zero or 404", async (body) => {
    await expect(fetchProductData("live", response(body))).rejects.toThrow();
  });
  it("throws for HTTP and network failures", async () => {
    await expect(fetchProductData("live", response({}, false))).rejects.toThrow();
    await expect(
      fetchProductData("live", vi.fn().mockRejectedValue(new Error("timeout"))),
    ).rejects.toThrow();
  });
  it("accepts a real zero and makes fresh reads", async () => {
    const f = response({ data: { product } });
    expect(await fetchProductData("live", f, "SG")).toMatchObject({
      priceCents: 0,
      currency: "SGD",
    });
    expect(f).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: "no-store" }),
    );
  });
  it("rejects missing connections rather than returning an empty list", async () => {
    await expect(listShopifyProducts(response({ data: {} }))).rejects.toThrow();
    await expect(fetchShopifyCollections(response({ data: {} }))).rejects.toThrow();
  });
});

it("lists the exact variant price used at checkout, rather than a different variant's minimum", async () => {
  const f = response({
    data: {
      products: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          {
            handle: "multi",
            title: "Multi",
            availableForSale: true,
            featuredImage: null,
            priceRange: { minVariantPrice: { amount: "1", currencyCode: "GBP" } },
            variants: {
              nodes: [
                { id: "v", availableForSale: true, price: { amount: "9", currencyCode: "GBP" } },
              ],
            },
          },
        ],
      },
    },
  });
  expect((await listShopifyProducts(f, "GB"))[0]).toMatchObject({
    priceCents: 900,
    currency: "GBP",
  });
});

it("follows pagination, and fails the whole read if a later page fails", async () => {
  const first = {
    ok: true,
    json: async () => ({
      data: { products: { nodes: [], pageInfo: { hasNextPage: true, endCursor: "next" } } },
    }),
  };
  const f = vi
    .fn()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce({ ok: false, status: 503 }) as typeof fetch;
  await expect(listShopifyProducts(f, "US")).rejects.toThrow();
  expect(f).toHaveBeenCalledTimes(2);
  expect(JSON.parse(String(vi.mocked(f).mock.calls[1][1]?.body)).variables.after).toBe("next");
});
it("rejects an omitted pagination proof rather than treating the first page as complete", async () => {
  await expect(
    listShopifyProducts(response({ data: { products: { nodes: [] } } })),
  ).rejects.toThrow();
});

it("uses the selected variant's stock, even when another variant makes the product available", async () => {
  const p = {
    ...product,
    variants: {
      nodes: [{ id: "v", availableForSale: false, price: { amount: "5", currencyCode: "USD" } }],
    },
  };
  expect(await fetchProductData("multi", response({ data: { product: p } }))).toMatchObject({
    available: false,
  });
});
