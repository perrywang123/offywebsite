/**
 * Editorial content (non-catalog): homepage news cards and hero landing pages.
 * 资讯详情页为后续里程碑,当前卡片纯展示。
 */

export interface NewsItem {
  id: string;
  title: { zh: string; en: string };
  image: string;
  /**
   * Shopify handle(= 商品详情页路由 code),点击卡片跳转到 /products/${productCode}。
   * 必须是当前 Shopify 真实在售的 handle —— 若填错/该商品下架,链接会指向 404,
   * 这是预期行为(不做隐藏兜底,方便运营第一时间发现配置错误)。
   */
  productCode: string;
}

/**
 * 首页"最新资讯 · 揭晓"模块(NewsGrid):1 张大卡(feature) + 4 张副卡(items),
 * 每张卡 = 宣传图 + 宣传文案(本文件维护) + 跳转目标(Shopify 商品 handle)。
 * 布局固定在 NewsGrid.tsx,这里只是数据——后续要换宣传图/文案/跳转商品,
 * 只需改这个文件,不需要碰组件代码。
 *
 * 当前 5 张卡对应的真实商品(2026-10 由运营指定,标题随 Shopify 改名自动同步,
 * 这里登记的 handle 是跳转用的稳定路由标识符,不会随改名变化):
 *   1(大卡) CARAMEL RÊVE → warm-biscuit
 *   2       PETITE BUNNY → bunny-hug
 *   3       CLUB 28      → ace
 *   4       WANDERER     → wander
 *   5       NEON RUSH    → offy_redrush
 */
export const newsFeature = { image: "/assets/news/news-01.jpg", productCode: "warm-biscuit" };

export const newsItems: NewsItem[] = [
  { id: "daily-cute", title: { zh: "日常犯可爱", en: "Everyday cute" }, image: "/assets/news/news-04.jpg", productCode: "bunny-hug" },
  { id: "weekend", title: { zh: "周末出门玩", en: "Weekend outing" }, image: "/assets/news/news-03.jpg", productCode: "ace" },
  { id: "fashion-life", title: { zh: "时尚潮流生活", en: "Fashion Lifestyle" }, image: "/assets/news/news-08.jpg", productCode: "wander" },
  { id: "fun-offy", title: { zh: "趣味潮流OFFY", en: "Playful trendy Offy" }, image: "/assets/news/news-02.jpg", productCode: "offy_redrush" },
];

/**
 * 首页头图轮播(主 PSD UI 树精确还原):5 屏。
 * 屏 1 品牌全员图:is.offy 字标(PSD 头图-1 矢量层,596×224)+ slogan,不可点击;
 * 屏 2 促销合成屏(PSD「头图-活动奖励」组):白底 + 左大玩偶(2882×1905 裁本体)
 *   + 右 2×2 包包图 + 左下促销文案,不可点击;
 * 屏 3-5 系列屏(PSD 头图-2/3/4):玩偶图上半 + 左下标题组 ——
 *   标题 + 副标题 +「查看详情」按钮跳系列页;
 *   时尚屏深色背景白字(dark),其余浅底黑字。
 *
 * 2026 首页文案表(resources/独立站首页文案.xlsx)落地后,标题/副标题/促销语
 * 改为由本文件维护的实时双语文本直接渲染,不再是设计稿导出的 PNG ——
 * PNG 无法跟随语言切换,也无法在不重新出图的情况下改文案。
 */
export interface HeroSlideData {
  image: string;
  bg: string;
  href?: string;
  /** 屏 1 专用:展示 is.offy 手写体字标 PNG + slogan。 */
  wordmark?: boolean;
  /** 主文案(slogan),双语;en 允许用 "\n" 换行(如两行标语)。 */
  text?: { zh: string; en: string };
  /** 屏 3-5:系列标题(实时文字,随语言切换)。 */
  title?: { zh: string; en: string };
  /** 屏 3-5:系列副标题(实时文字,随语言切换)。 */
  subtitle?: { zh: string; en: string };
  /** 屏 3-5:深色背景(标题/副标题为白色)。 */
  dark?: boolean;
  /** 屏 2 专用:PSD 合成促销屏(玩偶 + 2×2 包包图 + 实时促销文字)。 */
  promo?: {
    doll: string;
    bags: [string, string, string, string];
    text: { zh: string; en: string };
  };
}

export const heroSlides: HeroSlideData[] = [
  {
    image: "/assets/hero/hero-01.jpg",
    bg: "#babbb9",
    wordmark: true,
    text: { zh: "设计师玩具（大）差异化价值", en: "Designer Plush Art Toys\nMeet who you love to be." },
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
      text: { zh: "即日起 任意购买3个公仔以上 送offy宝宝", en: "BUY ANY 3 OFFYs, GET A FREE BIG TOTE" },
    },
  },
  {
    image: "/assets/hero/hero-02.jpg",
    bg: "#f9f9f9",
    href: "/collections/princess-lady",
    title: { zh: "Offy 公主系列", en: "OFFY Princess Series" },
    subtitle: { zh: "生活需要仪式感", en: "Romanticize the Everyday" },
  },
  {
    image: "/assets/hero/hero-04.jpg",
    bg: "#3a383c",
    href: "/collections/outdoor-sporty",
    title: { zh: "Offy 时尚潮流生活", en: "OFFY Streetwear Series" },
    subtitle: { zh: "周末出去玩", en: "Weekend in motion" },
    dark: true,
  },
  {
    image: "/assets/hero/hero-03.jpg",
    bg: "#fdfdfd",
    href: "/collections/playful-life",
    title: { zh: "Offy 趣味生活系列", en: "OFFY Dress-up Series" },
    subtitle: { zh: "日常犯可爱", en: "Too cute to dress normal" },
  },
];
