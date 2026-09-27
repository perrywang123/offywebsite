/**
 * Editorial content (non-catalog): homepage news cards and hero landing pages.
 * 资讯详情页为后续里程碑,当前卡片纯展示。
 */

export interface NewsItem {
  id: string;
  title: { zh: string; en: string };
  image: string;
}

/** 资讯主卡(左大图):新品上市 · 仪式感生活专题;badge/标题/CTA 文案走 messages。 */
export const newsFeature = { image: "/assets/news/news-01.jpg", href: "/products" };

/** 最新资讯 · 揭晓 —— 右侧 2×2 副卡(设计稿:日常犯可爱/周末出门玩/时尚潮流生活/趣味潮流OFFY)。 */
export const newsItems: NewsItem[] = [
  { id: "daily-cute", title: { zh: "日常犯可爱", en: "Everyday cute" }, image: "/assets/news/news-04.jpg" },
  { id: "weekend", title: { zh: "周末出门玩", en: "Weekend outing" }, image: "/assets/news/news-03.jpg" },
  { id: "fashion-life", title: { zh: "时尚潮流生活", en: "Fashion Lifestyle" }, image: "/assets/news/news-08.jpg" },
  { id: "fun-offy", title: { zh: "趣味潮流OFFY", en: "Playful trendy Offy" }, image: "/assets/news/news-02.jpg" },
];

/**
 * 首页头图轮播(设计稿精确还原):5 屏。
 * 屏 1 品牌全员图(hero-01):顶部居中 is.offy 手写体字标(PSD LOGO 图层)
 *   + 两行 slogan「让想象落地 / 让陪伴发生」,不可点击;
 * 屏 2 促销合成屏(PSD「头图-活动奖励」组):白底 + 左玩偶图 + 右 2×2 包包图
 *   + 左下促销文案 PNG(PSD 文字层导出,精确字体),不可点击;
 * 屏 3-5 系列图(hero-02 公主lady / hero-04 时尚潮流生活 / hero-03 趣味生活):
 *   顶部居中「OFFY + 系列名」标题 PNG(PSD 文字层导出),点击跳对应系列页。
 */
export interface HeroSlideData {
  image: string;
  bg: string;
  href?: string;
  /** 屏 1 专用:展示 is.offy 手写体字标 PNG + 两行 slogan。 */
  wordmark?: boolean;
  /** 主文案(slogan),双语。 */
  text?: { zh: string; en: string };
  /** 屏 3-5:「OFFY + 系列名」标题 PNG(PSD 文字层导出)。 */
  titleImage?: string;
  /** 屏 2 专用:PSD 合成促销屏(玩偶 + 2×2 包包图 + 文案 PNG)。 */
  promo?: {
    doll: string;
    bags: [string, string, string, string];
    text: string;
  };
}

export const heroSlides: HeroSlideData[] = [
  {
    image: "/assets/hero/hero-01.jpg",
    bg: "#babbb9",
    wordmark: true,
    text: { zh: "让想象落地\n让陪伴发生", en: "Let imagination land\nLet companionship happen" },
  },
  {
    image: "/assets/hero/promo/doll.png",
    bg: "#ffffff",
    promo: {
      doll: "/assets/hero/promo/doll.png",
      bags: [
        "/assets/hero/promo/bag-1.png",
        "/assets/hero/promo/bag-2.png",
        "/assets/hero/promo/bag-3.png",
        "/assets/hero/promo/bag-4.png",
      ],
      text: "/assets/hero/promo/promo-text.png",
    },
  },
  {
    image: "/assets/hero/hero-02.jpg",
    bg: "#fefefe",
    href: "/collections/princess-lady",
    titleImage: "/assets/hero/titles/princess-lady.png",
  },
  {
    image: "/assets/hero/hero-04.jpg",
    bg: "#fefefe",
    href: "/collections/outdoor-sporty",
    titleImage: "/assets/hero/titles/fashion-life.png",
  },
  {
    image: "/assets/hero/hero-03.jpg",
    bg: "#c9b8ab",
    href: "/collections/playful-life",
    titleImage: "/assets/hero/titles/playful-life.png",
  },
];
