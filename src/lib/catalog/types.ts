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
  /** Price in USD cents (integer) — never floating point. */
  priceCents: number;
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
}

export interface Series {
  slug: SeriesSlug;
  name: LocalizedString;
  tagline: LocalizedString;
  /** 系列页顶部 hero 图(头图素材,与首页轮播图对应)。 */
  heroImage: string;
}
