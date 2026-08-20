"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { seriesList } from "@/lib/catalog";
import { CartButton } from "@/components/cart/CartButton";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 仅首页 hero 顶部呈透明覆盖（白字）；其余页面或滚动后为实底（黑字）。
  const overHero = pathname === "/" && !scrolled;

  return (
    <header className="sticky top-0 z-50">
      {/* 顶部 promo 条：始终黑底白字，居中 */}
      <div className="flex h-10 items-center justify-center bg-ink px-4 text-center text-[11px] uppercase tracking-[0.16em] text-cream">
        {t("promo")}
      </div>

      {/* 导航栏 */}
      <div className={`relative h-16 md:h-[72px] ${overHero ? "text-cream" : "text-ink"}`}>
        {/* 白底层：滚动 / 非 hero 页从上滑入 */}
        <div
          className={`absolute inset-0 border-b border-cream-line bg-cream/90 backdrop-blur-md transition-transform duration-[400ms] ease-editorial ${
            overHero ? "-translate-y-full" : "translate-y-0"
          }`}
        />

        <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* 左：品牌字标，滚动后延迟滑入 */}
          <Link
            href="/"
            className={`flex items-baseline gap-2 transition-all duration-[400ms] ease-editorial ${
              overHero
                ? "translate-y-3 opacity-0"
                : "translate-y-0 opacity-100 delay-200"
            }`}
          >
            <span className="font-display text-lg font-semibold tracking-tight">
              {t("brandLatin")}
            </span>
            <span className="hidden text-sm font-medium text-ink-soft sm:inline">
              {t("brandZh")}
            </span>
          </Link>

          {/* 中/右导航 */}
          <nav className="hidden items-center gap-8 text-xs font-medium uppercase tracking-[0.14em] md:flex">
            <Link href="/products" className="transition-opacity hover:opacity-60">
              {locale === "zh" ? "新品" : "New"}
            </Link>

            {/* Shop mega-menu：全宽下拉，hover 淡入下滑 */}
            <div className="group static">
              <Link
                href="/products"
                className="flex items-center gap-1 transition-opacity hover:opacity-60"
              >
                {t("nav.shop")}
                <span aria-hidden className="text-[10px]">▾</span>
              </Link>
              <div className="invisible absolute left-0 right-0 top-full z-50 -translate-y-2 opacity-0 transition-all duration-300 ease-editorial group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="border-b border-cream-line bg-cream/95 shadow-card backdrop-blur-md">
                  <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-2 px-6 py-8 sm:grid-cols-3 lg:grid-cols-4 lg:px-8">
                    <Link
                      href="/products"
                      className="text-sm font-medium uppercase tracking-[0.1em] text-ink transition-colors hover:text-brown-600"
                    >
                      {locale === "zh" ? "全部形象" : "All Looks"}
                    </Link>
                    {seriesList.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/collections/${s.slug}`}
                        className="text-sm uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-brown-600"
                      >
                        {locale === "zh" ? s.name.zh : s.name.en}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Link href="/collections" className="transition-opacity hover:opacity-60">
              {locale === "zh" ? "系列" : "Series"}
            </Link>
            <Link href="/about" className="transition-opacity hover:opacity-60">
              {t("nav.about")}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
