import { describe, expect, it } from "vitest";
import {
  computeSubtotalCents,
  getFeaturedProducts,
  getProductByCode,
  getProductsBySeries,
  products,
  seriesList,
  teaserSeries,
  toStripeLineItems,
} from "./index";

describe("catalog data integrity (33 Shopify-mapped products)", () => {
  it("exposes exactly 33 products, one per Shopify-published item", () => {
    // 兜底表按 Shopify 的 US 市场同步:12(公主)+ 9(街头)+ 12(趣味)= 33。
    // 用 `pnpm check:catalog` 与线上核对,漂移会被列出来。
    expect(products).toHaveLength(33);
  });

  it("defines exactly 3 series aligned with Shopify Collections", () => {
    expect(seriesList.map((s) => s.slug)).toEqual([
      "princess-lady",
      "outdoor-sporty",
      "playful-life",
    ]);
  });

  it("each series carries a dedicated hero image for the collection page hero", () => {
    // 按图内容对应:公主lady=素材2(白底人台)、时尚=素材4(CATTLETUS)、趣味=素材3(深底)
    expect(seriesList.map((s) => s.heroImage)).toEqual([
      "/assets/hero/hero-02.jpg",
      "/assets/hero/hero-04.jpg",
      "/assets/hero/hero-03.jpg",
    ]);
  });

  it("has unique codes equal to Shopify handles", () => {
    const codes = products.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const p of products) {
      expect(p.shopifyHandle).toBe(p.code);
      expect(p.shopifyVariantId).toMatch(/^gid:\/\/shopify\/ProductVariant\/\d+$/);
    }
  });

  it("every product has bilingual name, non-negative price and an image", () => {
    for (const product of products) {
      expect(product.name.en.trim().length).toBeGreaterThan(0);
      expect(product.name.zh.trim().length).toBeGreaterThan(0);
      expect(product.priceCents).toBeGreaterThanOrEqual(0);
      expect(product.images.length).toBeGreaterThan(0);
    }
  });

  it("series membership mirrors Shopify Collections (12 / 9 / 12)", () => {
    expect(getProductsBySeries("princess-lady")).toHaveLength(12);
    expect(getProductsBySeries("outdoor-sporty")).toHaveLength(9);
    expect(getProductsBySeries("playful-life")).toHaveLength(12);
  });

  it("prices mirror the Shopify store tiers", () => {
    const byPrice = (cents: number) => products.filter((p) => p.priceCents === cents).length;
    expect(byPrice(5190)).toBe(2);
    expect(byPrice(5390)).toBe(1);
    expect(byPrice(4990)).toBe(14);
    expect(byPrice(4790)).toBe(3);
    expect(byPrice(4590)).toBe(13);
    // 兜底表里不允许出现 0 价:Shopify 侧 0 表示"价格没配",同步前本地有 5 条是 0,
    // 回退模式下会把商品显示成 $0.00(线上实测踩到过)。
    expect(byPrice(0)).toBe(0);
  });

  it("marks regional-exclusive products (cold-kitten/lemon-fizz US)", () => {
    expect(getProductByCode("cold-kitten")?.badge).toBe("US");
    expect(getProductByCode("lemon-fizz")?.badge).toBe("US");
    expect(getProductByCode("swan-princess")?.badge).toBeUndefined();
  });

  it("marks 6 featured products for the homepage looks grid", () => {
    const featured = products.filter((p) => p.featured);
    expect(featured).toHaveLength(6);
  });
});

describe("catalog queries", () => {
  it("getProductByCode is case-insensitive", () => {
    expect(getProductByCode("SWAN-PRINCESS")?.code).toBe("swan-princess");
    expect(getProductByCode("offy_redrush")?.code).toBe("offy_redrush");
  });

  it("getFeaturedProducts returns featured items", () => {
    const featured = getFeaturedProducts();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.every((p) => p.featured)).toBe(true);
  });
});

describe("toStripeLineItems", () => {
  it("uses server-side catalog price (ignores any client price)", () => {
    const [line] = toStripeLineItems([{ code: "swan-princess", quantity: 2 }]);
    expect(line.price_data.unit_amount).toBe(4590);
    expect(line.quantity).toBe(2);
  });

  it("throws on unknown code", () => {
    expect(() => toStripeLineItems([{ code: "NOPE", quantity: 1 }])).toThrow();
  });
});

describe("computeSubtotalCents", () => {
  it("computes server-authoritative subtotal", () => {
    expect(
      computeSubtotalCents([
        { code: "swan-princess", quantity: 2 },
        { code: "bunny-hug", quantity: 1 },
      ]),
    ).toBe(4590 * 2 + 4990);
  });
});

describe("teaserSeries (fashionable bag charm, upcoming)", () => {
  it("exposes hero image + English display title", () => {
    expect(teaserSeries.heroImage).toBeTruthy();
    expect(teaserSeries.titleEn).toBe("FASHIONABLEBAG CHARM COLLECTION");
  });

  it("exposes 6 teaser items coded WCOFFY-XXX01..06 with images", () => {
    expect(teaserSeries.items).toHaveLength(6);
    teaserSeries.items.forEach((item, i) => {
      expect(item.code).toBe(`WCOFFY-XXX0${i + 1}`);
      expect(item.image).toMatch(/^\/assets\/bag-charm\//);
    });
  });
});
