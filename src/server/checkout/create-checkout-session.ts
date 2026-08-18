import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { getProductByCode, toStripeLineItems } from "../../lib/catalog";
import { env, isStripeConfigured } from "../../lib/env";
import { checkoutSessions } from "../db/schema";
import { getDb, type Db } from "../db/client";
import { getStripe } from "../stripe/client";

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
 * never accepted. A `stripe` client and `db` may be injected for tests.
 */
export async function createCheckoutSession(
  items: CheckoutItem[],
  locale: string,
  stripeClient?: Stripe,
  db?: Db,
): Promise<CreateCheckoutResult> {
  const validItems: CheckoutItem[] = [];
  for (const item of items) {
    const product = getProductByCode(item.code);
    if (!product || !product.isAvailable || product.isQuoteOnly) {
      return { ok: false, status: 400, error: "invalid_items" };
    }
    validItems.push({ code: product.code, quantity: item.quantity });
  }
  if (validItems.length === 0) {
    return { ok: false, status: 400, error: "invalid_request" };
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
  const lineItemsSnapshot = validItems.map((item) => {
    const product = getProductByCode(item.code)!;
    return {
      code: product.code,
      nameEn: product.name.en,
      nameZh: product.name.zh,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
    };
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "usd",
      line_items: toStripeLineItems(validItems),
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
