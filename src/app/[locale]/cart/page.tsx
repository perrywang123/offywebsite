"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cartTotal, formatPrice } from "@/lib/pricing";
import { useCart, type CartCatalogEntry } from "@/components/cart/CartProvider";
import { useCheckoutRedirect } from "@/components/cart/useCheckoutRedirect";

export default function CartPage() {
  // `catalog`(来自 /api/products 实时拉取)取代直接 import 本地静态目录 ——
  // 否则本地完全没有记录的新商品(如本次新发现的 noir/wander/fable 等)
  // 加入购物车后会在这个页面被静默过滤掉,表现为"购物车显示是空的"。
  const { lines, catalog, catalogLoaded, setQty, remove } = useCart();
  const locale = useLocale();
  const t = useTranslations("common.cart");
  const ta = useTranslations("common.actions");
  // 与购物袋抽屉保持同一条链路:直接去 Shopify 结算页,失败才回退 /checkout。
  const checkout = useCheckoutRedirect();

  const items = lines
    .map((line) => ({ line, product: catalog[line.code] }))
    .filter((x): x is { line: { code: string; quantity: number }; product: CartCatalogEntry } =>
      Boolean(x.product),
    );

  // 行价按各行自己的币种显示;小计由 cartTotal 汇总(混币时不硬加,只置位提示)。
  const subtotal = cartTotal(
    items.map((x) => ({
      priceCents: x.product.priceCents,
      currency: x.product.currency,
      quantity: x.line.quantity,
    })),
  );

  if (!catalogLoaded && lines.length > 0) {
    return (
      <div className="container-site section-y text-ink-muted text-center text-sm lg:py-12">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="container-site section-y lg:py-12">
      <h1 className="font-display mb-8 text-4xl font-semibold">{t("title")}</h1>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-ink-soft text-lg">{t("empty")}</p>
          <p className="text-ink-muted mt-2 text-sm">{t("emptyHint")}</p>
          <Link
            href="/products"
            className="bg-ink text-paper mt-6 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium"
          >
            {ta("continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <ul className="divide-sand divide-y">
            {items.map(({ line, product }) => (
              <li key={line.code} className="flex gap-4 py-6">
                <div className="bg-cream-deep relative h-32 w-24 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={product.images[0]}
                    alt={locale === "zh" ? product.name.zh : product.name.en}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="font-medium">
                    {locale === "zh" ? product.name.zh : product.name.en}
                  </p>
                  <p className="text-ink-muted text-sm">
                    {formatPrice(product.priceCents, product.currency, locale)}
                  </p>
                  {/* 与抽屉同一套值(方案 #34):步进器 36 → 44px,两个按钮之间
                      留 gap-1,Remove 用 .tap-target--quiet 拿到 44px 命中区
                      而不改变视觉行高。
                      `flex-wrap` 是 320px 上的必要兜底:44×3 + 36 + Remove 的
                      最小内容宽合计 203px,加上缩略图与 gap 就是 315px,
                      在 320 屏(版心 288)里放不下 —— 实测整页横向溢出 11px。
                      375px 起有足够空间,不会换行。 */}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <div className="border-sand flex items-center gap-1 rounded-full border">
                      <button
                        type="button"
                        onClick={() => setQty(line.code, line.quantity - 1)}
                        className="text-ink-soft h-11 w-11 lg:h-9 lg:w-9"
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-sm">{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQty(line.code, line.quantity + 1)}
                        className="text-ink-soft h-11 w-11 lg:h-9 lg:w-9"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(line.code)}
                      className="tap-target--quiet text-ink-muted hover:text-ink px-2 text-xs underline"
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="bg-paper h-fit rounded-2xl p-6">
            <div className="mb-4 flex justify-between font-medium">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">
                {formatPrice(subtotal.cents, subtotal.currency, locale)}
              </span>
            </div>
            {subtotal.mixed && <p className="text-ink-muted mb-4 text-xs">{t("mixedCurrency")}</p>}
            {checkout.failed && (
              <p role="alert" className="text-error mb-3 text-xs">
                {t("checkoutFallback")}
              </p>
            )}
            {/* 4xx:服务端点名买不了的商品 → 不跳转,留在原地指名并让顾客重试
                (方案 P0-3 / R12:两个调用点都必须处理,否则这里会变成
                "提示了但不跳转"的死界面)。 */}
            {checkout.blocked && (
              <p role="alert" className="text-error mb-3 text-xs">
                {checkout.blocked.length > 0
                  ? t("checkoutBlocked", {
                      items: checkout.blocked
                        .map((b) => {
                          const p = catalog[b.code];
                          return p ? (locale === "zh" ? p.name.zh : p.name.en) : b.code;
                        })
                        .join(", "),
                    })
                  : t("checkoutBlockedGeneric")}
              </p>
            )}
            {/* 直接建 Shopify cart 并整页跳转到其结算页;加载中禁用 + aria-busy 防连点。 */}
            <button
              type="button"
              onClick={() =>
                void checkout.startCheckout(
                  items.map((x) => ({ code: x.line.code, quantity: x.line.quantity })),
                )
              }
              disabled={checkout.pending}
              aria-busy={checkout.pending}
              className="bg-accent text-paper hover:bg-accent-deep flex h-12 w-full items-center justify-center rounded-full text-sm font-medium transition-colors disabled:opacity-70"
            >
              {checkout.pending ? t("checkoutRedirecting") : ta("checkout")}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
