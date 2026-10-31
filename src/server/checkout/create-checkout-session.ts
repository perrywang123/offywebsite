import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { Product } from "../../lib/catalog";
import { env, isStripeConfigured } from "../../lib/env";
import { getLiveProductByCode } from "../catalog/live";
import { checkoutSessions } from "../db/schema";
import { getDb, type Db } from "../db/client";
import { getStripe } from "../stripe/client";
import { publicPath } from "@/i18n/routing";

/** 拿不到访客国家时(未配置 geo 头/直接调用)回落的市场。 */
const DEFAULT_MARKET_COUNTRY = env.SHOPIFY_MARKET_COUNTRY;

export type CreateCheckoutResult =
  { ok: true; url: string } | { ok: false; status: 400 | 502 | 503; error: string };

export interface CheckoutItem {
  code: string;
  quantity: number;
}

export async function createCheckoutSession(
  items: CheckoutItem[],
  locale: string,
  stripeClient?: Stripe,
  db?: Db,
  shipping?: import("../payments/types").ShippingInfo,
  /** 访客所在国家(ISO-3166 alpha-2),决定价格用哪个市场的币种。 */
  country?: string,
): Promise<CreateCheckoutResult> {
  const validItems: { product: Product; quantity: number }[] = [];
  try {
    for (const item of items) {
      const product = await getLiveProductByCode(item.code, country ?? DEFAULT_MARKET_COUNTRY);
      if (!product || !product.isAvailable || product.isQuoteOnly) {
        return { ok: false, status: 400, error: "invalid_items" };
      }
      validItems.push({ product, quantity: item.quantity });
    }
  } catch {
    return { ok: false, status: 503, error: "catalog_unavailable" };
  }
  if (validItems.length === 0) {
    return { ok: false, status: 400, error: "invalid_request" };
  }

  // Legacy provider remains USD-only; expanding payment support requires a separate change.
  const nonUsd = validItems.find(({ product }) => product.currency.toUpperCase() !== "USD");
  if (nonUsd) {
    console.warn(
      `createCheckoutSession: refusing to charge ${nonUsd.product.currency} as USD (code=${nonUsd.product.code}); Stripe channel is USD-only.`,
    );
    return { ok: false, status: 400, error: "currency_not_supported" };
  }

  if (!stripeClient && !isStripeConfigured()) {
    return { ok: false, status: 503, error: "checkout_unavailable" };
  }

  const stripe = stripeClient ?? getStripe();
  const clientReferenceId = `session_${randomUUID()}`;
  // 用 publicPath 而不是手写 `/${locale}`:默认语言(as-needed)下前缀会多一次
  // 307 才收敛,回跳链路上白多一跳。{CHECKOUT_SESSION_ID} 是 Stripe 的占位符,
  // publicPath 只做拼接,不会破坏它。
  const successUrl = `${env.SITE_URL}${publicPath(locale, "/checkout/success?session_id={CHECKOUT_SESSION_ID}")}`;
  const cancelUrl = `${env.SITE_URL}${publicPath(locale, "/cart")}`;

  // Snapshot the authoritative line items (code/name/unit price/qty) so the
  // webhook can write order_items without re-querying Stripe.
  const lineItemsSnapshot = validItems.map(({ product, quantity }) => ({
    code: product.code,
    nameEn: product.name.en,
    nameZh: product.name.zh,
    unitPriceCents: product.priceCents,
    quantity,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "usd",
      line_items: validItems.map(({ product, quantity }) => ({
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: product.priceCents,
          product_data: { name: product.name.en, metadata: { code: product.code } },
        },
      })),
      client_reference_id: clientReferenceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { source: "offy-store", locale },
    });

    (db ?? getDb())
      .insert(checkoutSessions)
      .values({
        stripeSessionId: session.id,
        clientReferenceId,
        currency: "usd",
        lineItemsJson: JSON.stringify(lineItemsSnapshot),
        shippingJson: shipping ? JSON.stringify(shipping) : null,
      })
      .run();

    if (!session.url) {
      return { ok: false, status: 502, error: "stripe_error" };
    }
    return { ok: true, url: session.url };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { ok: false, status: 502, error: "stripe_error" };
  }
}
