import type { DescriptionBlock } from "../description-html";

export type SeriesSlug = "princess-lady" | "outdoor-sporty" | "playful-life";

export interface LocalizedString {
  en: string;
  zh: string;
}

export interface LocalizedDescriptionBlocks {
  en: DescriptionBlock[];
  zh: DescriptionBlock[];
}

export interface LocalizedStringList {
  en: string[];
  zh: string[];
}

export interface Dimensions {
  heightCm: number;
  lengthCm: number;
  headCm: number;
  armCm: number;
  legCm: number;
}

export interface Product {
  code: string;
  slug: string;
  series: SeriesSlug;
  name: LocalizedString;
  description: LocalizedString;
  /** Structured description paragraphs from Shopify descriptionHtml (bold lead preserved). */
  descriptionBlocks?: LocalizedDescriptionBlocks;
  /** Price in minor units of `currency` (integer cents) — never floating point. */
  priceCents: number;
  /**
   * ISO-4217 code the `priceCents` amount is denominated in.
   *
   * 全站按**访客所在市场**展示价格:Shopify Storefront 的 `@inContext(country:)`
   * 会按该国的 Market 返回金额 + 币种(US→USD 49.90、GB→GBP 37.90、
   * HK→HKD 369.00、JP/DE→SGD 49.90),我们如实采用,不再假设"价格就是美元"。
   * 本地静态兜底表(`lib/catalog/products.ts`)里的快照价是美元,故为 `"USD"`。
   */
  currency: string;
  dimensions: Dimensions | null;
  images: string[];
  emotionTags: LocalizedStringList;
  featured: boolean;
  isAvailable: boolean;
  isUpcoming: boolean;
  isQuoteOnly: boolean;
  sortOrder: number;
  /** Optional badge rendered on the card, e.g. "区域限定" (regional exclusive). */
  badge?: string;
  /** Shopify Storefront variant GID for hosted checkout, e.g. "gid://shopify/ProductVariant/123". */
  shopifyVariantId?: string;
  /** Shopify product handle for enrichment reads (stable across variant edits). */
  shopifyHandle?: string;
  /**
   * 展示用"商品编码"(优先取 Shopify variant 的 SKU 字段,商家可在后台随时改;
   * 未设置时留空,展示层回退到 `code`(= handle))。与 `code`/`shopifyHandle`
   * 这两个"路由/结算用的稳定技术标识符"是两回事——那两个绝不应随意改变,
   * 而 `skuCode` 纯粹是给人看的编码,允许随商家维护而变化。
   */
  skuCode?: string;
}

export interface Series {
  slug: SeriesSlug;
  name: LocalizedString;
  tagline: LocalizedString;
  /** 系列页顶部 hero 图(头图素材,与首页轮播图对应)。 */
  heroImage: string;
}
