import type { Product, Series, SeriesSlug } from "../../lib/catalog/types";
import { getProductByCode, getProductsBySeries, seriesList } from "../../lib/catalog";
import { products as localProducts } from "../../lib/catalog/products";
import {
  fetchShopifyCollectionProducts,
  fetchShopifyCollections,
  type ShopifyCollectionProductItem,
} from "../shopify/catalog";
import { fetchProductData } from "../shopify/products";

/**
 * 实时目录层(live catalog)—— 修复的核心问题:本地 `lib/catalog/{series,products}.ts`
 * 是手写死的静态快照,从未真正对接过 Shopify 的 Collections API,"这个系列里有哪些
 * 商品"这件事完全不随 Shopify 实际上下架/调整而变化(已用真实店铺数据核实:
 * outdoor-sporty 系列本地只有 1 款,Shopify 实际 12 款;另有 16 款已发布商品
 * 本地完全没有记录)。本模块让"系列名称 + 系列成员 + 每款商品的标题/图片/价格/
 * 库存/结算变体 ID"在**每次请求时**都直接向 Shopify 实时拉取(沿用全站已有的
 * `next: { revalidate: 60 }` 近实时缓存节奏),本地静态数据降级为"Shopify 连不上
 * 时的兜底",不再是主数据源。
 *
 * 下游使用方:
 * - 展示页(首页/商品页/系列页/商品详情页/导航栏/sitemap/公开 API)用
 *   `getLive*` 系列函数渲染"看得到"的内容。
 * - 结算三条通道(Stripe/PayPal/Shopify)用 `getLiveProductByCode` 解析
 *   "买得到"的商品(价格/库存/变体 ID),保证本次新发现的 16 款商品不仅
 *   前台可见,也能真正走通下单——否则只修展示层会出现"看得到买不了"。
 */

/**
 * 路由 slug → 真实 Shopify Collection handle。
 * 这条映射本身很少变(只有商家在 Shopify 后台新建/重命名/删除整个 Collection
 * 这种小概率的结构性调整才需要手动更新一行),真正高频变化的"系列里有哪些
 * 商品"完全不在这里维护,而是每次请求时实时查询。
 */
const SERIES_SHOPIFY_HANDLE: Record<SeriesSlug, string> = {
  "princess-lady": "frontpage",
  "outdoor-sporty": "outdoor-sporty系列",
  "playful-life": "趣味生活系列",
};

const SHOPIFY_HANDLE_TO_SERIES: Partial<Record<string, SeriesSlug>> = Object.fromEntries(
  (Object.entries(SERIES_SHOPIFY_HANDLE) as [SeriesSlug, string][]).map(([slug, handle]) => [handle, slug]),
);

/**
 * 系列中文名精修表 —— Shopify 侧目前未配置多语言(@inContext(language) 实测
 * 仍返回英文原文),中文名沿用人工精修译名;英文名以 Shopify Collection 的
 * `title` 为准(商家在后台改标题,网站下一次请求即生效)。
 */
const SERIES_ZH_NAME: Record<SeriesSlug, string> = {
  "princess-lady": "公主lady系列",
  "outdoor-sporty": "街头潮流系列",
  "playful-life": "趣味生活系列",
};

/** 已知商品 handle 的本地中文精修译名;未命中(全新上架商品)时回退 Shopify 英文标题。 */
const CURATED_ZH_PRODUCT_NAMES: Record<string, string> = Object.fromEntries(
  localProducts.map((p) => [p.code, p.name.zh]),
);

/** 系列情绪标签沿用本地人工精修值(与具体商品无关,整系列统一)。 */
const SERIES_TAGS: Record<SeriesSlug, { zh: string[]; en: string[] }> = {
  "princess-lady": { zh: ["公主", "优雅"], en: ["princess", "elegant"] },
  "outdoor-sporty": { zh: ["街头", "潮流"], en: ["streetwear", "urban"] },
  "playful-life": { zh: ["日常", "可爱"], en: ["daily", "cute"] },
};

