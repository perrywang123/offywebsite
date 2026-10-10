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

export type CreateCheckoutResult =
  | { ok: true; provider: ProviderName; redirect: CheckoutRedirect }
  | { ok: false; status: 400 | 502 | 503; error: string };

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
  | { ok: true; order: { orderNumber: string; status: string; totalCents: number; currency: string } }
  | { ok: false; status: 400 | 404 | 409 | 502; error: string };

export interface PaymentProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  capture(req: CaptureRequest): Promise<CaptureResult>;
  parseCallback(request: Request): Promise<CompletedPayment | null>;
}
