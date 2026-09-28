// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Product } from "../../lib/catalog";
import { enrichProduct } from "./enrich";

function make(overrides: Partial<Product> = {}): Product {
  return {
    code: "offy_redrush",
    slug: "offy_redrush",
    series: "outdoor-sporty",
    name: { zh: "街头小子 Offy", en: "Offy Street Player" },
    description: { zh: "本地描述", en: "local description" },
    priceCents: 4500,
    dimensions: null,
    images: ["/assets/products/p11.png"],
    emotionTags: { zh: ["街头"], en: ["street"] },
    featured: false,
    isAvailable: true,
    isUpcoming: false,
    isQuoteOnly: false,
    sortOrder: 51,
    shopifyVariantId: "gid://shopify/ProductVariant/53491815579937",
    shopifyHandle: "offy_redrush",
    ...overrides,
  };
}

describe("enrichProduct", () => {
  it("overrides display fields with Shopify data when mapped", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      title: "Offy Sport - MOTARO",
      description: "A cool sporty Offy.",
      descriptionBlocks: [
        { text: "A cool sporty Offy.", bold: true },
        { text: "Body copy here.", bold: false },
      ],
      images: ["https://cdn.shopify.com/a.jpg"],
      priceCents: 5900,
      currency: "USD",
    });

    const result = await enrichProduct(make(), fetcher);
    expect(result.name.en).toBe("Offy Sport - MOTARO");
    // 中文名保留本地直译占位,后续由 Shopify Translate & Adapt 接管
    expect(result.name.zh).toBe("街头小子 Offy");
    expect(result.description.en).toBe("A cool sporty Offy.");
    expect(result.descriptionBlocks?.en).toEqual([
      { text: "A cool sporty Offy.", bold: true },
      { text: "Body copy here.", bold: false },
    ]);
    expect(result.images).toEqual(["https://cdn.shopify.com/a.jpg"]);
    expect(result.priceCents).toBe(5900);
    // 非展示字段保留本地
    expect(result.series).toBe("outdoor-sporty");
    expect(result.emotionTags.en).toEqual(["street"]);
  });

  it("keeps local descriptionBlocks when Shopify returns none", async () => {
    const local = make({
      descriptionBlocks: {
        en: [{ text: "local lead", bold: true }],
        zh: [{ text: "local lead", bold: true }],
      },
    });
    const fetcher = vi.fn().mockResolvedValue({
      title: "x",
      description: "x",
      descriptionBlocks: [],
      images: ["https://cdn.shopify.com/a.jpg"],
      priceCents: 5900,
      currency: "USD",
    });
    const result = await enrichProduct(local, fetcher);
    expect(result.descriptionBlocks?.en).toEqual([{ text: "local lead", bold: true }]);
  });

  it("does not fetch and returns the local product when unmapped", async () => {
    const fetcher = vi.fn();
    const local = make({ shopifyHandle: undefined });
    const result = await enrichProduct(local, fetcher);
    expect(result).toEqual(local);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps the local USD price when Shopify currency is not USD, but still syncs name/images", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      title: "offy_redrush",
      description: "offy",
      images: ["https://cdn.shopify.com/x.jpg"],
      priceCents: 10,
      currency: "HKD",
    });
    const result = await enrichProduct(make(), fetcher);
    // 价格保留本地 USD，不被 HKD 覆盖
    expect(result.priceCents).toBe(4500);
    // 名称/图片仍同步
    expect(result.name.en).toBe("offy_redrush");
    expect(result.images).toEqual(["https://cdn.shopify.com/x.jpg"]);
  });

  it("lets a legitimate USD $0 price override the local placeholder", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      title: "BURGER DOLL",
      description: "free debug product",
      images: ["https://cdn.shopify.com/free.jpg"],
      priceCents: 0,
      currency: "USD",
    });
    const result = await enrichProduct(make(), fetcher);
    expect(result.priceCents).toBe(0);
    expect(result.name.en).toBe("BURGER DOLL");
  });

  it("falls back to local when Shopify returns null", async () => {
    const result = await enrichProduct(make(), vi.fn().mockResolvedValue(null));
    expect(result.name.en).toBe("Offy Street Player");
    expect(result.priceCents).toBe(4500);
    expect(result.images).toEqual(["/assets/products/p11.png"]);
  });

  it("falls back to local when the fetch throws", async () => {
    const result = await enrichProduct(make(), vi.fn().mockRejectedValue(new Error("boom")));
    expect(result.name.en).toBe("Offy Street Player");
    expect(result.priceCents).toBe(4500);
  });
});
