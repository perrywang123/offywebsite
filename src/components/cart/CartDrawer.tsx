"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getProductByCode } from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";
import { useCart } from "./CartProvider";

export function CartDrawer() {
  const { lines, isOpen, close, setQty, remove } = useCart();
  const locale = useLocale();
  const t = useTranslations("common.cart");
  const ta = useTranslations("common.actions");

  const items = lines
    .map((line) => ({ line, product: getProductByCode(line.code) }))
    .filter((x): x is { line: { code: string; quantity: number }; product: NonNullable<ReturnType<typeof getProductByCode>> } => Boolean(x.product));

  const subtotal = items.reduce((sum, x) => sum + x.product.priceCents * x.line.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={close} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-paper shadow-2xl">
        <header className="flex items-center justify-between border-b border-sand-200 px-6 py-4">
          <h2 className="text-lg font-bold">
            {t("title")} ({lines.length})
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-cream-100"
          >
            ✕
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-lg font-semibold">{t("empty")}</p>
            <p className="text-sm text-ink-500">{t("emptyHint")}</p>
            <Link
              href="/products"
              onClick={close}
              className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-ink-900 px-6 text-sm font-medium text-paper"
            >
              {ta("continueShopping")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-sand-200 overflow-y-auto">
              {items.map(({ line, product }) => (
                <li key={line.code} className="flex gap-4 p-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                    <Image src={product.images[0]} alt={product.name.en} fill className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="font-medium">{locale === "zh" ? product.name.zh : product.name.en}</p>
                    <p className="text-sm text-ink-500">{formatUsdCents(product.priceCents, locale)}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-sand-200">
                        <button
                          type="button"
                          onClick={() => setQty(line.code, line.quantity - 1)}
                          className="h-8 w-8 text-ink-700"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQty(line.code, line.quantity + 1)}
                          className="h-8 w-8 text-ink-700"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.code)}
                        className="text-xs text-ink-500 underline hover:text-ink-900"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-t border-sand-200 bg-cream-50 p-6">
              <div className="mb-4 flex justify-between font-medium">
                <span>{t("subtotal")}</span>
                <span>{formatUsdCents(subtotal, locale)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={close}
                className="flex h-12 items-center justify-center rounded-full bg-pop-coral text-sm font-medium text-paper"
              >
                {ta("checkout")}
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
