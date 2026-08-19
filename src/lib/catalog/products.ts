import type { Product, SeriesSlug } from "./types";

/**
 * Offy product catalog (single source of truth for the storefront).
 *
 * NOTE: names / prices / image↔code mapping are PROVISIONAL placeholders, as
 * flagged in docs/brand-brief.md §9. Fix them here only — the UI and checkout
 * read exclusively from this file. Prices are integer USD cents.
 */

const CLASSIC_DIMENSIONS = { heightCm: 18, lengthCm: 7.5, headCm: 24, armCm: 3.5, legCm: 3.5 };

function p(
  code: string,
  series: SeriesSlug,
  nameZh: string,
  nameEn: string,
  priceCents: number,
  image: string,
  emotionTagsZh: string[],
  emotionTagsEn: string[],
  opts: Partial<Product> = {},
): Product {
  return {
    code,
    slug: code.toLowerCase(),
    series,
    name: { zh: nameZh, en: nameEn },
    description: { zh: "", en: "" },
    priceCents,
    dimensions:
      series === "large-plush" || series === "bag-charm" ? null : CLASSIC_DIMENSIONS,
    images: [image],
    emotionTags: { zh: emotionTagsZh, en: emotionTagsEn },
    featured: false,
    isAvailable: true,
    isUpcoming: false,
    isQuoteOnly: false,
    sortOrder: 0,
    ...opts,
  };
}

const img = (n: number, ext = "png") => `/assets/products/p${String(n).padStart(2, "0")}.${ext}`;