/** 实时数据缺图时的占位图(理论上不会触发,Shopify 已发布商品均有主图)。 */
const FALLBACK_IMAGE = "/assets/hero/hero-01.jpg";

function toLiveProduct(item: ShopifyCollectionProductItem, series: SeriesSlug, sortOrder: number): Product {
  const tags = SERIES_TAGS[series];
  const local = getProductByCode(item.handle);
  return {
    code: item.handle,
    slug: item.handle,
    series,
    name: { en: item.title || local?.name.en || item.handle, zh: CURATED_ZH_PRODUCT_NAMES[item.handle] ?? item.title },
    description: local?.description ?? { zh: "", en: "" },
    // 只有确认是 USD 才采纳 Shopify 实时价,避免把非美元金额当美元显示(币种串味)。
    priceCents: item.currency === "USD" ? item.priceCents : (local?.priceCents ?? 0),
    dimensions: local?.dimensions ?? null,
    images: item.image ? [item.image] : (local?.images ?? [FALLBACK_IMAGE]),
    emotionTags: local?.emotionTags ?? tags,
    // 没有可靠的实时"新品"信号(Shopify 侧无对应约定字段),沿用本地已知商品的
    // 精选标记(驱动卡片上的"新品"小标签);全新上架、本地未记录的商品默认不显示。
    featured: local?.featured ?? false,
    isAvailable: item.available,
    isUpcoming: false,
    isQuoteOnly: false,
    sortOrder,
    badge: local?.badge,
    shopifyHandle: item.handle,
    shopifyVariantId: item.variantId ?? local?.shopifyVariantId,
    skuCode: item.sku ?? undefined,
  };
}

/** 实时系列列表:英文名随 Shopify Collection 标题变化;中文名人工精修;
 * 整体结构(slug/heroImage/tagline)仍是本地编辑态资产,不属于"商品信息"。
 * Shopify 不可达时整体回退本地静态 `seriesList`。 */
export async function getLiveSeriesList(): Promise<Series[]> {
  try {
    const live = await fetchShopifyCollections();
    const byHandle = new Map(live.map((c) => [c.handle, c]));
    return seriesList.map((local) => {
      const handle = SERIES_SHOPIFY_HANDLE[local.slug];
      const remote = byHandle.get(handle);
      if (!remote) return local;
      return { ...local, name: { en: remote.title || local.name.en, zh: SERIES_ZH_NAME[local.slug] } };
    });
  } catch (error) {
    console.error("getLiveSeriesList: Shopify unreachable, falling back to local series list", error);
    return seriesList;
  }
}

/** 单个系列的实时商品清单(完整反映 Shopify 当前的 Collection 成员,而非本地
 * 快照);任一环节失败均整体回退该系列的本地静态清单,保证页面始终可渲染。 */
export async function getLiveProductsBySeries(slug: SeriesSlug): Promise<Product[]> {
  const handle = SERIES_SHOPIFY_HANDLE[slug];
  try {
    const items = await fetchShopifyCollectionProducts(handle);
    return items.map((item, i) => toLiveProduct(item, slug, i * 10));
  } catch (error) {
    console.error(`getLiveProductsBySeries(${slug}): Shopify unreachable, falling back to local roster`, error);
    return getProductsBySeries(slug);
  }
}

/** 全量实时商品(3 个系列拼合),用于 /products 全量页、sitemap、公开 API。 */
export async function getLiveProducts(): Promise<Product[]> {
  const slugs = Object.keys(SERIES_SHOPIFY_HANDLE) as SeriesSlug[];
  const perSeries = await Promise.all(slugs.map((s) => getLiveProductsBySeries(s)));
  return perSeries.flat();
}

