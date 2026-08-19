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

  const transparent = pathname === "/" && !scrolled;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        transparent ? "bg-transparent" : "border-b border-cream-line bg-cream/85 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            {t("brandLatin")}
          </span>
          <span className="text-sm font-medium text-ink-soft">{t("brandZh")}</span>
        </Link>

        <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.14em] text-ink-soft md:flex">
          <Link href="/products" className="link-line hover:text-ink">
            New
          </Link>
          <div className="group relative">
            <Link href="/products" className="link-line flex items-center gap-1 hover:text-ink">
              Shop
              <span aria-hidden className="text-[10px]">▾</span>
            </Link>
            <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
              <div className="rounded-soft border border-cream-line bg-paper p-2 shadow-card">
                <Link href="/products" className="block rounded-soft px-3 py-2 text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:bg-cream-deep">
                  {locale === "zh" ? "全部形象" : "All Looks"}
                </Link>
                <div className="my-1 border-t border-cream-line" />
                {seriesList.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/collections/${s.slug}`}
                    className="block rounded-soft px-3 py-2 text-xs uppercase tracking-[0.1em] text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink"
                  >
                    {locale === "zh" ? s.name.zh : s.name.en}
                  </Link>
                ))}
                <div className="my-1 border-t border-cream-line" />
                <Link href="/about" className="block rounded-soft px-3 py-2 text-xs uppercase tracking-[0.1em] text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink">
                  {locale === "zh" ? "联名 / 定制" : "Custom & Collab"}
                </Link>
              </div>
            </div>
          </div>
          <Link href="/collections" className="link-line hover:text-ink">
            Series
          </Link>
          <Link href="/about" className="link-line hover:text-ink">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
