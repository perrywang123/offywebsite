import type { Series } from "./types";

/**
 * is.offy 三大系列 —— 与 Shopify Collections 一一对应:
 * Lady系列 / outdoor & sporty系列 / 趣味生活系列。
 */
export const seriesList: Series[] = [
  {
    slug: "princess-lady",
    name: { zh: "公主lady系列", en: "Princess Lady" },
    tagline: { zh: "黑皮 OFFY 的优雅化身", en: "Her most elegant avatars" },
    heroImage: "/assets/hero/hero-02.jpg",
  },
  {
    slug: "outdoor-sporty",
    name: { zh: "时尚潮流生活", en: "Fashion Lifestyle" },
    tagline: { zh: "为球场、街头与户外而生", en: "Built for the court, street, and outdoors" },
    heroImage: "/assets/hero/hero-04.jpg",
  },
  {
    slug: "playful-life",
    name: { zh: "趣味生活系列", en: "Playful Life" },
    tagline: { zh: "黑皮 OFFY 的可爱日常", en: "Her playful everyday moments" },
    heroImage: "/assets/hero/hero-03.jpg",
  },
];

export const seriesMap: Record<string, Series> = Object.fromEntries(
  seriesList.map((s) => [s.slug, s]),
);

export function getSeries(slug: string): Series | undefined {
  return seriesMap[slug];
}
