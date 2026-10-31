import type { DescriptionBlock } from "../description-html";

export type SeriesSlug = "princess-lady" | "outdoor-sporty" | "playful-life";

/**
 * 哨兵系列值:商家在 Shopify 后台发布的、**不属于任何系列 Collection** 的商品
 * (贴纸、帆布包这类非公仔周边)。定义见 `lib/catalog/series.ts` 的
 * `MERCH_SERIES_SLUG`(两处必须一致,`series.test.ts` 有断言钉住)。
 *
 * 它不是真实系列:没有 /collections/merch 页面,也不进系列导航与 sitemap;
 * 只需要一个展示名,并让"未知归属"的商品不再被硬塞进公主系列。
 */
export type MerchSeriesSlug = "merch";

/** 一个商品可以归属的系列:真实三大系列之一,或 merch 哨兵值。 */
export type ProductSeries = SeriesSlug | MerchSeriesSlug;

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
  /** 归属系列;`"merch"` = 不属于任何系列 Collection 的周边(贴纸/帆布包等)。 */
  series: ProductSeries;
  name: LocalizedString;
  description: LocalizedString;
  /** Structured description paragraphs from Shopify descriptionHtml (bold lead preserved). */
  descriptionBlocks?: LocalizedDescriptionBlocks;
  /** Price in minor units of `currency` (integer cents) — never floating point. */
  priceCents: number;

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

  shopifyHandle?: string;

  skuCode?: string;
}

export interface Series {
  slug: SeriesSlug;
  name: LocalizedString;
  tagline: LocalizedString;
  /** 系列页顶部 hero 图(头图素材,与首页轮播图对应)。 */
  heroImage: string;
}
