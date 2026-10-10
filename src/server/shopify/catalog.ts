import { env } from "../../lib/env";
import { ShopifyError } from "../payments/shopify/client";

export interface ShopifyListItem {
  handle: string;
  title: string;
  priceCents: number;
  currency: string;
  image: string | null;
  available: boolean;
}

export interface ShopifyCollectionSummary {
  handle: string;
  title: string;
  description: string;
}

export interface ShopifyCollectionProductItem {
  handle: string;
  title: string;
  priceCents: number;
  currency: string;
  image: string | null;
  available: boolean;
  /** First variant's GID — required to build a Shopify checkout cart line. */
  variantId: string | null;
  /** Merchant-managed variant SKU — the human-facing "product code", distinct from the URL handle. */
  sku: string | null;
  /** 商品在 Shopify 的创建时间(ISO 8601)——首页"New Looks"按它取每系列最新上架款。 */
  createdAt: string | null;
}

/**
 * Storefront GraphQL 端点。可选 `cacheTag` 会作为无害的查询串追加到 URL 上
 * (Shopify 会忽略未知的 query 参数,不影响请求本身)。
 *
 * 原因:Next.js 的 fetch 数据缓存按完整请求(含 body)生成缓存键,但经真机
 * 实测验证(本次真实复现并修复的 bug):本模块里多个查询共享同一条端点 URL、
 * 仅 body 中的 GraphQL variables 不同(如按不同 collection handle 查询商品清单),
 * 并发/短时间内多次请求时会出现错误的缓存复用 —— 例如 outdoor-sporty 系列
 * 的请求结果被错误地长期固定在某次历史响应上,超过 revalidate 窗口也不刷新,
 * 而其它系列却能正常更新。为每个"查询类型 + 关键参数"的组合生成 URL 层面
 * 即可区分的 cache key,从根本上避免这种串味/缓存污染。
 */
function storefrontEndpoint(cacheTag?: string): string {
  const base = `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
  return cacheTag ? `${base}?ck=${encodeURIComponent(cacheTag)}` : base;
}

/** CountryCode 是 GraphQL 枚举，必须作为字面量注入（用变量传不生效）。仅允许两位字母。 */
function marketCountry(): string {
  const c = env.SHOPIFY_MARKET_COUNTRY;
  return /^[A-Z]{2}$/.test(c) ? c : "US";
}

/** 归一化国家码:非两位大写字母一律回落到 SHOPIFY_MARKET_COUNTRY。 */
function normalizeCountry(country: string): string {
  const cc = country.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : marketCountry();
}

// Storefront `products` 只返回已发布到该 Headless 渠道且 Active 的商品 → 上/下架天然同步。
// @inContext(country) 字面量让价格按市场币种返回（US → USD）。
function listQuery(country: string): string {
  return `
query ProductList @inContext(country: ${country}) {
  products(first: 50, sortKey: BEST_SELLING) {
    nodes {
      handle
      title
      availableForSale
      featuredImage { url }
      priceRange { minVariantPrice { amount currencyCode } }
    }
  }
}`;
}

interface ProductListNode {
  handle: string;
  title?: string;
  availableForSale?: boolean;
  featuredImage?: { url?: string } | null;
  priceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
}

/**
 * List published products from Shopify (market currency). Throws on transport
 * errors so the caller can fall back to the local catalog. Returns [] when the
 * store genuinely has no published products.
 */
export async function listShopifyProducts(
  fetchImpl: typeof fetch = fetch,
  country: string = marketCountry(),
  /** 区域限定要按十几个国家各查一次,给个更长的缓存窗口,别 60s 就全刷一遍。 */
  revalidateSeconds = 60,
): Promise<ShopifyListItem[]> {
  // 国家必须进缓存键:同 URL 不同 body 会被 Next 的数据缓存串味(本文件开头
  // 记录的线上事故)。区域限定要按十几个国家各查一次,这里尤其关键。
  const cc = normalizeCountry(country);
  const res = await fetchImpl(storefrontEndpoint(`products-list:${cc}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
    },
    body: JSON.stringify({ query: listQuery(cc) }),
    next: { revalidate: revalidateSeconds },
    // 慢响应按失败处理,避免 Shopify 变慢时拖垮 SSR(由调用方回退本地目录)。
    signal: AbortSignal.timeout(3000),
  } as RequestInit);

  if (!res.ok) throw new ShopifyError("storefront_products_failed", res.status);

  const json = (await res.json()) as {
    data?: { products?: { nodes?: ProductListNode[] } };
    errors?: Array<{ message: string }>;
  };
  if (json.errors && json.errors.length > 0) {
    throw new ShopifyError(json.errors[0]?.message ?? "storefront_products_error");
  }

  const nodes = json.data?.products?.nodes ?? [];
  return nodes.map((n) => {
    const amount = n.priceRange?.minVariantPrice?.amount;
    return {
      handle: n.handle,
      title: n.title ?? "",
      priceCents: amount ? Math.round(parseFloat(amount) * 100) : 0,
      currency: n.priceRange?.minVariantPrice?.currencyCode ?? "USD",
      image: n.featuredImage?.url ?? null,
      available: Boolean(n.availableForSale),
    };
  });
}

