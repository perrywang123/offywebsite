"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CountryTrigger } from "@/components/market/CountrySelector";
import type { Series } from "@/lib/catalog";

/**
 * 移动端抽屉导航(<768px):汉堡按钮 + 右侧滑入面板。
 * 含主导航链接与系列子链接;Esc / 遮罩点击 / 链接跳转均关闭。
 * `series` 由 [`Header`](src/components/layout/Header.tsx) 转发(根布局实时
 * 拉取的 `getLiveSeriesList()` 结果),保证系列名与 Shopify 实时一致。
 *
 * 语言切换按钮已摘除(站点当前对外英文单语,见 src/i18n/routing.ts):
 * 恢复多语言时,加回顶部 `import { LanguageSwitcher } from "./LanguageSwitcher";`
 * 并在 `</nav>` 之后放回原来的页脚块
 * `<div className="mt-auto border-t border-cream-line px-6 py-4"><LanguageSwitcher /></div>`。
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
        className="hover:bg-cream-deep flex h-11 w-11 items-center justify-center rounded-full transition-colors"
      >
        <span aria-hidden className="text-lg leading-none">
          {open ? "✕" : "☰"}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            data-testid="mobile-nav-backdrop"
            className="bg-ink/40 absolute inset-0 backdrop-blur-sm"
            onClick={close}
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="bg-cream absolute top-0 right-0 flex h-full w-4/5 max-w-xs flex-col shadow-2xl"
          >
            <div className="border-cream-line flex items-center justify-between border-b px-6 py-4">
              <span className="font-display text-lg font-semibold">{t("brandLatin")}</span>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-ink-muted hover:bg-cream-deep flex h-11 w-11 items-center justify-center rounded-full"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-6 py-6 text-sm font-medium tracking-[var(--tracking-14)] uppercase">
              <Link
                href="/products"
                onClick={close}
                className="py-3 transition-opacity hover:opacity-60"
              >
                {t("nav.new")}
              </Link>
              <Link
                href="/products"
                onClick={close}
                className="py-3 transition-opacity hover:opacity-60"
              >
                {t("nav.shop")}
              </Link>
              <div className="border-cream-line flex flex-col gap-1 border-l pl-4">
                {series.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/collections/${s.slug}`}
                    onClick={close}
                    className="text-ink-soft hover:text-brown-600 py-2 text-xs transition-colors"
                  >
                    {locale === "zh" ? s.name.zh : s.name.en}
                  </Link>
                ))}
              </div>
              <Link
                href="/collections"
                onClick={close}
                className="py-3 transition-opacity hover:opacity-60"
              >
                {t("nav.series")}
              </Link>
              <Link
                href="/about"
                onClick={close}
                className="py-3 transition-opacity hover:opacity-60"
              >
                {t("nav.about")}
              </Link>
            </nav>
            <div className="border-cream-line mt-auto border-t px-6 py-4">
              <CountryTrigger variant="menu" onOpen={close} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
