import type { LocalizedString, MerchSeriesSlug, Series } from "./types";
/** Site grouping for products outside tracked Shopify collections; it has no collection route. */
export const MERCH_SERIES_SLUG: MerchSeriesSlug = "merch";
export const merchSeriesName: LocalizedString = { en: "Goods", zh: "周边" };
/** Route/brand configuration only. Titles and membership must be read from Shopify. */
export const seriesList: Omit<Series, "name">[] = [
  {
    slug: "princess-lady",
    tagline: { zh: "让日常浪漫起来", en: "Romanticize the everyday" },
    heroImage: "/assets/hero/hero-02.jpg",
  },
  {
    slug: "outdoor-sporty",
    tagline: { zh: "为球场、街头与户外而生", en: "Weekend in motion" },
    heroImage: "/assets/hero/hero-03.jpg",
  },
  {
    slug: "playful-life",
    tagline: { zh: "黑皮 OFFY 的可爱日常", en: "Too cute to dress normal" },
    heroImage: "/assets/hero/hero-04.jpg",
  },
];

export const seriesMap: Record<string, Omit<Series, "name">> = Object.fromEntries(
  seriesList.map((s) => [s.slug, s]),
);
