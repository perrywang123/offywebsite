// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shopify/catalog", () => ({
  fetchShopifyCollections: vi.fn(),
  fetchShopifyCollectionProducts: vi.fn(),
}));
vi.mock("../shopify/products", () => ({
  fetchProductData: vi.fn(),
}));

import { fetchShopifyCollectionProducts, fetchShopifyCollections } from "../shopify/catalog";
import { fetchProductData } from "../shopify/products";
import {
  getLiveFeaturedProducts,
  getLiveProductByCode,
  getLiveProducts,
  getLiveProductsBySeries,
  getLiveSeriesList,
} from "./live";

const mockedCollections = fetchShopifyCollections as unknown as ReturnType<typeof vi.fn>;
const mockedCollectionProducts = fetchShopifyCollectionProducts as unknown as ReturnType<typeof vi.fn>;
const mockedProductData = fetchProductData as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockedCollections.mockReset();
  mockedCollectionProducts.mockReset();
  mockedProductData.mockReset();
});

describe("getLiveSeriesList", () => {
  it("overrides the English series name with the live Shopify collection title; keeps curated zh name", async () => {
    mockedCollections.mockResolvedValue([
      { handle: "frontpage", title: "OFFY Princess Series", description: "x" },
      { handle: "outdoor-sporty系列", title: "OFFY Streetwear Series", description: "x" },
      { handle: "趣味生活系列", title: "OFFY Dress-up Series", description: "x" },
    ]);
    const series = await getLiveSeriesList();
    const outdoor = series.find((s) => s.slug === "outdoor-sporty")!;
    expect(outdoor.name.en).toBe("OFFY Streetwear Series");
    expect(outdoor.name.zh).toBe("街头潮流系列");
    const princess = series.find((s) => s.slug === "princess-lady")!;
    expect(princess.name.en).toBe("OFFY Princess Series");
  });

  it("falls back to the local static series list when Shopify is unreachable", async () => {
    mockedCollections.mockRejectedValue(new Error("network down"));
    const series = await getLiveSeriesList();
    expect(series.map((s) => s.slug)).toEqual(["princess-lady", "outdoor-sporty", "playful-life"]);
    expect(series.find((s) => s.slug === "outdoor-sporty")?.name.en).toBe("Fashion Lifestyle");
  });
});

describe("getLiveProductsBySeries", () => {
  it("returns the live collection roster, including brand-new handles not in the local skeleton", async () => {
    mockedCollectionProducts.mockResolvedValue([
      { handle: "offy_redrush", title: "RED RUSH", priceCents: 0, currency: "USD", image: "https://cdn/1.jpg", available: true, variantId: "gid://shopify/ProductVariant/1" },
      { handle: "noir", title: "NOIR", priceCents: 4500, currency: "USD", image: "https://cdn/2.jpg", available: true, variantId: "gid://shopify/ProductVariant/2" },
    ]);
    const list = await getLiveProductsBySeries("outdoor-sporty");
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.code)).toEqual(["offy_redrush", "noir"]);
    // 全新商品(本地无记录):中文名回退 Shopify 标题,变体 ID 来自实时数据
    const noir = list.find((p) => p.code === "noir")!;
    expect(noir.name.en).toBe("NOIR");
    expect(noir.name.zh).toBe("NOIR");
    expect(noir.priceCents).toBe(4500);
    expect(noir.shopifyVariantId).toBe("gid://shopify/ProductVariant/2");
    expect(noir.series).toBe("outdoor-sporty");
    expect(noir.isAvailable).toBe(true);
    // 本地已有记录(offy_redrush):中文名沿用本地精修译名
    expect(list.find((p) => p.code === "offy_redrush")?.name.zh).toBe("赤红冲锋");
  });

  it("does not adopt a non-USD price as if it were USD", async () => {
    mockedCollectionProducts.mockResolvedValue([
      { handle: "noir", title: "NOIR", priceCents: 1000, currency: "HKD", image: null, available: true, variantId: null },
    ]);
    const list = await getLiveProductsBySeries("outdoor-sporty");
    expect(list[0]?.priceCents).toBe(0);
  });

  it("falls back to the local roster for that series when Shopify is unreachable", async () => {
    mockedCollectionProducts.mockRejectedValue(new Error("timeout"));
    const list = await getLiveProductsBySeries("outdoor-sporty");
    expect(list.map((p) => p.code)).toEqual(["offy_redrush"]);
  });
});

describe("getLiveProducts", () => {
  it("concatenates the live roster of all three series", async () => {
    mockedCollectionProducts.mockImplementation(async (handle: string) => {
      if (handle === "frontpage") return [{ handle: "swan-princess", title: "SWAN PRINCESS", priceCents: 4590, currency: "USD", image: "x", available: true, variantId: "v1" }];
      if (handle === "outdoor-sporty系列") return [{ handle: "noir", title: "NOIR", priceCents: 4500, currency: "USD", image: "x", available: true, variantId: "v2" }];
      return [{ handle: "fable", title: "FABLE", priceCents: 4500, currency: "USD", image: "x", available: true, variantId: "v3" }];
    });
    const all = await getLiveProducts();
    expect(all.map((p) => p.code).sort()).toEqual(["fable", "noir", "swan-princess"]);
  });
});

