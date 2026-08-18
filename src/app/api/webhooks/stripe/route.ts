import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { checkoutSessions } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { getStripe } from "@/server/stripe/client";
import { handleCheckoutCompleted } from "@/server/orders/order-service";

export const dynamic = "force-dynamic";

interface LineItemSnapshot {
  code: string;
  nameEn: string;
  nameZh: string;
  unitPriceCents: number;
  quantity: number;
}

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature ?? "",
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const stored = getDb()
        .select()
        .from(checkoutSessions)
        .where(eq(checkoutSessions.stripeSessionId, session.id))
        .get();

      let lineItems: LineItemSnapshot[] = [];
      if (stored?.lineItemsJson) {
        try {
          lineItems = JSON.parse(stored.lineItemsJson) as LineItemSnapshot[];
        } catch {
          lineItems = [];
        }
      }

      handleCheckoutCompleted(
        {
          id: session.id,
          customerEmail: session.customer_details?.email ?? null,
          currency: session.currency ?? "usd",
          amountTotal: session.amount_total,
          amountSubtotal: session.amount_subtotal,
          lineItems,
        },
        event.id,
      );
    }
  }

  return NextResponse.json({ received: true });
}
