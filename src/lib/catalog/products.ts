import type { Product, SeriesSlug } from "./types";

/**
 * is.offy product catalog —— 本地镜像 Shopify 商店(19 款已发布商品)。
 *
 * code = Shopify handle;骨架价 = Shopify 现价快照(供 Stripe/PayPal 备用渠道);
 * 展示字段(名/图/描/价)由 enrich 从 Shopify 实时覆盖。中文名为直译占位,
 * 后续在 Shopify(Translate & Adapt)正式配置。系列归属与 Shopify Collections
 * 一一对应:Lady系列 / outdoor & sporty系列 / 趣味生活系列。
 * Shopify 改价/上下架后,本文件只需同步骨架价与成员(单点维护)。
 */

const CDN = "https://cdn.shopify.com/s/files/1/0999/4174/4929/files";
const gid = (n: string) => `gid://shopify/ProductVariant/${n}`;

const SERIES_TAGS: Record<SeriesSlug, { zh: string[]; en: string[] }> = {
  "princess-lady": { zh: ["公主", "优雅"], en: ["princess", "elegant"] },
  "outdoor-sporty": { zh: ["户外", "运动"], en: ["outdoor", "sporty"] },
  "playful-life": { zh: ["日常", "可爱"], en: ["daily", "cute"] },
};

/** Shopify-mapped product: code = handle;展示字段由 enrich 实时覆盖。 */
function sp(
  handle: string,
  series: SeriesSlug,
  nameZh: string,
  nameEn: string,
  priceCents: number,
  imageFile: string,
  variantNum: string,
  opts: Partial<Product> = {},
): Product {
  const tags = SERIES_TAGS[series];
  return {
    code: handle,
    slug: handle,
    series,
    name: { zh: nameZh, en: nameEn },
    description: { zh: "", en: "" },
    priceCents,
    dimensions: null, // Shopify 未配尺寸;详情页尺寸区块对 null 隐藏
    images: [`${CDN}/${imageFile}`],
    emotionTags: { zh: tags.zh, en: tags.en },
    featured: false,
    isAvailable: true,
    isUpcoming: false,
    isQuoteOnly: false,
    sortOrder: 0,
    shopifyHandle: handle,
    shopifyVariantId: gid(variantNum),
    ...opts,
  };
}

