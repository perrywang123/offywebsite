import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClearCartOnSuccess } from "@/components/cart/ClearCart";

/**
 * 付款完成后回到站上的落点(方案 P0-4 / §2 F)。
 *
 * 为什么需要它:线上结算**不经过**我们自己的 `/checkout` —— 购物袋的 Checkout
 * 直接建 Shopify cart 并整页跳到 Shopify 托管结算页,而清空袋子的
 * `<ClearCartOnSuccess />` 只挂在 `/checkout/success`(Stripe/PayPal 的回跳地址)。
 * 于是"买完回来袋子还是满的",顾客可能把同一件商品再买一次。
 *
 * 回站信号由 `cartCreate` 的 `return_url` attribute 带上(见
 * `server/payments/shopify/client.ts`);Shopify 托管结算页不会自动跳到站外地址,
 * 还需要商家侧配置订单完成后的回跳(或后续里程碑的 webhook 落库)。
 */
export default async function CheckoutReturnPage() {
  const t = await getTranslations("checkout");

  return (
    <div className="container-site section-y lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        {/* 挂载即清空:这一页只可能由"付款流程回到站上"打开 */}
        <ClearCartOnSuccess />
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-3xl text-cream">
          ✓
        </div>
        <h1 className="font-display text-4xl font-semibold">{t("returnTitle")}</h1>
        <p className="mt-4 text-ink-soft">{t("returnBody")}</p>
        <Link
          href="/products"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream"
        >
          {t("continue")}
        </Link>
      </div>
    </div>
  );
}
