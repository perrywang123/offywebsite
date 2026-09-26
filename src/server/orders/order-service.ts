import { eq } from "drizzle-orm";
import type { CompletedPayment, ShippingInfo } from "../payments/types";
import { checkoutSessions, orderItems, orders } from "../db/schema";
import type { Db } from "../db/client";
import { getDb } from "../db/client";

export interface CompletedSession {
  id: string;
  customerEmail: string | null;
  currency: string | null;
  amountTotal: number | null;
  amountSubtotal: number | null;
  lineItems: Array<{
    code: string;
    nameEn: string;
    nameZh: string;
    unitPriceCents: number;
    quantity: number;
  }>;
  shipping?: ShippingInfo;
}

function nextOrderNumber(db: Db): string {
  const count = db.select().from(orders).all().length;
  return `OF-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Look up an order for the confirmation page using a high-entropy credential
 * (Stripe session id or PayPal order id). The enumerable order number
 * (OF-YYYY-NNNNNN) is deliberately NOT accepted — prevents IDOR enumeration
 * of customer PII via sequential order numbers.
 */
export function getOrderForConfirmation(
  cred: { stripeSessionId?: string; paypalOrderId?: string },
  db: Db = getDb(),
) {
  if (cred.stripeSessionId) {
    return db.select().from(orders).where(eq(orders.stripeSessionId, cred.stripeSessionId)).get();
  }
  if (cred.paypalOrderId) {
    return db.select().from(orders).where(eq(orders.paypalOrderId, cred.paypalOrderId)).get();
  }
  return undefined;
}

/**
 * Persist an order from a verified payment completion. Provider-agnostic and
 * idempotent: a repeated completion (same provider order id) never writes a
 * second order. Amounts come from the server-side snapshot (the single source
 * of truth) — never from the client.
 */
export function finalizeOrder(
  payment: CompletedPayment,
  db: Db = getDb(),
): { created: boolean; orderNumber?: string } {
  const orderKey = payment.provider === "paypal" ? orders.paypalOrderId : orders.stripeSessionId;

  const existing = db.select().from(orders).where(eq(orderKey, payment.providerOrderId)).get();
  if (existing) return { created: false, orderNumber: existing.orderNumber };

  const inserted = db
    .insert(orders)
    .values({
      orderNumber: nextOrderNumber(db),
      provider: payment.provider,
      stripeSessionId: payment.provider === "stripe" ? payment.providerOrderId : null,
      paypalOrderId: payment.provider === "paypal" ? payment.providerOrderId : null,
      email: payment.customerEmail ?? "unknown@offy.dev",
      currency: payment.currency,
      subtotalCents: payment.amountSubtotalCents,
      totalCents: payment.amountTotalCents,
      shippingJson: payment.shipping ? JSON.stringify(payment.shipping) : null,
      status: "paid",
      paidAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: orders.id, orderNumber: orders.orderNumber })
    .get();

  if (!inserted) return { created: false };

  for (const item of payment.lineItems) {
    db.insert(orderItems)
      .values({
        orderId: inserted.id,
        productCode: item.code,
        nameEn: item.nameEn,
        nameZh: item.nameZh,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        lineTotalCents: item.unitPriceCents * item.quantity,
      })
      .run();
  }

  const sessionKey =
    payment.provider === "paypal" ? checkoutSessions.paypalOrderId : checkoutSessions.stripeSessionId;
  db.update(checkoutSessions)
    .set({
      status: "completed",
      providerEventId: payment.providerEventId,
      amountTotalCents: payment.amountTotalCents,
      customerEmail: payment.customerEmail,
      completedAt: new Date(),
    })
    .where(eq(sessionKey, payment.providerOrderId))
    .run();

  return { created: true, orderNumber: inserted.orderNumber };
}

/** Stripe webhook entry — builds a CompletedPayment and delegates to finalizeOrder. */
export function handleCheckoutCompleted(
  session: CompletedSession,
  providerEventId: string,
  db: Db = getDb(),
): { created: boolean } {
  const result = finalizeOrder(
    {
      provider: "stripe",
      providerOrderId: session.id,
      providerEventId,
      customerEmail: session.customerEmail,
      currency: session.currency ?? "usd",
      amountTotalCents: session.amountTotal ?? 0,
      amountSubtotalCents: session.amountSubtotal ?? session.amountTotal ?? 0,
      lineItems: session.lineItems,
      shipping: session.shipping,
    },
    db,
  );
  return { created: result.created };
}
