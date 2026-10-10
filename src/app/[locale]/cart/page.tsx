"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cartTotal, formatPrice } from "@/lib/pricing";
import { useCart, type CartCatalogEntry } from "@/components/cart/CartProvider";

export default function CartPage() {
  // `catalog`(来自 /api/products 实时拉取)取代直接 import 本地静态目录 ——
  // 否则本地完全没有记录的新商品(如本次新发现的 noir/wander/fable 等)
  // 加入购物车后会在这个页面被静默过滤掉,表现为"购物车显示是空的"。
  const { lines, catalog, catalogLoaded, setQty, remove } = useCart();
  const locale = useLocale();
  const t = useTranslations("common.cart");
  const ta = useTranslations("common.actions");

  const items = lines
    .map((line) => ({ line, product: catalog[line.code] }))
    .filter((x): x is { line: { code: string; quantity: number }; product: CartCatalogEntry } => Boolean(x.product));

  // 行价按各行自己的币种显示;小计由 cartTotal 汇总(混币时不硬加,只置位提示)。
  const subtotal = cartTotal(
    items.map((x) => ({ priceCents: x.product.priceCents, currency: x.product.currency, quantity: x.line.quantity })),
  );

  if (!catalogLoaded && lines.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 text-center text-sm text-ink-muted lg:px-8">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
      <h1 className="mb-8 font-display text-4xl font-semibold">{t("title")}</h1>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-ink-soft">{t("empty")}</p>
          <p className="mt-2 text-sm text-ink-muted">{t("emptyHint")}</p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper"
          >
            {ta("continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <ul className="divide-y divide-sand">
            {items.map(({ line, product }) => (
              <li key={line.code} className="flex gap-4 py-6">
                <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-cream-deep">
                  <Image
                    src={product.images[0]}
                    alt={locale === "zh" ? product.name.zh : product.name.en}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col">
                  <p className="font-medium">{locale === "zh" ? product.name.zh : product.name.en}</p>
                  <p className="text-sm text-ink-muted">
                    {formatPrice(product.priceCents, product.currency, locale)}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-sand">
                      <button type="button" onClick={() => setQty(line.code, line.quantity - 1)} className="h-9 w-9 text-ink-soft">−</button>
                      <span className="w-8 text-center text-sm">{line.quantity}</span>
                      <button type="button" onClick={() => setQty(line.code, line.quantity + 1)} className="h-9 w-9 text-ink-soft">+</button>
                    </div>
                    <button type="button" onClick={() => remove(line.code)} className="text-xs text-ink-muted underline hover:text-ink">
                      {t("remove")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-2xl bg-paper p-6">
            <div className="mb-4 flex justify-between font-medium">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">{formatPrice(subtotal.cents, subtotal.currency, locale)}</span>
            </div>
            {subtotal.mixed && <p className="mb-4 text-xs text-ink-muted">{t("mixedCurrency")}</p>}
            <Link
              href="/checkout"
              className="flex h-12 items-center justify-center rounded-full bg-accent text-sm font-medium text-paper"
            >
              {ta("checkout")}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
