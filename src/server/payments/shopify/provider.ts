import { isShopifyConfigured } from "../../../lib/env";
import { getProductByCode } from "../../../lib/catalog";
import type {
  CaptureResult,
  CompletedPayment,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
} from "../types";
import { cartCreate, type CartLineInput, type ShopifyCart } from "./client";

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
 * from the catalog `shopifyVariantId` mapping — client prices are never trusted.
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
    const lines: CartLineInput[] = [];
    for (const item of input.items) {
      const product = getProductByCode(item.code);
      if (!product || !product.isAvailable || product.isQuoteOnly || !product.shopifyVariantId) {
        return { ok: false, status: 400, error: "invalid_items" };
      }
      lines.push({ merchandiseId: product.shopifyVariantId, quantity: item.quantity });
    }
    if (lines.length === 0) return { ok: false, status: 400, error: "invalid_items" };

    if (!this.isConfigured()) return { ok: false, status: 503, error: "shopify_unavailable" };

    const createCart = this.deps.createCart ?? ((l: CartLineInput[]) => cartCreate(l));
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
