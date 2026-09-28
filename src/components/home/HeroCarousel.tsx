"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";

export type HeroSlide = HeroSlideData;

const SWIPE_THRESHOLD = 40;

/**
 * 首页头图轮播(主 PSD UI 树精确还原,5 屏)。所有位置为头图区(容器=视口-header)百分比:
 * - 屏 1:is.offy 字标(x 居中,顶 9.7%,宽 18.3%)+ slogan 一行(顶 29.5%,宽 55%居中,
 *   移动端允许换行);
 * - 屏 2 促销屏:玩偶(x11%,y10%,w46%,h50%)+ 包包 2×2(x61.7%,y18.2%)+
 *   文案 PNG(x11.5%,y62.4%,w50%);
 * - 屏 3-5 系列屏:玩偶上半 + 左下标题组 —— 标题 PNG(x11.5%,y62.4%,w41.9%)、
 *   副标题 PNG(OFFY 行右侧,x39.9%,y62.6%,w13.5%)、查看详情按钮(x58%,y73.1%);
 *   时尚屏深色背景白字(dark)。
 * 尺寸用 clamp() 约束:vw 为主、设上下限,移动端等比缩小,过长文字换行不截断。
 */
export function HeroCarousel({
  slides,
  locale,
  intervalMs = 5000,
}: {
  slides: HeroSlide[];
  locale: string;
  intervalMs?: number;
}) {
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const go = (i: number) => setActive(((i % slides.length) + slides.length) % slides.length);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  /** 屏 2:PSD「头图-活动奖励」合成屏(坐标按 PSD 头图区百分比)。 */
  const renderPromo = (s: HeroSlide) => (
    <div className="absolute inset-0 bg-white">
      {/* 玩偶(PSD 本体区 x11% y10% w46% h50%) */}
      <div className="absolute left-[11%] top-[10%] h-[50%] w-[46%]">
        <Image
          src={s.promo!.doll}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 46vw, 46vw"
          className="object-contain object-center"
        />
      </div>
      {/* 包包 2×2(PSD x61.7% y18.2%,单格 20.2% 宽) */}
      <div className="absolute left-[61.7%] top-[18.2%] grid w-[40.4%] grid-cols-2">
        {s.promo!.bags.map((bag) => (
          <div key={bag} className="relative aspect-square">
            <Image
              src={bag}
              alt=""
              fill
              sizes="20vw"
              className="object-contain object-center"
            />
          </div>
        ))}
      </div>
      {/* 文案 PNG(PSD x11.5% y62.4% w49.9%) */}
      <div className="absolute left-[11.5%] top-[62.4%] w-[50%] max-w-[720px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.promo!.text}
          alt={locale === "zh" ? "即日起，任意购买三个公仔以上，送offy包包" : "Buy any 3 plush dolls, get an Offy bag free"}
          className="w-full"
        />
      </div>
    </div>
  );

  /** 屏 3-5 系列屏:左下标题组(标题+副标题+查看详情按钮)。 */
  const renderSeriesOverlay = (s: HeroSlide) => {
    const textColor = s.dark ? "text-cream" : "text-ink";
    const arrowSrc = s.dark ? "/assets/hero/cta-arrow-white.png" : "/assets/hero/cta-arrow.png";
    return (
      <>
        {/* 标题 PNG(PSD x11.5% y62.4% w41.9%);clamp 下限防移动端过小 */}
        <div className="absolute left-[11.5%] top-[62.4%] w-[41.9%] min-w-[150px] max-w-[604px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.titleImage}
            alt={s.subtitleAlt ? (locale === "zh" ? `OFFY 系列` : "OFFY series") : ""}
            className="w-full"
          />
        </div>
        {/* 副标题 PNG(PSD x39.9% y62.6% w13.5%,与 OFFY 行右对齐) */}
        {s.subtitleImage && (
          <div className="absolute left-[39.9%] top-[62.6%] w-[13.5%] min-w-[52px] max-w-[195px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.subtitleImage}
              alt={locale === "zh" ? s.subtitleAlt!.zh : s.subtitleAlt!.en}
              className="w-full"
            />
          </div>
        )}
        {/* 查看详情按钮(PSD x58% y73.1% w13% h6.1%):描边样式 + 箭头图标 */}
        <Link
          href={s.href!}
          className={`group absolute left-[58%] top-[73.1%] flex h-[6.1%] min-h-[34px] w-[13%] min-w-[86px] max-w-[187px] items-center justify-center gap-1.5 rounded-full border-[1.5px] text-[clamp(10px,1.1vw,14px)] font-medium transition-colors ${
            s.dark
              ? "border-cream/70 text-cream hover:bg-cream hover:text-ink"
              : "border-ink/70 text-ink hover:bg-ink hover:text-cream"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="whitespace-nowrap">{locale === "zh" ? "查看详情" : "Details"}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={arrowSrc} alt="" className="h-[0.9em] w-auto transition-colors group-hover:invert" />
        </Link>
      </>
    );
  };

  const renderOverlay = (s: HeroSlide) => (
    <>
      {/* 屏 1:is.offy 字标(PSD x 居中,顶 9.7%,宽 18.3%)+ slogan(顶 29.5%) */}
      {s.wordmark && (
        <>
          <div className="absolute inset-x-0 top-[9.7%] flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/is-offy-wordmark.png"
              alt="is.offy"
              className="w-[18.3%] min-w-[110px] max-w-[264px]"
            />
          </div>
          <div className="absolute inset-x-0 top-[29.5%] flex justify-center px-6">
            {/* vw 主单位(一行宽由视口宽决定);移动端字号收敛,过长时自然换行不溢出 */}
            <p className="max-w-full break-words text-center text-[clamp(15px,4.2vw,50px)] font-bold leading-[1.65] tracking-[0.1em] text-ink">
              {locale === "zh" ? s.text!.zh : s.text!.en}
            </p>
          </div>
        </>
      )}
      {s.titleImage && renderSeriesOverlay(s)}
    </>
  );

  return (
    <div
      className="absolute inset-x-0 bottom-0 top-[var(--header-h)]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (dx <= -SWIPE_THRESHOLD) go(active + 1);
        else if (dx >= SWIPE_THRESHOLD) go(active - 1);
      }}
    >
      {slides.map((s, i) => {
        const cls = `absolute inset-0 transition-opacity duration-1000 ease-editorial ${
          i === active ? "opacity-100" : "pointer-events-none opacity-0"
        }`;
        const content = s.promo ? (
          renderPromo(s)
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: s.bg }}>
            <Image
              src={s.image}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-contain object-center"
            />
            {renderOverlay(s)}
          </div>
        );
        // 系列屏不再整图可点(避免与「查看详情」按钮形成 <a> 嵌套 <a>);
        // 按钮是屏内唯一导航入口。
        return (
          <div key={s.image} aria-hidden={i !== active} className={cls}>
            {content}
          </div>
        );
      })}

      {/* 底部居中:横线指示条 */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Slides">
        {slides.map((s, i) => (
          <button
            key={s.image}
            role="tab"
            aria-selected={i === active}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => go(i)}
            className={`h-[3px] rounded-full transition-all duration-500 ${
              i === active ? "w-10 bg-ink/70" : "w-5 bg-ink/30 hover:bg-ink/50"
            }`}
          />
        ))}
      </div>

      {/* 右下角:←/→ 深色箭头按钮(PSD 白色箭头 PNG) */}
      <div className="absolute bottom-5 right-5 z-10 flex gap-2 md:bottom-6 md:right-8">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => go(active - 1)}
          className="flex h-11 w-11 items-center justify-center bg-ink/80 transition-colors hover:bg-ink"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/hero/arrow-left.png" alt="" className="h-3 w-auto" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => go(active + 1)}
          className="flex h-11 w-11 items-center justify-center bg-ink/80 transition-colors hover:bg-ink"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/hero/arrow-right.png" alt="" className="h-3 w-auto" />
        </button>
      </div>
    </div>
  );
}
