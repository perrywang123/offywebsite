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
            className="bg-cream absolute top-0 right-0 flex h-full w-[88%] max-w-sm flex-col shadow-2xl"
          >
            <div className="border-cream-line flex shrink-0 items-center justify-between border-b px-6 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/brand/is-offy-logo.png" alt="is.offy" className="h-auto w-[88px]" />
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-ink-muted hover:bg-cream-deep flex h-11 w-11 items-center justify-center rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <nav
                aria-label="Mobile navigation"
                className="flex flex-col text-[15px] font-medium uppercase"
              >
                <Link
                  href="/products"
                  onClick={close}
                  className="border-cream-line/60 flex min-h-12 items-center border-b transition-opacity hover:opacity-60"
                >
                  {t("nav.new")}
                </Link>
                <Link
                  href="/products"
                  onClick={close}
                  className="flex min-h-12 items-center transition-opacity hover:opacity-60"
                >
                  {t("nav.shop")}
                </Link>
                <div className="mb-3.5 flex flex-col py-1 pl-3">
                  {series.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/collections/${s.slug}`}
                      onClick={close}
                      className="text-ink-soft hover:text-ink flex min-h-11 items-center text-[13px] font-normal tracking-[0.01em] normal-case transition-colors hover:underline hover:underline-offset-4"
                    >
                      {locale === "zh" ? s.name.zh : s.name.en}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/collections"
                  onClick={close}
                  className="border-cream-line/60 flex min-h-12 items-center border-b transition-opacity hover:opacity-60"
                >
                  {t("nav.series")}
                </Link>
                <Link
                  href="/about"
                  onClick={close}
                  className="border-cream-line/60 flex min-h-12 items-center border-b transition-opacity hover:opacity-60"
                >
                  {t("nav.about")}
                </Link>
              </nav>
              <p className="text-ink-muted mt-7 mb-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                {t("footer.policiesHeading")}
              </p>
              <nav aria-label={t("footer.policiesHeading")}>
                {[
                  ["/faq", t("footer.faqLabel")],
                  ["/policies/contact", t("footer.contactLabel")],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className="border-cream-line/60 flex min-h-11 items-center justify-between border-b text-[13px] transition-opacity hover:opacity-60"
                  >
                    {label}
                    <span aria-hidden="true" className="text-ink-muted text-lg">
                      →
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
            <div className="border-cream-line shrink-0 border-t px-6 py-4">
              <CountryTrigger variant="menu" onOpen={close} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
