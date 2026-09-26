import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { orderItems } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { getOrderForConfirmation } from "@/server/orders/order-service";
import { formatUsdCents } from "@/lib/pricing";
import { ClearCartOnSuccess } from "@/components/cart/ClearCart";

/**
 * 订单确认页 —— 只认高熵凭证(Stripe session_id / PayPal order id),
 * 拒绝可枚举的顺序订单号(OF-YYYY-NNNNNN),防 IDOR 爬取客户 PII。
 */
export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string; paypal_order_id?: string }>;
}) {
  const { locale } = await params;
  const { session_id, paypal_order_id } = await searchParams;
  const t = await getTranslations("checkout");
  const tCart = await getTranslations("common");

  const db = getDb();
  let order: { orderNumber: string; totalCents: number; email: string; id: number; shippingJson: string | null } | undefined;
  let items: Array<{ id: number; nameZh: string; nameEn: string; quantity: number; lineTotalCents: number }> = [];
  let shipping: { fullName: string; country: string; city: string; state?: string; address1: string; address2?: string; postalCode: string; phone?: string } | null = null;

  const found = getOrderForConfirmation(
    { stripeSessionId: session_id, paypalOrderId: paypal_order_id },
    db,
  );
  if (found) {
    order = found;
    items = db.select().from(orderItems).where(eq(orderItems.orderId, found.id)).all();
    try {
      shipping = found.shippingJson ? JSON.parse(found.shippingJson) : null;
    } catch {
      shipping = null;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <ClearCartOnSuccess />
      {order ? (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-3xl text-cream">
            ✓
          </div>
          <h1 className="font-display text-4xl font-semibold">{t("successTitle")}</h1>
          <p className="kicker mt-6">{t("successOrder")}</p>
          <p className="font-mono text-xl tabular-nums">{order.orderNumber}</p>
          <div className="mt-8 rounded-card bg-paper p-6 text-left">
            <ul className="divide-y divide-cream-line">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between py-3 text-sm">
                  <span>
                    {locale === "zh" ? item.nameZh : item.nameEn} × {item.quantity}
                  </span>
                  <span className="tabular-nums">{formatUsdCents(item.lineTotalCents, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-cream-line pt-3 font-medium">
              <span>{tCart("cart.total")}</span>
              <span className="tabular-nums">{formatUsdCents(order.totalCents, locale)}</span>
            </div>
          </div>
          {shipping && (
            <div className="mt-6 rounded-card bg-paper p-5 text-left text-sm">
              <p className="kicker mb-3">{t("shipping")}</p>
              <p className="font-medium">{shipping.fullName}</p>
              <p className="mt-1 text-ink-soft">
                {shipping.address1}
                {shipping.address2 ? `, ${shipping.address2}` : ""}
              </p>
              <p className="text-ink-soft">
                {shipping.city}{shipping.state ? `, ${shipping.state}` : ""} {shipping.postalCode}
              </p>
              <p className="text-ink-soft">{shipping.country}{shipping.phone ? ` · ${shipping.phone}` : ""}</p>
            </div>
          )}
          <p className="mt-4 text-sm text-ink-muted">
            {t("successEmail")} {order.email}
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream"
          >
            {t("continue")}
          </Link>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold">{t("pendingTitle")}</h1>
          <p className="mt-3 text-ink-soft">{t("pendingBody")}</p>
        </div>
      )}
    </div>
  );
}
