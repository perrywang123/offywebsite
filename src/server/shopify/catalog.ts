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

function storefrontEndpoint(): string {
  return `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}

/** CountryCode 是 GraphQL 枚举，必须作为字面量注入（用变量传不生效）。仅允许两位字母。 */
function marketCountry(): string {
  const c = env.SHOPIFY_MARKET_COUNTRY;
  return /^[A-Z]{2}$/.test(c) ? c : "US";
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
): Promise<ShopifyListItem[]> {
  const res = await fetchImpl(storefrontEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_TOKEN ?? "",
    },
    body: JSON.stringify({ query: listQuery(marketCountry()) }),
    next: { revalidate: 60 },
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
