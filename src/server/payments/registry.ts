import type { PaymentProvider, ProviderName } from "./types";
import { PayPalPaymentProvider } from "./paypal/provider";
import { StripePaymentProvider } from "./stripe/provider";
import { ShopifyPaymentProvider } from "./shopify/provider";

const providers: Record<ProviderName, PaymentProvider> = {
  stripe: new StripePaymentProvider(),
  paypal: new PayPalPaymentProvider(),
  shopify: new ShopifyPaymentProvider(),
};

export function getProvider(name: ProviderName): PaymentProvider {
  const p = providers[name];
  if (!p) throw new Error(`unknown provider: ${name}`);
  return p;
}

/** 入口映射：显式 "paypal" / "shopify"，其余（含缺省 / "stripe"）→ Stripe。 */
export function resolveProvider(raw: string | undefined): PaymentProvider {
  if (raw === "paypal") return getProvider("paypal");
  if (raw === "shopify") return getProvider("shopify");
  return getProvider("stripe");
}
