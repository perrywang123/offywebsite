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
 * 首页头图轮播(网站素材0926/1、网站头图/网站头图.psd,3250×2041 头图区):5 屏。
 * 屏 1 品牌屏(hero-brand.jpg):is.offy 字标 + slogan(实时文字);
 * 屏 2 促销屏(hero-promo.jpg,4 张产品图已烤入背景):kicker「OFFY大促加赠」
 *   + 两行超大促销语(实时文字);
 * 屏 3-5 系列屏(公主lady/时尚潮流/趣味生活):副标题在上(小字)+ 主标题在下
 *   (超大字)+ 右侧与副标题同带的「查看详情」文字按钮跳系列页;
 *   时尚屏底部偏暗,文字用白色(dark),其余浅底黑字。
 *
 * 文案:促销语/slogan 按 2026 首页文案表(用户确认),布局/字号按新 PSD。
 * 标题/副标题/促销语均为实时双语文本,不再是烤字 PNG。
 */
export interface HeroSlideData {
  image: string;
  bg: string;
  href?: string;
  /** 屏 1 专用:展示 is.offy 手写体字标 PNG + slogan。 */
  wordmark?: boolean;
  /** 主文案(slogan),双语;允许用 "\n" 显式换行。 */
  text?: { zh: string; en: string };
  /** 屏 3-5:系列标题(实时文字,随语言切换)。 */
  title?: { zh: string; en: string };
  /** 屏 3-5:系列副标题(实时文字,随语言切换)。 */
  subtitle?: { zh: string; en: string };
  /** 屏 3-5:底部偏暗背景(标题/副标题/CTA 为白色)。 */
  dark?: boolean;
  /** 屏 2 专用:促销屏(kicker + 两行大字促销语,产品图已烤入背景)。 */
  promo?: {
    kicker: { zh: string; en: string };
    text: { zh: string; en: string };
  };
}

export const heroSlides: HeroSlideData[] = [
  {
    image: "/assets/hero/hero-brand.jpg",
    bg: "#bcc2c6",
    wordmark: true,
    text: { zh: "设计师玩具（大）差异化价值", en: "Designer Plush Art Toys\nMeet who you love to be." },
  },
  {
    image: "/assets/hero/hero-promo.jpg",
    bg: "#f7f2ef",
    promo: {
      kicker: { zh: "OFFY大促加赠", en: "OFFY MEGA GIVEAWAY" },
      // 两行大字的断行按两行视觉平衡选择(对齐 PSD 两行比例 69%/30%,
      // 避免首行过长顶到画面右缘)。
      text: { zh: "即日起 任意购买\n3个公仔以上 送offy宝宝", en: "BUY ANY 3 OFFYs, GET A\nFREE BIG TOTE" },
    },
  },
  {
    image: "/assets/hero/hero-princess.jpg",
    bg: "#fefefe",
    href: "/collections/princess-lady",
    title: { zh: "Offy 公主系列", en: "OFFY Princess Series" },
    subtitle: { zh: "生活需要仪式感", en: "Romanticize the Everyday" },
  },
  {
    image: "/assets/hero/hero-streetwear.jpg",
    bg: "#d1c0b6",
    href: "/collections/outdoor-sporty",
    title: { zh: "Offy 时尚潮流生活", en: "OFFY Streetwear Series" },
    subtitle: { zh: "周末出去玩", en: "Weekend in motion" },
    dark: true,
  },
  {
    image: "/assets/hero/hero-playful.jpg",
    bg: "#fefefe",
    href: "/collections/playful-life",
    title: { zh: "Offy 趣味生活系列", en: "OFFY Dress-up Series" },
    subtitle: { zh: "日常犯可爱", en: "Too cute to dress normal" },
  },
];
