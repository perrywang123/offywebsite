"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Series } from "@/lib/catalog";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * 移动端抽屉导航(<768px):汉堡按钮 + 右侧滑入面板。
 * 含主导航链接、系列子链接与语言切换;Esc / 遮罩点击 / 链接跳转均关闭。
 * `series` 由 [`Header`](src/components/layout/Header.tsx) 转发(根布局实时
 * 拉取的 `getLiveSeriesList()` 结果),保证系列名与 Shopify 实时一致。
 */
export function MobileNav({ series }: { series: Series[] }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-cream-deep"
      >
        <span aria-hidden className="text-lg leading-none">{open ? "✕" : "☰"}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            data-testid="mobile-nav-backdrop"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={close}
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute right-0 top-0 flex h-full w-4/5 max-w-xs flex-col bg-cream shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-cream-line px-6 py-4">
              <span className="font-display text-lg font-semibold">{t("brandLatin")}</span>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-cream-deep"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-6 py-6 text-sm font-medium uppercase tracking-[var(--tracking-14)]">
              <Link href="/products" onClick={close} className="py-3 transition-opacity hover:opacity-60">
                {t("nav.new")}
              </Link>
              <Link href="/products" onClick={close} className="py-3 transition-opacity hover:opacity-60">
                {t("nav.shop")}
              </Link>
              <div className="flex flex-col gap-1 border-l border-cream-line pl-4">
                {series.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/collections/${s.slug}`}
                    onClick={close}
                    className="py-2 text-xs text-ink-soft transition-colors hover:text-brown-600"
                  >
                    {locale === "zh" ? s.name.zh : s.name.en}
                  </Link>
                ))}
              </div>
              <Link href="/collections" onClick={close} className="py-3 transition-opacity hover:opacity-60">
                {t("nav.series")}
              </Link>
              <Link href="/about" onClick={close} className="py-3 transition-opacity hover:opacity-60">
                {t("nav.about")}
              </Link>
            </nav>
            <div className="mt-auto border-t border-cream-line px-6 py-4">
              <LanguageSwitcher />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
