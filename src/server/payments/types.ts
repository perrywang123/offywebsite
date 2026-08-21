export type ProviderName = "stripe" | "paypal";

export interface CheckoutItemInput {
  code: string;
  quantity: number;
}

export interface CreateCheckoutInput {
  items: CheckoutItemInput[];
  locale: "en" | "zh";
  email?: string;
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
