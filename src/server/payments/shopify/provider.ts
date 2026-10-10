import { env, isShopifyConfigured } from "../../../lib/env";
import { publicPath } from "../../../i18n/routing";
import { getLiveProductByCode } from "../../catalog/live";
import type {
  CaptureResult,
  CheckoutItemFailure,
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
    const failures: CheckoutItemFailure[] = [];
    for (const item of input.items) {
      const product = await getLiveProductByCode(item.code, country ?? marketCountry());
      // 售罄/下架/仅有报价的商品此前只是在整单里被"顺带"拒掉,顾客拿到的是一个
      // 没有主语的 400(方案 P0-3:一路点到结算才被 400 拦下)。这里把原因分成
      // 两类并**逐件指名**,让购物袋能说清"哪一件买不了、先移除再试"。
      if (!product || !product.shopifyVariantId) {
        failures.push({ code: item.code, reason: "unknown_items" });
        continue;
      }
      if (!product.isAvailable || product.isQuoteOnly) {
        failures.push({ code: item.code, reason: "unavailable_items" });
        continue;
      }
      lines.push({ merchandiseId: product.shopifyVariantId, quantity: item.quantity });
    }
    if (failures.length > 0) {
      return {
        ok: false,
        status: 400,
        // 只要有一件是"存在但买不了",就以它为主因;两者都有时并列在 items 里。
        error: failures.some((f) => f.reason === "unavailable_items")
          ? "unavailable_items"
          : "unknown_items",
        items: failures,
      };
    }
    if (lines.length === 0) return { ok: false, status: 400, error: "unknown_items", items: [] };

    if (!this.isConfigured()) return { ok: false, status: 503, error: "shopify_unavailable" };

    // 回站信号:Shopify 托管结算页不会自动把我们带回来,所以把回跳地址作为
    // **cart attribute** 一起建进购物车(Storefront 的 CartInput 没有 returnUrl
    // 字段,attributes 是官方支持的载体),商家/后台据此配置订单完成后的回跳。
    // 落点页 `/checkout/return` 负责清空袋子(方案 P0-4 / §2 F)。
    const returnUrl = `${env.SITE_URL}${publicPath(input.locale, "/checkout/return")}`;
    const createCart =
      this.deps.createCart ??
      ((l: CartLineInput[]) =>
        country
          ? cartCreate(l, fetch, input.locale, country, returnUrl)
          : cartCreate(l, fetch, input.locale, undefined, returnUrl));
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
