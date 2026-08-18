import { eq } from "drizzle-orm";
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
}

function nextOrderNumber(db: Db): string {
  const count = db.select().from(orders).all().length;
  return `OF-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Persist an order from a verified `checkout.session.completed` webhook event.
 * Idempotent: a repeated event (same stripe session id OR same provider event
 * id) never writes a second order.
 */
export function handleCheckoutCompleted(
  session: CompletedSession,
  providerEventId: string,
  db: Db = getDb(),
): { created: boolean } {
  const existingOrder = db
    .select()
    .from(orders)
    .where(eq(orders.stripeSessionId, session.id))
    .get();
  if (existingOrder) return { created: false };

  const existingSession = db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.stripeSessionId, session.id))
    .get();
  if (existingSession?.providerEventId === providerEventId) {
    return { created: false };
  }

  const totalCents = session.amountTotal ?? 0;
  const subtotalCents = session.amountSubtotal ?? totalCents;

  const inserted = db
    .insert(orders)
    .values({
      orderNumber: nextOrderNumber(db),
      stripeSessionId: session.id,
      email: session.customerEmail ?? "unknown@offy.dev",
      currency: session.currency ?? "usd",
      subtotalCents,
      totalCents,
      status: "paid",
      paidAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: orders.id })
    .get();

  if (!inserted) return { created: false };

  for (const item of session.lineItems) {
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

  db.update(checkoutSessions)
    .set({
      status: "completed",
      providerEventId,
      amountTotalCents: totalCents,
      customerEmail: session.customerEmail,
      completedAt: new Date(),
    })
    .where(eq(checkoutSessions.stripeSessionId, session.id))
    .run();

  return { created: true };
}
