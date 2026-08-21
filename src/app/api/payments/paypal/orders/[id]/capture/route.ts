import { NextResponse } from "next/server";
import { getProvider } from "@/server/payments/registry";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const provider = getProvider("paypal");
  const result = await provider.capture({ orderId: id });
  if (result.ok) {
    return NextResponse.json({ order: result.order });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
