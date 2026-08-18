import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { orders } from "@/server/db/schema";
import { getDb } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const order = getDb()
    .select()
    .from(orders)
    .where(eq(orders.stripeSessionId, sessionId))
    .get();

  if (!order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }
  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
    },
  });
}
