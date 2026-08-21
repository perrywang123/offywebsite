import { isStripeConfigured } from "../../../lib/env";
import { createCheckoutSession } from "../../checkout/create-checkout-session";
import type {
  CaptureResult,
  CompletedPayment,
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
} from "../types";

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;

  isConfigured(): boolean {
    return isStripeConfigured();
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const result = await createCheckoutSession(input.items, input.locale, undefined, undefined, input.shipping);
    if (result.ok) {
      return { ok: true, provider: "stripe", redirect: { kind: "redirect", url: result.url } };
    }
    return { ok: false, status: result.status, error: result.error };
  }

  async capture(): Promise<CaptureResult> {
    return { ok: false, status: 409, error: "not_supported" };
  }

  async parseCallback(): Promise<CompletedPayment | null> {
    return null; // Stripe 由既有 webhook 路由负责
  }
}
