/** Editorial brand assets and old-handle redirects. No commercial product facts. */
/** 更多新品,敬请期待 —— 时尚包挂系列预告(发布时间以 INS 为准)。 */
export const teaserSeries = {
  name: { zh: "时尚包挂系列", en: "Fashionable Bag Charm Collection" },
  /** 详情页 hero 超大英文标题(设计稿连写两行)。 */
  titleEn: "FASHIONABLEBAG CHARM COLLECTION",
  // 2026 首页文案表第 24 行:无对应中文原文,中英两版均使用英文原文。
  note: {
    zh: "Follow @is.offy on Instagram for drop dates.",
    en: "Follow @is.offy on Instagram for drop dates.",
  },
  heroImage: "/assets/teaser/teaser-hero.jpg",
  /** bag-charm 详情页 hero 双图(更多新品.psd:左 1888×1888 方形玩偶图 + 右 1308×1744 竖图)。 */
  heroLeft: "/assets/bag-charm/hero-left.png",
  heroRight: "/assets/bag-charm/hero-right.png",
  /** 预告详情页 6 张产品卡(更多新品.psd 提取,编码为设计稿占位款号)。 */
  items: [
    { code: "WCOFFY-XXX01", image: "/assets/bag-charm/prod-1.png" },
    { code: "WCOFFY-XXX02", image: "/assets/bag-charm/prod-2.png" },
    { code: "WCOFFY-XXX03", image: "/assets/bag-charm/prod-3.png" },
    { code: "WCOFFY-XXX04", image: "/assets/bag-charm/prod-4.png" },
    { code: "WCOFFY-XXX05", image: "/assets/bag-charm/prod-5.png" },
    { code: "WCOFFY-XXX06", image: "/assets/bag-charm/prod-6.png" },
  ],
};

// Upcoming IP (预告,不可售) —— 首页「后续计划」模块(后续计划.psd,画布 3195×1245)。
// PSD 只有英文稿,中英两版同文案;角色插画从 PSD 的智能对象导出(透明底)。
// 卡片视觉:点阵底 + 右侧溢出卡片的角色插画 + IN DEVELOPMENT 胶囊 + 名字 + 居中两行标语。
export interface UpcomingIp {
  code: string;
  name: { zh: string; en: string };
  tagline: { zh: string; en: string };
  /** 角色插画(透明底 PNG,从 PSD 智能对象导出)。 */
  image: string;
}

/**
 * 改过 handle 的商品:旧 handle → 当前 handle。
 *
 * 为什么需要:商品详情 URL 用的是 Shopify 的 handle(`toLiveProduct` 里 `code = item.handle`),
 * 所以**新链接会自动跟着 Shopify 走**。但 Shopify 改 handle 之后,旧 URL 在我们站上
 * 既查不到商品、也没有任何跳转 —— 外链、收藏、搜索结果会直接 404。Shopify 自己的店铺
 * 前台会为重命名的 handle 保留跳转,Storefront API 不暴露这份历史,只能我们自己记。
 *
 * 用法:在 Shopify 后台改了某个商品的 handle 之后,把旧值补进来,例如
 *   export const productHandleAliases = { "offy-red-rush": "neon-rush" };
 * 详情页会给旧 URL 发 308 永久跳转到新地址。
 */
export const productHandleAliases: Record<string, string> = {
  // 目前没有需要重定向的历史 handle。
};

export const upcomingIps: UpcomingIp[] = [
  {
    code: "MISS-KITTY",
    name: { zh: "Miss Kitty", en: "Miss Kitty" },
    // 标语里的 \n 是 PSD 的显式断行(设计稿就是两行),不是排版折行
    tagline: {
      zh: "A spoiled princess with\na tender heart.",
      en: "A spoiled princess with\na tender heart.",
    },
    image: "/assets/home/upcoming-kitty.png",
  },
  {
    // 旧版这里叫 PSYCHE;后续计划.psd 已定名 Butterfly Sprite。
    code: "BUTTERFLY-SPRITE",
    name: { zh: "Butterfly Sprite", en: "Butterfly Sprite" },
    tagline: {
      zh: "Soul & Butterfly,\ngentle but mysterious.",
      en: "Soul & Butterfly,\ngentle but mysterious.",
    },
    image: "/assets/home/upcoming-butterfly.png",
  },
];

// OF 联名/定制系列(14 款,询价不标价)— 面向品牌和创作者开放定制和联名合作。
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
