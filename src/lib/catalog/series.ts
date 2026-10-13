import type { LocalizedString, MerchSeriesSlug, Series } from "./types";

/**
 * 哨兵系列值:商家发布了、但**不属于任何系列 Collection** 的商品(贴纸、帆布包
 * 这类非公仔周边)的归属值。线上实测(2026-10)全店 35 款已发布商品里有 2 款
 * 的 collections 为空:offy-tote-bag、offy-sticker-sheet。
 *
 * 类型定义在 `types.ts` 的 `MerchSeriesSlug`,此处是运行时值,两者由
 * `series.test.ts` 的断言钉住("merch" 字面量不允许漂移)。
 */
export const MERCH_SERIES_SLUG: MerchSeriesSlug = "merch";

/**
 * ⚠️ **占位文案,待老板确认正式名称** —— "Goods" / "周边" 是工程侧的中性占位,
 * 不是品牌文案(品牌名/系列名一律由老板定)。确认后只改这一处即可。
 */
export const merchSeriesName: LocalizedString = { zh: "周边", en: "Goods" };

/**
 * is.offy 三大系列 —— 与 Shopify Collections 一一对应:
 * Lady系列 / outdoor & sporty系列 / 趣味生活系列。
 *
 * 注意:merch 哨兵**不在这里** —— 它没有系列页,混进来会凭空多出一个
 * /collections/merch 的导航项与 sitemap 条目(线上会 404)。
 */
export const seriesList: Series[] = [
  {
    slug: "princess-lady",
    name: { zh: "公主lady系列", en: "Princess Lady" },
    tagline: { zh: "让日常浪漫起来", en: "Romanticize the everyday" },
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

/**
 * slug → 展示名。真实系列取系列表;`merch` 取上面的占位文案;其余返回 undefined
 * (调用方自行回退到 slug 原文)。
 *
 * 为什么需要它:merch 商品不在 `seriesList` 里(见上),详情页原先只能把
 * `product.series` 原文当名字显示,页面上就会出现裸的 "merch"。
 */
export function getSeriesName(slug: string): LocalizedString | undefined {
  return seriesMap[slug]?.name ?? (slug === MERCH_SERIES_SLUG ? merchSeriesName : undefined);
}
