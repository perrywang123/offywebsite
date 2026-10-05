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
  getLiveNewLooksProducts,
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
      { handle: "offy_redrush", title: "RED RUSH", priceCents: 0, currency: "USD", image: "https://cdn/1.jpg", available: true, variantId: "gid://shopify/ProductVariant/1", sku: null },
      { handle: "noir", title: "NOIR", priceCents: 4500, currency: "USD", image: "https://cdn/2.jpg", available: true, variantId: "gid://shopify/ProductVariant/2", sku: null },
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

  it("surfaces the live Shopify SKU as skuCode — a human-facing product code the merchant can change, distinct from the stable routing `code`", async () => {
    mockedCollectionProducts.mockResolvedValue([
      { handle: "ace", title: "CLUB 28", priceCents: 4590, currency: "USD", image: "https://cdn/ace.jpg", available: true, variantId: "v1", sku: "CLUB-28" },
      { handle: "offy_redrush", title: "NEON RUSH", priceCents: 0, currency: "USD", image: "https://cdn/1.jpg", available: true, variantId: "v2", sku: null },
    ]);
    const list = await getLiveProductsBySeries("outdoor-sporty");
    const ace = list.find((p) => p.code === "ace")!;
    expect(ace.skuCode).toBe("CLUB-28");
    expect(ace.code).toBe("ace"); // 路由/购物车用的 code 不受 sku 改名影响
    // 未设置 SKU 时 skuCode 留空,展示层自行回退到 code
    const redrush = list.find((p) => p.code === "offy_redrush")!;
    expect(redrush.skuCode).toBeUndefined();
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

describe("getLiveNewLooksProducts", () => {
  const item = (handle: string, createdAt: string | null, available = true) => ({
    handle,
    title: handle.toUpperCase(),
    priceCents: 100,
    currency: "USD",
    image: "x",
    available,
    variantId: `v-${handle}`,
    sku: null,
    createdAt,
  });

  it("takes the newest N products per series by Shopify createdAt (not the collection's manual order), concatenated in series order", async () => {
    mockedCollectionProducts.mockImplementation(async (handle: string) => {
      if (handle === "frontpage") {
        // 故意按"旧→新"返回,验证函数按 createdAt 重新降序排序
        return [
          item("a-old", "2026-01-01T00:00:00Z"),
          item("a-new", "2026-09-01T00:00:00Z"),
          item("a-mid", "2026-05-01T00:00:00Z"),
        ];
      }
      if (handle === "outdoor-sporty系列") {
        return [item("b-old", "2026-02-01T00:00:00Z"), item("b-new", "2026-08-01T00:00:00Z")];
      }
      return [item("c-only", "2026-07-01T00:00:00Z")];
    });
    const looks = await getLiveNewLooksProducts(2);
    // 每系列取最新 2 款,按系列顺序拼合;某系列不足 2 款则有多少给多少
    expect(looks.map((p) => p.code)).toEqual(["a-new", "a-mid", "b-new", "b-old", "c-only"]);
  });

  it("excludes unavailable products before picking the newest N", async () => {
    mockedCollectionProducts.mockImplementation(async (handle: string) => {
      if (handle !== "frontpage") return [];
      return [
        item("newest-but-sold-out", "2026-09-01T00:00:00Z", false),
        item("newest-available", "2026-08-01T00:00:00Z"),
        item("older-available", "2026-01-01T00:00:00Z"),
      ];
    });
    const looks = await getLiveNewLooksProducts(2);
    expect(looks.map((p) => p.code)).toEqual(["newest-available", "older-available"]);
    expect(looks.every((p) => p.isAvailable)).toBe(true);
  });

  it("treats items with missing createdAt as the oldest (sorted last)", async () => {
    mockedCollectionProducts.mockImplementation(async (handle: string) => {
      if (handle !== "frontpage") return [];
      return [item("no-date", null), item("dated", "2026-06-01T00:00:00Z")];
    });
    const looks = await getLiveNewLooksProducts(1);
    expect(looks.map((p) => p.code)).toEqual(["dated"]);
  });

  it("falls back to the first N local products of that series when Shopify is unreachable", async () => {
    mockedCollectionProducts.mockRejectedValue(new Error("timeout"));
    const looks = await getLiveNewLooksProducts(2);
    // 本地清单按 sortOrder 取每系列前 2 款(均为可售);本地 outdoor-sporty 仅 1 款 → 共 5 款
    expect(looks.map((p) => p.code)).toEqual([
      "swan-princess",
      "black-pearl",
      "offy_redrush",
      "prep-school",
      "country-getaway",
    ]);
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

  it("surfaces the live Shopify SKU as skuCode on the detail-page resolution path too — this is exactly the bug reported: renaming a product in Shopify (e.g. Ace → CLUB 28) must update the displayed product code, not just the title", async () => {
    mockedProductData.mockResolvedValue({
      title: "CLUB 28",
      description: "x",
      descriptionBlocks: [],
      images: ["https://cdn/ace.jpg"],
      priceCents: 4590,
      currency: "USD",
      variantId: "v",
      available: true,
      collectionHandles: ["outdoor-sporty系列"],
      sku: "CLUB-28",
    });
    const product = await getLiveProductByCode("ace");
    expect(product?.name.en).toBe("CLUB 28");
    expect(product?.skuCode).toBe("CLUB-28");
    // code(路由/购物车/结算标识符)始终是 handle,不随改名/改 SKU 变化
    expect(product?.code).toBe("ace");
  });
});
