import { env } from "../../lib/env";
import { parseDescriptionHtml, type DescriptionBlock } from "../../lib/description-html";

export interface ShopifyProductData {
  title: string;
  description: string;
  /** Structured paragraphs parsed from descriptionHtml (bold lead preserved). */
  descriptionBlocks: DescriptionBlock[];
  images: string[];
  priceCents: number;
  currency: string;
  /** First variant's GID, used to build a Shopify-hosted checkout cart line. */
  variantId: string | null;
  /** Live availability — drives whether the product can be added to cart / checked out. */
  available: boolean;
  /** Collection handles this product currently belongs to (drives series assignment). */
  collectionHandles: string[];
  /** Merchant-managed variant SKU — the human-facing "product code", distinct from the URL handle. */
  sku: string | null;
}

/**
 * Storefront GraphQL 端点,按 handle 附加区分用的查询串,避免 Next.js fetch
 * 数据缓存在同一端点 URL、仅 body(GraphQL variables)不同的并发请求间发生
 * 缓存串味/污染 —— 真机实测验证过的真实 bug(详见
 * `server/shopify/catalog.ts` 顶部注释的完整复现记录)。此处尤其关键:
 * 不同商品详情页/结算请求会在短时间内并发查询不同 handle,一旦串味会导致
 * "用户看到/买到错误的商品",必须保证每个 handle 的缓存键互不相同。
 */
function storefrontEndpoint(handle: string): string {
  return `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json?ck=product:${encodeURIComponent(handle)}`;
}

/** CountryCode 是 GraphQL 枚举，必须作为字面量注入（用变量传会不生效）。仅允许两位字母。 */
function marketCountry(): string {
  const c = env.SHOPIFY_MARKET_COUNTRY;
  return /^[A-Z]{2}$/.test(c) ? c : "US";
}

// 按 handle 查询，并用 @inContext(country) 让价格按 Shopify Markets 的市场币种返回
// （US → USD）。注意：product(handle) 路径能正确响应市场上下文，而 node(id: variant)
// 不会，因此富化读取走 handle。
// variants.id（结算用变体 GID）+ availableForSale（实时上下架）+ collections.handle
// （实时系列归属，驱动 live 目录层判定一个商品当前属于哪个系列）一并取回，
// 避免再发起第二次请求。
function productQuery(country: string): string {
  return `
query ProductEnrich($handle: String!) @inContext(country: ${country}) {
  product(handle: $handle) {
    title
    description
    descriptionHtml
    availableForSale
    images(first: 10) { nodes { url } }
    variants(first: 1) { nodes { id sku price { amount currencyCode } } }
    collections(first: 5) { nodes { handle } }
  }
}`;
}

interface ProductNode {
  title?: string;
  description?: string;
  descriptionHtml?: string;
  availableForSale?: boolean;
  images?: { nodes?: Array<{ url?: string }> };
  variants?: { nodes?: Array<{ id?: string; sku?: string | null; price?: { amount?: string; currencyCode?: string } }> };
  collections?: { nodes?: Array<{ handle?: string }> };
}

/**
 * Fetch display fields (title/description/images/price) for a Shopify product by
 * handle, in the configured market currency. Returns null when the product is
 * missing or the HTTP call is not OK. Network errors propagate; the enrich layer
 * wraps this in try/catch to fall back to local data.
 */
export async function fetchProductData(
  handle: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyProductData | null> {
  const res = await fetchImpl(storefrontEndpoint(handle), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
    },
    body: JSON.stringify({
      query: productQuery(marketCountry()),
      variables: { handle },
    }),
    // Near-real-time: cache, refresh at most every 60s.
    next: { revalidate: 60 },
    // 慢响应按失败处理(超时会 throw,由 enrich 层 try/catch 回退本地),
    // 避免 Shopify 变慢时拖垮 SSR。
    signal: AbortSignal.timeout(3000),
  } as RequestInit);

  if (!res.ok) return null;

  const json = (await res.json()) as { data?: { product?: ProductNode | null } };
  const product = json.data?.product;
  if (!product) return null;

  const variant = product.variants?.nodes?.[0];
  const amount = variant?.price?.amount;
  const priceCents = amount ? Math.round(parseFloat(amount) * 100) : 0;

  return {
    title: product.title ?? "",
    description: product.description ?? "",
    descriptionBlocks: parseDescriptionHtml(product.descriptionHtml ?? ""),
    images: (product.images?.nodes ?? [])
      .map((n) => n.url)
      .filter((u): u is string => Boolean(u)),
    priceCents,
    currency: variant?.price?.currencyCode ?? "USD",
    variantId: variant?.id ?? null,
    // 缺省按"可售"处理：老店铺未返回该字段时不至于把整站商品误判为下架。
    available: product.availableForSale ?? true,
    collectionHandles: (product.collections?.nodes ?? [])
      .map((n) => n.handle)
      .filter((h): h is string => Boolean(h)),
    sku: variant?.sku || null,
  };
}