describe("getLiveFeaturedProducts", () => {
  it("round-robins across the three series so the homepage shows a cross-series mix", async () => {
    mockedCollectionProducts.mockImplementation(async (handle: string) => {
      if (handle === "frontpage") {
        return ["a1", "a2", "a3"].map((h, i) => ({ handle: h, title: h, priceCents: 100, currency: "USD", image: "x", available: true, variantId: String(i) }));
      }
      if (handle === "outdoor-sporty系列") {
        return ["b1", "b2"].map((h, i) => ({ handle: h, title: h, priceCents: 100, currency: "USD", image: "x", available: true, variantId: String(i) }));
      }
      return ["c1"].map((h, i) => ({ handle: h, title: h, priceCents: 100, currency: "USD", image: "x", available: true, variantId: String(i) }));
    });
    const featured = await getLiveFeaturedProducts(6);
    // 轮询顺序: a1,b1,c1,a2,b2,a3 (每轮各系列按序各取一款,系列耗尽则跳过)
    expect(featured.map((p) => p.code)).toEqual(["a1", "b1", "c1", "a2", "b2", "a3"]);
  });

  it("excludes unavailable products from the featured pool", async () => {
    mockedCollectionProducts.mockImplementation(async () => [
      { handle: "sold-out", title: "x", priceCents: 100, currency: "USD", image: "x", available: false, variantId: "v" },
      { handle: "in-stock", title: "x", priceCents: 100, currency: "USD", image: "x", available: true, variantId: "v" },
    ]);
    const featured = await getLiveFeaturedProducts(6);
    expect(featured.every((p) => p.isAvailable)).toBe(true);
    expect(featured.some((p) => p.code === "sold-out")).toBe(false);
  });
});

describe("getLiveProductByCode", () => {
  it("resolves a brand-new product never catalogued locally, inferring its series from live collection membership", async () => {
    mockedProductData.mockResolvedValue({
      title: "NOIR",
      description: "A dark streetwear look.",
      descriptionBlocks: [{ text: "A dark streetwear look.", bold: true }],
      images: ["https://cdn/noir.jpg"],
      priceCents: 4500,
      currency: "USD",
      variantId: "gid://shopify/ProductVariant/99",
      available: true,
      collectionHandles: ["outdoor-sporty系列"],
    });
    const product = await getLiveProductByCode("noir");
    expect(product).toBeDefined();
    expect(product!.series).toBe("outdoor-sporty");
    expect(product!.shopifyVariantId).toBe("gid://shopify/ProductVariant/99");
    expect(product!.priceCents).toBe(4500);
    expect(product!.isAvailable).toBe(true);
  });

  it("resolves an orphaned product (no longer in any tracked collection) using the local series as a fallback", async () => {
    mockedProductData.mockResolvedValue({
      title: "ROYAL GREY",
      description: "x",
      descriptionBlocks: [],
      images: ["https://cdn/royal-grey.jpg"],
      priceCents: 4590,
      currency: "USD",
      variantId: "gid://shopify/ProductVariant/53547308122401",
      available: true,
      collectionHandles: [], // 已不在任何已知系列的 Collection 里
    });
    const product = await getLiveProductByCode("royal-grey");
    expect(product).toBeDefined();
    // 本地仍有该 handle 的记录(series: princess-lady),无实时系列匹配时沿用它
    expect(product!.series).toBe("princess-lady");
  });

  it("falls back to the local catalog entry when Shopify is unreachable", async () => {
    mockedProductData.mockRejectedValue(new Error("timeout"));
    const product = await getLiveProductByCode("swan-princess");
    expect(product?.code).toBe("swan-princess");
    expect(product?.priceCents).toBe(4590);
  });

  it("returns undefined for a code that exists neither live nor locally", async () => {
    mockedProductData.mockResolvedValue(null);
    const product = await getLiveProductByCode("totally-unknown-code");
    expect(product).toBeUndefined();
  });

  it("does not adopt a non-USD live price as if it were USD, falling back to the local USD price", async () => {
    mockedProductData.mockResolvedValue({
      title: "SWAN PRINCESS",
      description: "x",
      descriptionBlocks: [],
      images: ["https://cdn/x.jpg"],
      priceCents: 10,
      currency: "HKD",
      variantId: "v",
      available: true,
      collectionHandles: ["frontpage"],
    });
    const product = await getLiveProductByCode("swan-princess");
    expect(product?.priceCents).toBe(4590);
  });
});
