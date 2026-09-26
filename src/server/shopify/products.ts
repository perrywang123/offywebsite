import { env } from "../../lib/env";

export interface ShopifyProductData {
  title: string;
  description: string;
  images: string[];
  priceCents: number;
  currency: string;
}

function storefrontEndpoint(): string {
  return `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}

/** CountryCode 是 GraphQL 枚举，必须作为字面量注入（用变量传会不生效）。仅允许两位字母。 */
function marketCountry(): string {
  const c = env.SHOPIFY_MARKET_COUNTRY;
  return /^[A-Z]{2}$/.test(c) ? c : "US";
}

// 按 handle 查询，并用 @inContext(country) 让价格按 Shopify Markets 的市场币种返回
// （US → USD）。注意：product(handle) 路径能正确响应市场上下文，而 node(id: variant)
// 不会，因此富化读取走 handle。
function productQuery(country: string): string {
  return `
query ProductEnrich($handle: String!) @inContext(country: ${country}) {
  product(handle: $handle) {
    title
    description
    images(first: 10) { nodes { url } }
    variants(first: 1) { nodes { price { amount currencyCode } } }
  }
}`;
}

interface ProductNode {
  title?: string;
  description?: string;
  images?: { nodes?: Array<{ url?: string }> };
  variants?: { nodes?: Array<{ price?: { amount?: string; currencyCode?: string } }> };
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
  const res = await fetchImpl(storefrontEndpoint(), {
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

  const price = product.variants?.nodes?.[0]?.price;
  const amount = price?.amount;
  const priceCents = amount ? Math.round(parseFloat(amount) * 100) : 0;

  return {
    title: product.title ?? "",
    description: product.description ?? "",
    images: (product.images?.nodes ?? [])
      .map((n) => n.url)
      .filter((u): u is string => Boolean(u)),
    priceCents,
    currency: price?.currencyCode ?? "USD",
  };
}
