import { env, isShopifyConfigured } from "../../../lib/env";
import { getLiveProductByCode } from "../../catalog/live";
import type {
  CaptureResult,
  CompletedPayment,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
} from "../types";
import { cartCreate, type CartLineInput, type ShopifyCart } from "./client";

/** CountryCode 是 GraphQL 枚举，必须作为字面量注入（用变量传不生效）。仅允许两位字母。 */
function marketCountry(): string {
  const c = env.SHOPIFY_MARKET_COUNTRY;
  return /^[A-Z]{2}$/.test(c) ? c : "US";
}

type CreateCartFn = (lines: CartLineInput[]) => Promise<ShopifyCart>;

export interface ShopifyProviderDeps {
  /** Injectable for tests; defaults to the real Storefront cartCreate. */
  createCart?: CreateCartFn;
  /** Injectable for tests; defaults to env-based detection. */
  configured?: () => boolean;
}

/**
 * Shopify provider: builds a cart via the Storefront API and redirects the
 * buyer to Shopify's hosted checkout. Prices/variants are resolved server-side
 * — client prices are never trusted — and resolved **live from Shopify**
 * (`getLiveProductByCode`, which itself falls back to the local static catalog
 * when Shopify is unreachable), so products added to the store later are
 * immediately purchasable without a code change.
 *
 * Orders are owned by Shopify, so `capture` is a no-op and `parseCallback`
 * returns null (order write-back is reserved for a future webhook milestone).
 */
export class ShopifyPaymentProvider implements PaymentProvider {
  readonly name = "shopify" as const;

  constructor(private deps: ShopifyProviderDeps = {}) {}

  isConfigured(): boolean {
    return (this.deps.configured ?? isShopifyConfigured)();
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    // 价格与结账都按**访客所在国家**的市场上下文解析:商品价来自
    // `@inContext(country: 访客国家)`,购物车也用同一个国家建,否则站上显示的
    // £37.90 会在结账页变成 $49.90。
    const country = input.country;
    const lines: CartLineInput[] = [];
    for (const item of input.items) {
      const product = await getLiveProductByCode(item.code, country ?? marketCountry());
      if (!product || !product.isAvailable || product.isQuoteOnly || !product.shopifyVariantId) {
        return { ok: false, status: 400, error: "invalid_items" };
      }
      lines.push({ merchandiseId: product.shopifyVariantId, quantity: item.quantity });
    }
    if (lines.length === 0) return { ok: false, status: 400, error: "invalid_items" };

    if (!this.isConfigured()) return { ok: false, status: 503, error: "shopify_unavailable" };

    const createCart =
      this.deps.createCart ??
      ((l: CartLineInput[]) =>
        country
          ? cartCreate(l, fetch, input.locale, country)
          : cartCreate(l, fetch, input.locale));
    try {
      const cart = await createCart(lines);
      return {
        ok: true,
        provider: "shopify",
        redirect: { kind: "redirect", url: cart.checkoutUrl },
      };
    } catch (error) {
      console.error("Shopify cartCreate error:", error);
      return { ok: false, status: 502, error: "shopify_error" };
    }
  }

  async capture(): Promise<CaptureResult> {
    // Shopify hosts checkout + owns the order; nothing to capture here.
    return { ok: false, status: 409, error: "not_supported" };
  }

  async parseCallback(): Promise<CompletedPayment | null> {
    // Order confirmation via Shopify webhook is a future milestone.
    return null;
  }
}
