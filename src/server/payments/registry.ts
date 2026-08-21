import type { PaymentProvider, ProviderName } from "./types";
import { PayPalPaymentProvider } from "./paypal/provider";
import { StripePaymentProvider } from "./stripe/provider";

const providers: Record<ProviderName, PaymentProvider> = {
  stripe: new StripePaymentProvider(),
  paypal: new PayPalPaymentProvider(),
};

export function getProvider(name: ProviderName): PaymentProvider {
  const p = providers[name];
  if (!p) throw new Error(`unknown provider: ${name}`);
  return p;
}

/** 兼容旧入口：缺省 / "stripe" → Stripe；"paypal" → PayPal。 */
export function resolveProvider(raw: string | undefined): PaymentProvider {
  return getProvider(raw === "paypal" ? "paypal" : "stripe");
}
