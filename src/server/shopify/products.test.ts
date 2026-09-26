// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchProductData } from "./products";

function mockFetch(json: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => json,
  }) as unknown as typeof fetch;
}

describe("fetchProductData", () => {
  it("parses title/description/images/price from the product(handle) response", async () => {
    const f = mockFetch({
      data: {
        product: {
          title: "offy_redrush",
          description: "A cool sporty Offy.",
          images: { nodes: [{ url: "https://cdn.shopify.com/a.jpg" }, { url: "https://cdn.shopify.com/b.jpg" }] },
          // @inContext(US) 下返回 USD 价
          variants: { nodes: [{ price: { amount: "45.0", currencyCode: "USD" } }] },
        },
      },
    });

    const data = await fetchProductData("offy_redrush", f);
    expect(data).toEqual({
      title: "offy_redrush",
      description: "A cool sporty Offy.",
      images: ["https://cdn.shopify.com/a.jpg", "https://cdn.shopify.com/b.jpg"],
      priceCents: 4500,
      currency: "USD",
    });
  });

  it("returns null when the product is missing", async () => {
    const data = await fetchProductData("nope", mockFetch({ data: { product: null } }));
    expect(data).toBeNull();
  });

  it("returns null on a non-OK HTTP response", async () => {
    const data = await fetchProductData("x", mockFetch({}, false));
    expect(data).toBeNull();
  });
});
