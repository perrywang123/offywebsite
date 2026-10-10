"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cartTotal, formatPrice } from "@/lib/pricing";
import { useCart, type CartCatalogEntry } from "./CartProvider";

export function CartDrawer() {
  const { lines, catalog, catalogLoaded, isOpen, mounted, close, setQty, remove } = useCart();
  const locale = useLocale();
  const t = useTranslations("common.cart");
  const ta = useTranslations("common.actions");
  const closeRef = useRef<HTMLButtonElement>(null);

  // 打开时焦点移入抽屉(关闭按钮),Escape 关闭 —— WAI-ARIA Dialog 规范。
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  // `catalog`(来自 /api/products 实时拉取)未加载完成前不做"商品不存在"的
  // 判定,避免把"数据还没到"误判成"购物车是空的"闪烁一下。
  const items = lines
    .map((line) => ({ line, product: catalog[line.code] }))
    .filter((x): x is { line: { code: string; quantity: number }; product: CartCatalogEntry } => Boolean(x.product));

  // 逐行按**该行自己的币种**格式化(价格来自 /api/products,已按访客市场返回);
  // 小计交给 cartTotal:它绝不会把不同币种的金额相加,而是置位 mixed 让我们提示。
  const subtotal = cartTotal(
    items.map((x) => ({ priceCents: x.product.priceCents, currency: x.product.currency, quantity: x.line.quantity })),
  );

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="cart-overlay absolute inset-0 bg-ink/40 backdrop-blur-sm" data-open={isOpen} onClick={close} />
      <aside
        className="cart-drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl"
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
      >
        <header className="flex items-center justify-between border-b border-cream-line px-6 py-4">
          <h2 className="text-base font-semibold uppercase tracking-[var(--tracking-14)]">
            {t("title")} ({lines.length})
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={ta("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-cream-deep"
          >
            ✕
          </button>
        </header>

        {!catalogLoaded && lines.length > 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-muted">
            {t("loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-base font-medium">{t("empty")}</p>
            <p className="text-sm text-ink-muted">{t("emptyHint")}</p>
            <Link
              href="/products"
              onClick={close}
              className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream"
            >
              {ta("continueShopping")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-cream-line overflow-y-auto">
              {items.map(({ line, product }) => (
                <li key={line.code} className="flex gap-4 p-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-soft bg-paper">
                    <Image
                      src={product.images[0]}
                      alt={locale === "zh" ? product.name.zh : product.name.en}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-medium">{locale === "zh" ? product.name.zh : product.name.en}</p>
                    <p className="text-sm text-ink-muted tabular-nums">
                      {formatPrice(product.priceCents, product.currency, locale)}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-sand">
                        <button type="button" onClick={() => setQty(line.code, line.quantity - 1)} className="h-8 w-8 text-ink-soft">−</button>
                        <span className="w-8 text-center text-sm">{line.quantity}</span>
                        <button type="button" onClick={() => setQty(line.code, line.quantity + 1)} className="h-8 w-8 text-ink-soft">+</button>
                      </div>
                      <button type="button" onClick={() => remove(line.code)} className="link-line text-xs">
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-t border-cream-line bg-cream-deep p-6">
              <div className="mb-4 flex justify-between text-sm font-medium">
                <span>{t("subtotal")}</span>
                <span className="tabular-nums">{formatPrice(subtotal.cents, subtotal.currency, locale)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={close}
                className="flex h-12 items-center justify-center rounded-full bg-accent text-sm font-medium text-cream"
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
