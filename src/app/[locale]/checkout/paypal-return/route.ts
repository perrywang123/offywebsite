import { redirect } from "next/navigation";
import { getProvider } from "@/server/payments/registry";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId") ?? searchParams.get("token") ?? "";

  if (!orderId) {
    redirect(`/${locale}/checkout?paypal=failed&reason=missing_order`);
  }

  const provider = getProvider("paypal");
  const result = await provider.capture({
    orderId,
    token: searchParams.get("token") ?? undefined,
  });

  if (result.ok) {
    // 用 PayPal 高熵 order id 作确认凭证,不暴露可枚举的顺序订单号(IDOR 防护)。
    redirect(`/${locale}/checkout/success?paypal_order_id=${encodeURIComponent(orderId)}`);
  }
  redirect(`/${locale}/checkout?paypal=failed&reason=${encodeURIComponent(result.error)}`);
}
