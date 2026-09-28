"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";

export type HeroSlide = HeroSlideData;

const SWIPE_THRESHOLD = 40;

/**
 * 首页头图轮播(设计稿精确还原,5 屏)。
 * 布局基准:图片区 = 视口去掉 sticky header(112px)后的区域,
 * 文字位置全部以图片区百分比定位(与设计稿实测一致):
 * - 屏 1:is.offy 字标顶 15% 图区(高 8%),slogan 两行顶 30%/41%(字高 6.4%);
 * - 屏 2:促销合成屏 —— 玩偶 x12-45%/y15-75%,包包 2×2 x55-95%/y20-70%,
 *   文案 PNG 底部 y82%;
 * - 屏 3-5:系列图(PSD 头图区合成,玩偶垂直居中)+ 标题 PNG 顶 23% 图区。
 * 底部横线指示条 + 右下角 ←/→ 箭头;自动播放 + 交叉淡入 + 触摸滑动。
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

  /** 屏 2:促销合成屏(白底 + 左大玩偶 + 右 2×2 包包 + 底部文案 PNG)。 */
  const renderPromo = (s: HeroSlide) => (
    <div className="absolute inset-0 bg-white">
      {/* 玩偶(PSD 布局: 宽 63% 视口,贴底;本体已裁切) */}
      <div className="absolute left-[-5%] top-[10%] h-[70%] w-[60%]">
        <Image
          src={s.promo!.doll}
          alt=""
          fill
          priority
          sizes="60vw"
          className="object-contain object-bottom"
        />
      </div>
      {/* 包包 2×2: x 50-95%, y 15-75%(设计稿) */}
      <div className="absolute right-[5%] top-[15%] grid w-[45%] grid-cols-2 gap-4 md:gap-6">
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
      {/* 文案 PNG: 左下(设计稿 y 72-92%,x 12% 起) */}
      <div className="absolute bottom-[8%] left-[12%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.promo!.text}
          alt={locale === "zh" ? "即日起，任意购买三个公仔以上，送offy包包" : "Buy any 3 plush dolls, get an Offy bag free"}
          className="w-[52vw] max-w-3xl"
        />
      </div>
    </div>
  );

  const renderOverlay = (s: HeroSlide) => (
    <>
      {/* 屏 1:is.offy 字标(顶 15.3% 图区)+ 两行 slogan(顶 30.7% 图区)。
          定位基准:容器 = header 之下(top: var(--header-h)),位置为容器 %。 */}
      {s.wordmark && (
        <>
          <div className="absolute inset-x-0 top-[15%] flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/is-offy-wordmark.png"
              alt="is.offy"
              className="h-[7.6vh] w-auto max-w-none"
            />
          </div>
          <div className="absolute inset-x-0 top-[30%] px-6 text-center">
            <p className="whitespace-pre-line text-[5.6vh] font-bold leading-[1.65] tracking-[0.15em] text-ink">
              {locale === "zh" ? s.text!.zh : s.text!.en}
            </p>
          </div>
        </>
      )}
      {/* 屏 3-5:标题 PNG(顶 23.4% 图区) */}
      {s.titleImage && (
        <div className="absolute inset-x-0 top-[23%] flex justify-center px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.titleImage}
            alt={locale === "zh" ? "OFFY 系列头图" : "OFFY series hero"}
            className="w-[42%] max-w-xl md:w-[38%]"
          />
        </div>
      )}
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
        return s.href ? (
          <Link
            key={s.image}
            href={s.href}
            aria-label={`Hero slide ${i + 1}`}
            aria-hidden={i !== active}
            tabIndex={i === active ? 0 : -1}
            className={cls}
          >
            {content}
          </Link>
        ) : (
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

      {/* 右下角:←/→ 深色箭头 */}
      <div className="absolute bottom-5 right-5 z-10 flex gap-2 md:bottom-6 md:right-8">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => go(active - 1)}
          className="flex h-11 w-11 items-center justify-center bg-ink/80 text-cream transition-colors hover:bg-ink"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => go(active + 1)}
          className="flex h-11 w-11 items-center justify-center bg-ink/80 text-cream transition-colors hover:bg-ink"
        >
          →
        </button>
      </div>
    </div>
  );
}
