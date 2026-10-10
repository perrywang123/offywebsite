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
    expect(byPrice(5390)).toBe(1);
    expect(byPrice(5190)).toBe(2);
    expect(byPrice(4990)).toBe(14);
    expect(byPrice(4790)).toBe(3);
    expect(byPrice(4590)).toBe(12);
    // 0 价现在**允许**出现 1 条:swan-princess 在 Shopify 后台确实没设价,用户确认
    // 「以 Shopify 配置为准」。所以这里断言的是"0 价只能来自 Shopify 的真实配置",
    // 而不是"本地表不许有 0" —— 后者原本是为了防止回退模式显示 $0.00,但那个问题
    // 真正的防线是 `pnpm check:catalog` 的比价(它会在本地与线上价格不一致时失败)。
    expect(byPrice(0)).toBe(1);
    expect(getProductByCode("swan-princess")?.priceCents).toBe(0);
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
    const [line] = toStripeLineItems([{ code: "royal-grey", quantity: 2 }]);
    expect(line.price_data.unit_amount).toBe(4990);
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
        { code: "royal-grey", quantity: 2 },
        { code: "bunny-hug", quantity: 1 },
      ]),
    ).toBe(4990 * 2 + 4990);
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
