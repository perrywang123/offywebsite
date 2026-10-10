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
 * 首页"最新资讯 · 揭晓"模块(NewsGrid):1 张大卡(feature)+ 4 张副卡(items)。
 * 卡片标题按 最新资讯.psd 逐个图层的原文登记(英文),中文沿用首页文案表,
 * 两者不是互译关系(PSD 没有中文稿)—— 若要中文也改成对应说法,需要运营给稿。
 * 布局固定在 NewsGrid.tsx,这里只是数据。
 *
 * 当前 5 张卡对应的真实商品(2026-10 由运营指定):
 *   1(大卡) CARAMEL RÊVE → warm-biscuit
 *   2       PETITE BUNNY → bunny-hug
 *   3       CLUB 28      → ace
 *   4       WANDERER     → wander
 *   5       NEON RUSH    → offy_redrush
 */
export const newsFeature = { image: "/assets/news/news-01.jpg", productCode: "warm-biscuit" };

export const newsItems: NewsItem[] = [
  { id: "daily-cute", title: { zh: "日常犯可爱", en: "Cute, Never Basic" }, image: "/assets/news/news-04.jpg", productCode: "bunny-hug" },
  { id: "weekend", title: { zh: "周末出门玩", en: "Weekend in Motion" }, image: "/assets/news/news-03.jpg", productCode: "ace" },
  { id: "fashion-life", title: { zh: "时尚潮流生活", en: "Chill in Style" }, image: "/assets/news/news-08.jpg", productCode: "wander" },
  { id: "fun-offy", title: { zh: "趣味潮流OFFY", en: "Born for Streets" }, image: "/assets/news/news-02.jpg", productCode: "offy_redrush" },
];

/**
 * 首页头图轮播(网站文字参考&图片替换/网站头图.psd,头图区 3250×2043):5 屏。
 * 底图沿用现有 hero-*.jpg(用户确认底图无需替换),本次只对齐**文字与布局**:
 * 文字内容/字号/字色/位置全部取自 PSD 图层(字号 = 引擎 FontSize × 图层 transform 缩放,
 * 位置 = 图层 bbox ÷ 头图区尺寸),详见 HeroCarousel.tsx 内的逐条百分比注释。
 *
 * PSD 分组 ↔ 底图 ↔ 文案(按分组内的智能对象底图认人,不按分组名):
 *   让想象落地,让陪伴发生      → hero-brand.jpg     黑字居中 slogan
 *   头图-活动奖励              → hero-promo.jpg    黑字 kicker + 两行大字
 *   OFFY 公主lady系列          → hero-princess.jpg 黑字
 *   OFFY 时尚潮流生活          → hero-streetwear.jpg 白字(dark)
 *   OFFY 趣味生活系列          → hero-playful.jpg  黑字
 *
 * 注:新 PSD 把「时尚潮流生活 / 趣味生活系列」两屏的**英文**标题互换了
 * (PSD: 时尚潮流生活→OFFY DRESS-UP SERIES,趣味生活系列→STREETWEAR SERIES·),
 * 与 resources/独立站首页文案.xlsx 的登记相反;此处按用户要求以 PSD 为准。
 * 唯一例外:PSD 该组标题尾部多打了一个 '·',经用户确认是笔误,已去掉。
 *
 * 标题文案的最终口径见 `独立站首页文案` Excel(2026-10):
 *  · 去掉品牌前缀 —— 英文「OFFY」与中文「Offy 」都去掉了;
 *  · **两屏文案对调**:PSD 把「DRESS-UP / Too Cute…」与「STREETWEAR / Weekend…」
 *    贴错了屏(Excel 标注「文案匹配错了」),已按文案表换回 ——
 *    街头屏(hero-streetwear)= STREETWEAR SERIES / Weekend in Motion,
 *    趣味屏(hero-playful)= DRESS-UP SERIES / Too Cute to Dress Normal。
 *    跳转链接本来就没错,只有文字贴错了。中文侧原本配对是对的,只去了前缀。
 * 中文标题与跳转链接未动(仍与文案表一致)。
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
      // kicker/促销语按 PSD 图层原文:'OFFY Big Sale: Bonus Gift Included' +
      // 'BUY ANY 3 OFFYs,\rGET A FREE BIG TOTE'(断行在逗号后,注意 'OFFYs' 的
      // 小写 s —— 效果图里就是小写,所以这行不做 uppercase)。
      kicker: { zh: "OFFY大促加赠", en: "OFFY Big Sale: Bonus Gift Included" },
      text: { zh: "即日起 任意购买\n3个公仔以上 送offy宝宝", en: "BUY ANY 3 OFFYs,\nGET A FREE BIG TOTE" },
    },
  },
  {
    image: "/assets/hero/hero-princess.jpg",
    bg: "#fefefe",
    href: "/collections/princess-lady",
    title: { zh: "公主系列", en: "Princess Series" },
    subtitle: { zh: "生活需要仪式感", en: "Romanticize the Everyday" },
  },
  {
    image: "/assets/hero/hero-streetwear.jpg",
    bg: "#d1c0b6",
    href: "/collections/outdoor-sporty",
    title: { zh: "时尚潮流生活", en: "STREETWEAR SERIES" },
    subtitle: { zh: "周末出去玩", en: "Weekend in Motion" },
    dark: true,
  },
  {
    image: "/assets/hero/hero-playful.jpg",
    bg: "#fefefe",
    href: "/collections/playful-life",
    title: { zh: "趣味生活系列", en: "DRESS-UP SERIES" },
    subtitle: { zh: "日常犯可爱", en: "Too Cute to Dress Normal" },
  },
];
