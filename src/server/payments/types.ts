export type ProviderName = "stripe" | "paypal" | "shopify";

export interface CheckoutItemInput {
  code: string;
  quantity: number;
}

export interface ShippingInfo {
  fullName: string;
  phone?: string;
  country: string;
  state?: string;
  city: string;
  address1: string;
  address2?: string;
  postalCode: string;
}

export interface CreateCheckoutInput {
  items: CheckoutItemInput[];
  locale: "en" | "zh";
  email?: string;
  shipping?: ShippingInfo;
  /**
   * ISO-3166 alpha-2 of the visitor, straight from the geo header
   * (`pickCountry(headers, SHOPIFY_MARKET_COUNTRY)`). It selects the Shopify
   * Markets context so the checkout total is priced in the same currency the
   * storefront displayed. Omitted → the provider's default market.
   */
  country?: string;
}

export type CheckoutRedirect =
  | { kind: "redirect"; url: string }
  | { kind: "approve"; orderId: string; approveUrl: string; returnUrl: string };

/**
 * 单个商品为什么买不了。结算被 4xx 拒绝时**必须指名商品**——否则顾客只能看到
 * 一个裸错误码(此前购物袋渲染的就是 `checkout_failed` / `invalid_items`),
 * 不知道是哪一件出了问题,也不知道该做什么。
 */
export interface CheckoutItemFailure {
  code: string;
  /** `unknown_items` = 商品不存在/没有可结算变体;`unavailable_items` = 已下架、售罄或仅有报价。 */
  reason: "unknown_items" | "unavailable_items";
}

export type CreateCheckoutResult =
  | { ok: true; provider: ProviderName; redirect: CheckoutRedirect }
  | { ok: false; status: 400 | 502 | 503; error: string; items?: CheckoutItemFailure[] };

export interface LineItemSnapshot {
  code: string;
  nameEn: string;
  nameZh: string;
  unitPriceCents: number;
  quantity: number;
}

export interface CompletedPayment {
  provider: ProviderName;
  providerOrderId: string;
  providerEventId: string;
  customerEmail: string | null;
  currency: string;
  amountTotalCents: number;
  amountSubtotalCents: number;
  lineItems: LineItemSnapshot[];
  shipping?: ShippingInfo;
}

export interface CaptureRequest {
  orderId: string;
  token?: string;
}

export type CaptureResult =
  | {
      ok: true;
      order: { orderNumber: string; status: string; totalCents: number; currency: string };
    }
  | { ok: false; status: 400 | 404 | 409 | 502; error: string };

export interface PaymentProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  capture(req: CaptureRequest): Promise<CaptureResult>;
  parseCallback(request: Request): Promise<CompletedPayment | null>;
}
