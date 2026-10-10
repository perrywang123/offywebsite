import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { Product } from "../../lib/catalog";
import { env, isStripeConfigured } from "../../lib/env";
import { getLiveProductByCode } from "../catalog/live";
import { checkoutSessions } from "../db/schema";
import { getDb, type Db } from "../db/client";
import { getStripe } from "../stripe/client";

/** 拿不到访客国家时(未配置 geo 头/直接调用)回落的市场。 */
const DEFAULT_MARKET_COUNTRY = env.SHOPIFY_MARKET_COUNTRY;

export type CreateCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: 400 | 502 | 503; error: string };

export interface CheckoutItem {
  code: string;
  quantity: number;
}

/**
 * Create a Stripe Checkout Session for the given cart lines.
 * Prices come exclusively from the server-side catalog — client prices are
 * never accepted. Products are resolved live from Shopify (`getLiveProductByCode`,
 * which falls back to the local static catalog on its own if Shopify is
 * unreachable), so newly published Shopify products are checkout-able without
 * any code change. A `stripe` client and `db` may be injected for tests.
 */
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
  for (const item of items) {
    const product = await getLiveProductByCode(item.code, country ?? DEFAULT_MARKET_COUNTRY);
    if (!product || !product.isAvailable || product.isQuoteOnly) {
      return { ok: false, status: 400, error: "invalid_items" };
    }
    validItems.push({ product, quantity: item.quantity });
  }
  if (validItems.length === 0) {
    return { ok: false, status: 400, error: "invalid_request" };
  }

  // ⚠️ 未完成的多币种改造(有意留白,不静默混币):Stripe 这条通道仍然按 USD
  // 计价(currency: "usd" + 本地 USD 快照价),因为订单/结算会话快照表
  // (checkoutSessions / orders)目前没有记录"下单时锁定的是哪个市场币种"的字段,
  // 改成多币种会写进混合币种的历史数据,而 2026-08 起结算渠道已确定只保留
  // Shopify(见 openspec 的结算渠道决策)。因此:
  //   - 若解析出的价格不是 USD,直接拒绝这条通道,而不是把 GBP/HKD 金额当美元收;
  //   - 若真的要让 Stripe 支持多市场,需要先给 orders/checkout_sessions 加
  //     currency 快照列并迁移历史数据,再来这里放开。
  const nonUsd = validItems.find(({ product }) => product.currency.toUpperCase() !== "USD");
  if (nonUsd) {
    console.warn(
      `createCheckoutSession: refusing to charge ${nonUsd.product.currency} as USD (code=${nonUsd.product.code}); Stripe channel is USD-only until the order snapshot records a currency.`,
    );
    return { ok: false, status: 400, error: "currency_not_supported" };
  }

  if (!stripeClient && !isStripeConfigured()) {
    return { ok: false, status: 503, error: "checkout_unavailable" };
  }

  const stripe = stripeClient ?? getStripe();
  const clientReferenceId = `session_${randomUUID()}`;
  const successUrl = `${env.SITE_URL}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${env.SITE_URL}/${locale}/cart`;

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