/**
 * 首页"New Looks"(最新造型曝光):每个系列取**最新上架**的 N 款(默认 2 款,
 * 3 系列共 6 款)——按 Shopify 商品 createdAt 降序排序,而不是 Collection
 * 后台的手工排列顺序;商家新上架一款商品,下一次请求即进入本模块。
 * 过滤不可售款(售罄/下架不占位)。Shopify 不可达时按系列回退本地清单前 N 款。
 */
export async function getLiveNewLooksProducts(perSeries = 2): Promise<Product[]> {
  const slugs = Object.keys(SERIES_SHOPIFY_HANDLE) as SeriesSlug[];
  const perSeriesResults = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const items = await fetchShopifyCollectionProducts(SERIES_SHOPIFY_HANDLE[slug]);
        return items
          .filter((item) => item.available)
          .sort((a, b) => {
            // createdAt 缺失的旧数据视为最旧,排在最后
            const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
            const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
            return tb - ta;
          })
          .slice(0, perSeries)
          .map((item, i) => toLiveProduct(item, slug, i * 10));
      } catch (error) {
        console.error(`getLiveNewLooksProducts(${slug}): Shopify unreachable, falling back to local roster`, error);
        return getProductsBySeries(slug)
          .filter((p) => p.isAvailable)
          .slice(0, perSeries);
      }
    }),
  );
  return perSeriesResults.flat();
}

/**
 * 按 code(= Shopify handle)实时解析单个商品 —— 展示页(商品详情)与结算三条
 * 通道(Stripe/PayPal/Shopify)共用同一入口,保证"买得到"和"看得到"同步实时。
 * 优先直接按 handle 查询 Shopify(不依赖该商品当前是否仍归属某个已知系列,
 * 即使是未归类的孤儿商品——如本次核实到的 royal-grey/gurardian-angel——
 * 只要仍在 Shopify 发布中就能正确解析);查无此商品或请求失败时回退本地
 * 静态目录(含该 code 根本不存在于本地的情况,此时返回 undefined)。
 */
export async function getLiveProductByCode(code: string): Promise<Product | undefined> {
  const local = getProductByCode(code);
  try {
    const data = await fetchProductData(code);
    if (!data) return local;

    const matchedSlug = data.collectionHandles
      .map((h) => SHOPIFY_HANDLE_TO_SERIES[h])
      .find((s): s is SeriesSlug => Boolean(s));
    const series: SeriesSlug = matchedSlug ?? local?.series ?? "princess-lady";
    const tags = SERIES_TAGS[series];

    return {
      code,
      slug: code,
      series,
      name: {
        en: data.title || local?.name.en || code,
        zh: CURATED_ZH_PRODUCT_NAMES[code] ?? local?.name.zh ?? data.title ?? code,
      },
      description: data.description ? { en: data.description, zh: data.description } : (local?.description ?? { zh: "", en: "" }),
      descriptionBlocks:
        data.descriptionBlocks.length > 0
          ? { en: data.descriptionBlocks, zh: data.descriptionBlocks }
          : local?.descriptionBlocks,
      priceCents: data.currency === "USD" ? data.priceCents : (local?.priceCents ?? 0),
      dimensions: local?.dimensions ?? null,
      images: data.images.length > 0 ? data.images : (local?.images ?? [FALLBACK_IMAGE]),
      emotionTags: local?.emotionTags ?? tags,
      featured: local?.featured ?? false,
      isAvailable: data.available,
      isUpcoming: local?.isUpcoming ?? false,
      isQuoteOnly: local?.isQuoteOnly ?? false,
      sortOrder: local?.sortOrder ?? 0,
      badge: local?.badge,
      shopifyHandle: code,
      shopifyVariantId: data.variantId ?? local?.shopifyVariantId,
      skuCode: data.sku ?? undefined,
    };
  } catch (error) {
    console.error(`getLiveProductByCode(${code}): Shopify unreachable, falling back to local`, error);
    return local;
  }
}
