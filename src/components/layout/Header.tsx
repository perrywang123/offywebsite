"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Series } from "@/lib/catalog";
import { CartButton } from "@/components/cart/CartButton";
import { MobileNav } from "./MobileNav";

const PROMO_ROTATE_MS = 4500;

/**
 * `series` 由根布局 [`layout.tsx`](src/app/[locale]/layout.tsx) 服务端实时拉取
 * (`getLiveSeriesList()`)后下发,而不是本组件直接 import 本地静态 `seriesList`——
 * Header 是 "use client" 组件,拿不到服务端 fetch,靠 props 下发才能让导航里的
 * 系列名跟随 Shopify Collection 标题实时变化。
 */
export function Header({ series }: { series: Series[] }) {
  const t = useTranslations("common");
  const locale = useLocale();

  // 顶部 promo 条:多条促销语轮播淡入淡出(2026 首页文案表第 2-3 行)。
  const promoMessages = t.raw("promoMessages") as string[];
  const [promoIndex, setPromoIndex] = useState(0);
  useEffect(() => {
    if (promoMessages.length <= 1) return;
    const id = setInterval(() => setPromoIndex((i) => (i + 1) % promoMessages.length), PROMO_ROTATE_MS);
    return () => clearInterval(id);
  }, [promoMessages.length]);

  // 头图已换为浅底素材,header 始终实底黑字(与交互稿一致);
  // 旧深色 hero 的"透明白字覆盖 + 滚动滑入"逻辑已停用(overHero 恒 false)。
  const overHero = false;

  return (
    <header className="sticky top-0 z-50">
      {/* 顶部 promo 条：始终黑底白字，居中，多条文案轮播;
          不用 truncate/绝对定位堆叠——窄屏下英文促销语较长,绝对定位+truncate
          会把文字裁掉看不全,这里改成单一可见 span + 自然换行(min-h 兜底,
          文案变长时整条高度自适应撑开,而不是裁切内容)。 */}
      <div className="flex min-h-10 items-center justify-center bg-ink px-4 py-1.5 text-center text-[11px] uppercase leading-snug tracking-[var(--tracking-16)] text-cream">
        <span key={promoIndex} className="animate-fade-up max-w-full">
          {promoMessages[promoIndex]}
        </span>
      </div>

      {/* 导航栏 */}
      <div className={`relative h-16 md:h-[72px] ${overHero ? "text-cream" : "text-ink"}`}>
        {/* 白底层：滚动 / 非 hero 页从上滑入 */}
        <div
          className={`absolute inset-0 border-b border-cream-line bg-cream/90 backdrop-blur-md transition-transform duration-[400ms] ease-editorial ${
            overHero ? "-translate-y-full" : "translate-y-0"
          }`}
        />

        <div className="container-site relative flex h-full items-center justify-between">
          {/* 左：品牌字标(PSD 导航 LOGO 图层,ink 色) */}
          <Link
            href="/"
            aria-label="is.offy"
            className={`flex items-center transition-all duration-[400ms] ease-editorial ${
              overHero
                ? "translate-y-3 opacity-0"
                : "translate-y-0 opacity-100 delay-200"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/is-offy-logo.png"
              alt="is.offy"
              className="h-6 w-auto md:h-7"
            />
          </Link>

          {/* 中/右导航 */}
          <nav className="hidden items-center gap-8 text-xs font-medium uppercase tracking-[var(--tracking-14)] md:flex">
            <Link href="/products" className="transition-opacity hover:opacity-60">
              {t("nav.new")}
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
                  <div className="container-site grid grid-cols-2 gap-x-8 gap-y-2 py-8 sm:grid-cols-3 lg:grid-cols-4">
                    <Link
                      href="/products"
                      className="text-sm font-medium uppercase tracking-[var(--tracking-10)] text-ink transition-colors hover:text-brown-600"
                    >
                      {t("nav.allLooks")}
                    </Link>
                    {series.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/collections/${s.slug}`}
                        className="text-sm uppercase tracking-[var(--tracking-10)] text-ink-soft transition-colors hover:text-brown-600"
                      >
                        {locale === "zh" ? s.name.zh : s.name.en}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Link href="/collections" className="transition-opacity hover:opacity-60">
              {t("nav.series")}
            </Link>
            <Link href="/about" className="transition-opacity hover:opacity-60">
              {t("nav.about")}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* 语言切换按钮已摘除:站点当前对外英文单语(见 src/i18n/routing.ts)。
                恢复多语言时,把 `import { LanguageSwitcher } from "./LanguageSwitcher";`
                加回文件顶部,并在下面这个 div 里放回 <LanguageSwitcher />。 */}
            <CartButton />
            <MobileNav series={series} />
          </div>
        </div>
      </div>
    </header>
  );
}
