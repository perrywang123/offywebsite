import { products, productHandleAliases, upcomingIps, collabLooks, teaserSeries } from "./products";
import { seriesList } from "./series";
import type { Product } from "./types";

export { products, productHandleAliases, upcomingIps, collabLooks, teaserSeries, seriesList };
export { getSeries, seriesMap } from "./series";
export type { Product, Series, SeriesSlug, LocalizedString, Dimensions } from "./types";
export type { UpcomingIp } from "./products";

export function getProducts(): Product[] {
  return [...products].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProductByCode(code: string): Product | undefined {
  return products.find((p) => p.code.toLowerCase() === code.toLowerCase());
}

/**
 * 商品改过 handle 时,把旧 handle 解析成当前 handle(详情页据此 308 跳转)。
 * 大小写不敏感,未命中返回 undefined。
 */
export function getProductHandleAlias(code: string): string | undefined {
  return productHandleAliases[code.toLowerCase()];
}

/** Reverse lookup: find the local product mapped to a given Shopify handle. */
export function getProductByShopifyHandle(handle: string): Product | undefined {
  return products.find((p) => p.shopifyHandle === handle);
}

export function getProductsBySeries(slug: string): Product[] {
  return getProducts().filter((p) => p.series === slug);
}

export function getFeaturedProducts(limit = 8): Product[] {
  return getProducts()
    .filter((p) => p.featured && p.isAvailable)
    .slice(0, limit);
}

export interface StripeLineItemInput {
  code: string;
  quantity: number;
}

/**
 * Convert cart lines to Stripe line items using SERVER-side catalog prices.
 * Throws on unknown product codes — callers must reject invalid items first.
 */
export function toStripeLineItems(items: StripeLineItemInput[]) {
  return items.map((item) => {
    const product = getProductByCode(item.code);
    if (!product) {
      throw new Error(`unknown product code: ${item.code}`);
    }
    return {
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: product.priceCents,
        product_data: {
          name: product.name.en,
          metadata: { code: product.code },
        },
      },
    };
  });
}

/** Compute the server-authoritative subtotal for cart lines (USD cents). */
export function computeSubtotalCents(items: StripeLineItemInput[]): number {
  return items.reduce((sum, item) => {
    const product = getProductByCode(item.code);
    if (!product) {
      throw new Error(`unknown product code: ${item.code}`);
    }
    return sum + product.priceCents * item.quantity;
  }, 0);
}