// `collections` 返回全店当前的 Collection 列表(标题/描述为 Shopify 实时值,
// 商家改名/改描述即时生效,不需要改代码)。中文名由 live 目录层按稳定的
// handle→本地译名表补充(Shopify 侧未配置多语言,@inContext(language) 实测
// 仍返回英文原文)。
function collectionsQuery(country: string): string {
  return `
query Collections @inContext(country: ${country}) {
  collections(first: 20) {
    nodes { handle title description }
  }
}`;
}

interface CollectionListNode {
  handle: string;
  title?: string;
  description?: string;
}

/** List all Shopify collections (live). Throws on transport errors. */
export async function fetchShopifyCollections(
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyCollectionSummary[]> {
  const res = await fetchImpl(storefrontEndpoint("collections-list"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
    },
    body: JSON.stringify({ query: collectionsQuery(marketCountry()) }),
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(3000),
  } as RequestInit);

  if (!res.ok) throw new ShopifyError("storefront_collections_failed", res.status);

  const json = (await res.json()) as {
    data?: { collections?: { nodes?: CollectionListNode[] } };
    errors?: Array<{ message: string }>;
  };
  if (json.errors && json.errors.length > 0) {
    throw new ShopifyError(json.errors[0]?.message ?? "storefront_collections_error");
  }

  const nodes = json.data?.collections?.nodes ?? [];
  return nodes.map((n) => ({
    handle: n.handle,
    title: n.title ?? "",
    description: n.description ?? "",
  }));
}

// collectionByHandle(先于本会话用真实店铺验证字段名可用) + 嵌套 products(first: 100)
// 一次往返拿到该系列当前的完整真实商品清单(含变体 ID,结算要用)。first: 100 足够
// 覆盖目前最大的系列(12 款);如未来某系列商品数超过 100,需要分页(届时再加)。
function collectionProductsQuery(country: string): string {
  return `
query CollectionProducts($handle: String!) @inContext(country: ${country}) {
  collectionByHandle(handle: $handle) {
    title
    products(first: 100) {
      nodes {
        handle
        title
        createdAt
        availableForSale
        featuredImage { url }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first: 1) { nodes { id sku } }
      }
    }
  }
}`;
}

interface CollectionProductNode {
  handle: string;
  title?: string;
  createdAt?: string;
  availableForSale?: boolean;
  featuredImage?: { url?: string } | null;
  priceRange?: { minVariantPrice?: { amount?: string; currencyCode?: string } };
  variants?: { nodes?: Array<{ id?: string; sku?: string | null }> };
}

/**
 * List the current, live product roster of a Shopify collection by handle —
 * this is the single source of truth for "which products belong to this
 * series right now" (replaces any hardcoded per-series product list).
 * Prices are returned in the **visitor's market currency**.
 * Throws on transport errors or an unknown collection handle so the caller
 * can fall back to the local static roster.
 *
 * @param country ISO-3166 alpha-2 of the visitor; omitted → `SHOPIFY_MARKET_COUNTRY`.
 */
export async function fetchShopifyCollectionProducts(
  collectionHandle: string,
  country: string = marketCountry(),
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyCollectionProductItem[]> {
  const cc = normalizeCountry(country);
  // 缓存键必须同时含 collection handle(避免系列间串味)与国家(避免市场币种串味)。
  const res = await fetchImpl(storefrontEndpoint(`collection-products:${collectionHandle}:${cc}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
    },
    body: JSON.stringify({
      query: collectionProductsQuery(cc),
      variables: { handle: collectionHandle },
    }),
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(3000),
  } as RequestInit);

  if (!res.ok) throw new ShopifyError("storefront_collection_products_failed", res.status);

  const json = (await res.json()) as {
    data?: { collectionByHandle?: { products?: { nodes?: CollectionProductNode[] } } | null };
    errors?: Array<{ message: string }>;
  };
  if (json.errors && json.errors.length > 0) {
    throw new ShopifyError(json.errors[0]?.message ?? "storefront_collection_products_error");
  }
  if (!json.data?.collectionByHandle) {
    throw new ShopifyError("storefront_collection_not_found");
  }

  const nodes = json.data.collectionByHandle.products?.nodes ?? [];
  return nodes.map((n) => {
    const amount = n.priceRange?.minVariantPrice?.amount;
    return {
      handle: n.handle,
      title: n.title ?? "",
      priceCents: amount ? Math.round(parseFloat(amount) * 100) : 0,
      currency: n.priceRange?.minVariantPrice?.currencyCode ?? "USD",
      image: n.featuredImage?.url ?? null,
      available: Boolean(n.availableForSale),
      variantId: n.variants?.nodes?.[0]?.id ?? null,
      sku: n.variants?.nodes?.[0]?.sku || null,
      createdAt: n.createdAt ?? null,
    };
  });
}