export const products: Product[] = [
  p("PCOF1-F0", "bag-charm", "时尚包挂 Offy", "Offy Bag Charm", 2200, img(1), ["包挂", "随身", "可爱"], ["charm", "portable", "cute"], { featured: true, sortOrder: 10 }),
  p("PCOF1-F1", "signature", "经典原皮 Offy", "Offy Signature Classic", 4500, img(2), ["原皮", "经典"], ["classic", "original"], { featured: true, sortOrder: 20 }),
  p("PCOF1-F2", "signature", "经典暮色 Offy", "Offy Signature Dusk", 4500, img(3), ["暮色", "温柔"], ["dusk", "soft"], { sortOrder: 21 }),
  p("PCOF1-F3", "signature", "经典花瓣 Offy", "Offy Signature Petal", 4500, img(4), ["花瓣", "甜美"], ["petal", "sweet"], { sortOrder: 22 }),
  p("PCOF1-F4", "multi-texture", "金属质感 Offy", "Offy Metallic Edition", 4900, img(5), ["金属", "未来"], ["metallic", "futuristic"], { featured: true, sortOrder: 30 }),
  p("PCOF1-F5", "multi-texture", "双色金属 Offy", "Offy Two-Tone Metallic", 4900, img(6), ["双色", "金属"], ["two-tone", "metallic"], { sortOrder: 31 }),
  p("PCOF1-F6", "multi-texture", "环保再生 Offy", "Offy Recycled Edition", 4900, img(7), ["环保", "再生"], ["eco", "recycled"], { sortOrder: 32 }),
  p("PCOF1-F7", "recycled-eco", "大地再生 Offy", "Offy Eco Earth", 5500, img(8), ["大地", "自然"], ["earth", "nature"], { sortOrder: 40 }),
  p("PCOF1-F8", "recycled-eco", "植感再生 Offy", "Offy Eco Bloom", 5500, img(9), ["植感", "生机"], ["bloom", "organic"], { sortOrder: 41 }),
  p("PCOF1-A3", "active-sporty", "网球甜心 Offy", "Offy Tennis Ace", 4500, img(10), ["网球", "元气"], ["tennis", "sporty"], { featured: true, sortOrder: 50 }),
  p("PCOF1-A4", "active-sporty", "街头小子 Offy", "Offy Street Player", 4500, img(11), ["街头", "球场"], ["street", "court"], { sortOrder: 51 }),
  p("PCOF1-B2", "outdoor-lifestyle", "野餐自然 Offy", "Offy Picnic Day", 4500, img(12), ["野餐", "自然"], ["picnic", "nature"], { sortOrder: 60 }),
  p("PCOF1-B3", "outdoor-lifestyle", "城市漫步 Offy", "Offy City Stroll", 4500, img(13), ["城市", "漫步"], ["city", "stroll"], { sortOrder: 61 }),
  p("PCOF1-B4", "outdoor-lifestyle", "聚会派对 Offy", "Offy Party Night", 4500, img(14), ["聚会", "派对"], ["party", "night"], { sortOrder: 62 }),
  p("PCOF1-C2", "princess-elegance", "下午茶 Offy", "Offy Afternoon Tea", 4500, img(15, "jpg"), ["下午茶", "优雅"], ["tea", "elegant"], { sortOrder: 70 }),
  p("PCOF1-C3", "princess-elegance", "展览缪斯 Offy", "Offy Gallery Muse", 4500, img(16), ["展览", "缪斯"], ["gallery", "muse"], { sortOrder: 71 }),
  p("PCOF1-C4", "princess-elegance", "日常优雅 Offy", "Offy Everyday Elegance", 4500, img(17), ["日常", "优雅"], ["everyday", "elegance"], { sortOrder: 72 }),
  p("PCOF1-C5", "princess-elegance", "优雅公主 Offy", "Offy Princess", 4500, img(18), ["公主", "精致"], ["princess", "refined"], { featured: true, sortOrder: 73 }),
  p("PCOF1-D1", "playful", "玩乐时刻 Offy", "Offy Playtime", 4500, img(19), ["玩乐", "搞怪"], ["play", "whimsy"], { sortOrder: 80 }),
  p("PCOF1-L0", "large-plush", "大号原皮 Offy", "Offy Original Large", 9900, img(20), ["大号", "原皮"], ["large", "original"], { featured: true, sortOrder: 90 }),
  p("PCOF1-L1", "large-plush", "泰国限定 Offy", "Offy Thailand Exclusive Large", 11900, img(21), ["泰国", "限定"], ["thailand", "exclusive"], { sortOrder: 91 }),
  // —— 以下 8 款为「待揭晓」占位（图↔编码精确映射待确认，见 brand-brief §9）——
  p("PCOF1-P22", "signature", "造型 22", "Look No.22", 4500, img(22), ["待揭晓"], ["revealing"], { isUpcoming: true, isAvailable: false, sortOrder: 100 }),
  p("PCOF1-P23", "signature", "造型 23", "Look No.23", 4500, img(23), ["待揭晓"], ["revealing"], { isUpcoming: true, isAvailable: false, sortOrder: 101 }),
  p("PCOF1-P24", "signature", "造型 24", "Look No.24", 4500, img(24), ["待揭晓"], ["revealing"], { isUpcoming: true, isAvailable: false, sortOrder: 102 }),
  p("PCOF1-P25", "signature", "造型 25", "Look No.25", 4500, img(25), ["待揭晓"], ["revealing"], { isUpcoming: true, isAvailable: false, sortOrder: 103 }),
  p("PCOF1-P26", "signature", "造型 26", "Look No.26", 4500, img(26), ["待揭晓"], ["revealing"], { isUpcoming: true, isAvailable: false, sortOrder: 104 }),
  p("PCOF1-P27", "signature", "造型 27", "Look No.27", 4500, img(27), ["待揭晓"], ["revealing"], { isUpcoming: true, isAvailable: false, sortOrder: 105 }),
  p("PCOF1-P28", "signature", "造型 28", "Look No.28", 4500, img(28), ["待揭晓"], ["revealing"], { isUpcoming: true, isAvailable: false, sortOrder: 106 }),
  p("PCOF1-P29", "signature", "造型 29", "Look No.29", 4500, img(29, "jpg"), ["待揭晓"], ["revealing"], { isUpcoming: true, isAvailable: false, sortOrder: 107 }),
];

// Upcoming IP (预告，不可售) — displayed on the brand/about page, not in the shop grid.
export const upcomingIps = [
  {
    code: "MISS-KITTY",
    name: { zh: "千金猫 Miss Kitty", en: "Miss Kitty" },
    tagline: { zh: "即将登场 · 千金大小姐，傲娇但心软", en: "Coming soon · The heiress, proud but soft-hearted" },
  },
  {
    code: "PSYCHE",
    name: { zh: "灵魂与蝴蝶女神 Psyche", en: "Psyche — The Soul & Butterfly Goddess" },
    tagline: { zh: "即将登场 · 灵魂与蝴蝶女神，温柔而神秘", en: "Coming soon · Soul & Butterfly, gentle and mysterious" },
  },
];

// OF 联名/定制系列（14 款，询价不标价）—「其他形象」的简单展示，走定制咨询。
export const collabLooks = [
  "OF 02",
  "OF 03",
  "OF 2.2",
  "OF 2.4_1",
  "OF 2.6",
  "OF 2.11",
  "OF 2.12",
  "OF 2.13",
  "OF 2.31",
  "OF 2.32",
  "OF 2.42",
  "OF 2.51",
  "OF 2.52",
  "OF 3.1",
];
