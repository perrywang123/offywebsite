export type SeriesSlug =
  | "bag-charm"
  | "signature"
  | "multi-texture"
  | "recycled-eco"
  | "active-sporty"
  | "outdoor-lifestyle"
  | "princess-elegance"
  | "playful"
  | "large-plush";

export interface LocalizedString {
  en: string;
  zh: string;
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
}

export interface Series {
  slug: SeriesSlug;
  name: LocalizedString;
  tagline: LocalizedString;
}