export const products: Product[] = [
  // —— 公主lady系列(Lady系列,12 款;royal-grey 按图归入)——
  sp("swan-princess", "princess-lady", "天鹅公主", "SWAN PRINCESS", 4590, "12.jpg?v=1790114599", "53547334598945", { sortOrder: 10, featured: true }),
  sp("black-pearl", "princess-lady", "黑珍珠", "BLACK PEARL", 4590, "10.jpg?v=1790113567", "53547250549025", { sortOrder: 20, featured: true }),
  sp("pink-mallow", "princess-lady", "粉棉花糖", "PINK MALLOW", 4590, "09.jpg?v=1790113185", "53547209720097", { sortOrder: 30, featured: true }),
  sp("lemon-fizz", "princess-lady", "柠檬气泡", "LEMON FIZZ", 5190, "08.jpg?v=1790112061", "53547123278113", { sortOrder: 40, badge: "US" }),
  sp("mint-breeze", "princess-lady", "薄荷微风", "MINT BREEZE", 4590, "07.jpg?v=1790111893", "53547107516705", { sortOrder: 50 }),
  sp("warm-biscuit", "princess-lady", "暖烘饼干", "WARM BISCUIT", 4590, "06.jpg?v=1790111778", "53547101290785", { sortOrder: 60 }),
  sp("afternoon-muse", "princess-lady", "午后缪斯", "Afternoon Muse", 4590, "05.jpg?v=1790111323", "53547045683489", { sortOrder: 70 }),
  sp("british-noon", "princess-lady", "英伦午后", "BRITISH NOON", 4990, "04.jpg?v=1790111030", "53547009704225", { sortOrder: 80 }),
  sp("coastal-star", "princess-lady", "海岸之星", "COASTAL STAR", 4990, "03.jpg?v=1790110860", "53547001774369", { sortOrder: 90 }),
  sp("wild-sweetie", "princess-lady", "野性甜心", "WILD SWEETIE", 4590, "01.jpg?v=1790108803", "53546791665953", { sortOrder: 100 }),
  sp("cold-kitten", "princess-lady", "高冷小猫", "COLD KITTEN", 5190, "02.jpg?v=1790026339", "53542214893857", { sortOrder: 110, badge: "US" }),
  sp("royal-grey", "princess-lady", "皇家灰", "ROYAL GREY", 4590, "11.jpg?v=1790114065", "53547308122401", { sortOrder: 120 }),
  // —— outdoor & sporty系列(1 款)——
  sp("offy_redrush", "outdoor-sporty", "赤红冲锋", "RED RUSH", 0, "WeixinImage_20260912005511_33654_9.jpg?v=1789146147", "53491815579937", { sortOrder: 200, featured: true }),
  // —— 趣味生活系列(6 款;gurardian-angel 归入)——
  sp("prep-school", "playful-life", "预科少年", "PREP SCHOOL", 0, "5_33c88aeb-2ee1-44f9-a38d-285a42a73c89.jpg?v=1790116449", "53547386241313", { sortOrder: 300, featured: true }),
  sp("country-getaway", "playful-life", "乡间逃逸", "COUNTRY GETAWAY", 0, "4_19f01c0d-2820-4d89-9415-56d57730fd4c.jpg?v=1790115935", "53547355930913", { sortOrder: 310, featured: true }),
  sp("burger-doll", "playful-life", "汉堡娃娃", "BURGER DOLL", 0, "3_b805d6a5-ee63-4972-8ee8-af8a0808bf92.jpg?v=1790115648", "53547349573921", { sortOrder: 320 }),
  sp("mocha-painter", "playful-life", "摩卡画家", "MOCHA PAINTER", 4590, "2_ed238046-34af-4faf-a1a2-1ed42ad15341.jpg?v=1790115489", "53547347444001", { sortOrder: 330 }),
  sp("bunny-hug", "playful-life", "兔兔抱抱", "BUNNY HUG", 4990, "1_7fbba8f8-08d2-4291-af75-b381a7abe364.jpg?v=1790115065", "53547344232737", { sortOrder: 340 }),
  sp("gurardian-angel", "playful-life", "守护天使", "GURARDIAN ANGEL", 0, "6.jpg?v=1790116883", "53547420877089", { sortOrder: 350 }),
];

/** 更多新品,敬请期待 —— 时尚包挂系列预告(发布时间以 INS 为准)。 */
export const teaserSeries = {
  name: { zh: "时尚包挂系列", en: "Fashionable Bag Charm Collection" },
  /** 详情页 hero 超大英文标题(设计稿连写两行)。 */
  titleEn: "FASHIONABLEBAG CHARM COLLECTION",
  // 2026 首页文案表第 24 行:无对应中文原文,中英两版均使用英文原文。
  note: { zh: "Follow @is.offy on Instagram for drop dates.", en: "Follow @is.offy on Instagram for drop dates." },
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

export const upcomingIps: UpcomingIp[] = [
  {
    code: "MISS-KITTY",
    name: { zh: "Miss Kitty", en: "Miss Kitty" },
    // 标语里的 \n 是 PSD 的显式断行(设计稿就是两行),不是排版折行
    tagline: { zh: "A spoiled princess with\na tender heart.", en: "A spoiled princess with\na tender heart." },
    image: "/assets/home/upcoming-kitty.png",
  },
  {
    // 旧版这里叫 PSYCHE;后续计划.psd 已定名 Butterfly Sprite。
    code: "BUTTERFLY-SPRITE",
    name: { zh: "Butterfly Sprite", en: "Butterfly Sprite" },
    tagline: { zh: "Soul & Butterfly,\ngentle but mysterious.", en: "Soul & Butterfly,\ngentle but mysterious." },
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
