"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getProductByCode } from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";
import { useCart } from "@/components/cart/CartProvider";

export default function CartPage() {
  const { lines, setQty, remove } = useCart();
  const locale = useLocale();
  const t = useTranslations("common.cart");
  const ta = useTranslations("common.actions");

  const items = lines
    .map((line) => ({ line, product: getProductByCode(line.code) }))
    .filter((x): x is { line: { code: string; quantity: number }; product: NonNullable<ReturnType<typeof getProductByCode>> } => Boolean(x.product));

  const subtotal = items.reduce((sum, x) => sum + x.product.priceCents * x.line.quantity, 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
      <h1 className="mb-8 font-display text-4xl font-black">{t("title")}</h1>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-ink-700">{t("empty")}</p>
          <p className="mt-2 text-sm text-ink-500">{t("emptyHint")}</p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ink-900 px-6 text-sm font-medium text-paper"
          >
            {ta("continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <ul className="divide-y divide-sand-200">
            {items.map(({ line, product }) => (
              <li key={line.code} className="flex gap-4 py-6">
                <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                  <Image src={product.images[0]} alt={product.name.en} fill sizes="96px" className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col">
                  <p className="font-medium">{locale === "zh" ? product.name.zh : product.name.en}</p>
                  <p className="text-sm text-ink-500">{formatUsdCents(product.priceCents, locale)}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-sand-200">
                      <button type="button" onClick={() => setQty(line.code, line.quantity - 1)} className="h-9 w-9 text-ink-700">−</button>
                      <span className="w-8 text-center text-sm">{line.quantity}</span>
                      <button type="button" onClick={() => setQty(line.code, line.quantity + 1)} className="h-9 w-9 text-ink-700">+</button>
                    </div>
                    <button type="button" onClick={() => remove(line.code)} className="text-xs text-ink-500 underline hover:text-ink-900">
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
              <span>{formatUsdCents(subtotal, locale)}</span>
            </div>
            <Link
              href="/checkout"
              className="flex h-12 items-center justify-center rounded-full bg-pop-coral text-sm font-medium text-paper"
            >
              {ta("checkout")}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
