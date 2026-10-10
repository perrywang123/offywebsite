"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cartTotal, formatPrice } from "@/lib/pricing";
import { useCart, type CartCatalogEntry } from "./CartProvider";
import { useCheckoutRedirect } from "./useCheckoutRedirect";
import { useScrollLock } from "@/hooks/useScrollLock";

export function CartDrawer() {
  const { lines, catalog, catalogLoaded, isOpen, mounted, close, setQty, remove } = useCart();
  const locale = useLocale();
  const t = useTranslations("common.cart");
  const ta = useTranslations("common.actions");
  const closeRef = useRef<HTMLButtonElement>(null);
  // Checkout 直接去 Shopify 结算页(不再经过我们自己的 /checkout);失败时该
  // hook 会回退跳转到 /checkout 并置位 failed,提示见下方 footer。
  const checkout = useCheckoutRedirect();

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

  // 打开期间锁住页面滚动:否则手指在抽屉里滑到底后继续滑,背景页会跟着滚
  // (移动端"抽屉没关但页面跑了"的经典问题,方案 #37)。
  useScrollLock(isOpen);

  // `catalog`(来自 /api/products 实时拉取)未加载完成前不做"商品不存在"的
  // 判定,避免把"数据还没到"误判成"购物车是空的"闪烁一下。
  const items = lines
    .map((line) => ({ line, product: catalog[line.code] }))
    .filter((x): x is { line: { code: string; quantity: number }; product: CartCatalogEntry } =>
      Boolean(x.product),
    );

  // 逐行按**该行自己的币种**格式化(价格来自 /api/products,已按访客市场返回);
  // 小计交给 cartTotal:它绝不会把不同币种的金额相加,而是置位 mixed 让我们提示。
  const subtotal = cartTotal(
    items.map((x) => ({
      priceCents: x.product.priceCents,
      currency: x.product.currency,
      quantity: x.line.quantity,
    })),
  );

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="cart-overlay bg-ink/40 absolute inset-0 backdrop-blur-sm"
        data-open={isOpen}
        onClick={close}
      />
      {/* `w-full` 的抽屉在窄屏把遮罩压成 0 宽 —— 顾客点不到遮罩就退不出去
          (方案 #32)。88% 与同仓 MobileNav 的 `w-4/5` 同源,给遮罩留出可点区域;
          `max-w-md` 让 ≥1024px 仍然是原来的 448px(桌面表现不变)。
          高度用 dvh:地址栏/工具栏收放时抽屉要跟着变,否则底部的 Checkout
          会被浏览器工具栏压住(方案 #21/#36);不支持 dvh 的浏览器保留 h-full。 */}
      <aside
        className="cart-drawer bg-cream absolute top-0 right-0 flex h-full w-[88%] max-w-md flex-col shadow-2xl supports-[height:100dvh]:h-dvh"
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
      >
        <header className="border-cream-line safe-t flex items-center justify-between border-b px-4 pb-4 lg:px-6">
          <h2 className="text-base font-semibold tracking-[var(--tracking-14)] uppercase">
            {t("title")} ({lines.length})
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={ta("close")}
            className="text-ink-muted hover:bg-cream-deep flex h-11 w-11 shrink-0 items-center justify-center rounded-full lg:h-8 lg:w-8"
          >
            ✕
          </button>
        </header>

        {!catalogLoaded && lines.length > 0 ? (
          <div className="text-ink-muted flex flex-1 items-center justify-center px-4 text-center text-sm lg:px-6">
            {t("loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center lg:px-6">
            <p className="text-base font-medium">{t("empty")}</p>
            <p className="text-ink-muted text-sm">{t("emptyHint")}</p>
            <Link
              href="/products"
              onClick={close}
              className="bg-ink text-cream mt-2 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium"
            >
              {ta("continueShopping")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-cream-line flex-1 divide-y overflow-y-auto overscroll-contain">
              {items.map(({ line, product }) => (
                <li key={line.code} className="flex gap-4 p-4">
                  <div className="rounded-soft bg-paper relative h-24 w-20 shrink-0 overflow-hidden">
                    <Image
                      src={product.images[0]}
                      alt={locale === "zh" ? product.name.zh : product.name.en}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    {/* 线上有 49 字符的长商品名(方案 #41):不夹住的话行高在
                        52px↔12px 之间抖,价格与步进器的间距跟着乱跳。 */}
                    <p className="line-clamp-2 text-sm font-medium">
                      {locale === "zh" ? product.name.zh : product.name.en}
                    </p>
                    <p className="text-ink-muted text-sm tabular-nums">
                      {formatPrice(product.priceCents, product.currency, locale)}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      {/* 步进器 32 → 44px,并且两个按钮之间留 gap-1:原来 −/+ 相邻,
                          减数量时很容易误触到加数量(方案 #33/#20)。 */}
                      <div className="border-sand flex items-center gap-1 rounded-full border">
                        <button
                          type="button"
                          onClick={() => setQty(line.code, line.quantity - 1)}
                          className="text-ink-soft h-11 w-11 lg:h-8 lg:w-8"
                        >
                          −
                        </button>
                        <span className="w-9 text-center text-sm">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQty(line.code, line.quantity + 1)}
                          className="text-ink-soft h-11 w-11 lg:h-8 lg:w-8"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.code)}
                        className="link-line tap-target--quiet text-xs"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-cream-line bg-cream-deep safe-b border-t px-4 pt-4 lg:px-6 lg:pt-6 lg:pb-6">
              <div className="mb-4 flex justify-between text-sm font-medium">
                <span>{t("subtotal")}</span>
                <span className="tabular-nums">
                  {formatPrice(subtotal.cents, subtotal.currency, locale)}
                </span>
              </div>
              {checkout.failed && (
                <p role="alert" className="text-error mb-3 text-xs">
                  {t("checkoutFallback")}
                </p>
              )}
              {/* 4xx:服务端点名了买不了的商品 → **不跳转**,在这里说清是哪一件、
                  下一步做什么,顾客把商品移除后可以原地重试(方案 P0-3)。
                  界面上永远不出现 invalid_items / checkout_failed 这类原始码。 */}
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
              {/* 这是一次"动作"(建 Shopify cart 后整页跳走),不是站内导航,
                  所以用 button;键盘可达性由原生 button 保证(Tab / Enter / Space)。
                  加载中 disabled + aria-busy:既挡住连点,也让读屏知道正在处理。 */}
              <button
                type="button"
                onClick={() =>
                  void checkout.startCheckout(
                    items.map((x) => ({ code: x.line.code, quantity: x.line.quantity })),
                  )
                }
                disabled={checkout.pending}
                aria-busy={checkout.pending}
                className="bg-accent text-cream hover:bg-accent-deep flex h-12 w-full items-center justify-center rounded-full text-sm font-medium transition-colors disabled:opacity-70"
              >
                {checkout.pending ? t("checkoutRedirecting") : ta("checkout")}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
