"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";

export type HeroSlide = HeroSlideData;

const SWIPE_THRESHOLD = 40;

/**
 * 首页头图轮播(设计稿版式):整图 object-contain 居中(不截断,补图边缘底色)。
 * 屏 1:is.offy 手写体字标(顶部居中)+ 两行 slogan「让想象发生/让陪伴发生」;
 * 屏 2:PSD「头图-活动奖励」合成屏(白底 + 左玩偶 + 右 2×2 包包图 + 左下文案 PNG);
 * 屏 3-5:系列整图 + 顶部居中「OFFY+系列名」标题 PNG,整图可点跳对应系列页;
 * 底部居中横线指示条 + 右下角 ←/→ 深色箭头;自动播放 + 交叉淡入 + 触摸滑动。
 * 所有文字层 top ≥ 128px,避开 sticky header(112px)遮挡。
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

  /** 屏 2:PSD「头图-活动奖励」合成屏(白底 + 左玩偶 + 右 2×2 包包图 + 文案 PNG)。 */
  const renderPromo = (s: HeroSlide) => (
    <div className="absolute inset-0 bg-white">
      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-center gap-8 px-6 md:gap-16 lg:px-8">
        {/* 左:玩偶图(PSD offy_middle_character) */}
        <div className="relative h-[70%] w-[46%] max-w-2xl">
          <Image
            src={s.promo!.doll}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 46vw, 40vw"
            className="object-contain object-center"
          />
        </div>
        {/* 右:2×2 包包图(PSD offy包电商图1-4) */}
        <div className="grid w-[34%] max-w-md grid-cols-2 gap-3 md:gap-5">
          {s.promo!.bags.map((bag) => (
            <div key={bag} className="relative aspect-square">
              <Image
                src={bag}
                alt=""
                fill
                sizes="(max-width: 768px) 17vw, 12vw"
                className="object-contain object-center"
              />
            </div>
          ))}
        </div>
      </div>
      {/* 左下:促销文案 PNG(PSD 文字层导出,精确字体) */}
      <div className="absolute bottom-[10%] left-6 md:left-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.promo!.text}
          alt={locale === "zh" ? "即日起，任意购买三个公仔以上，送offy包包" : "Buy any 3 plush dolls, get an Offy bag free"}
          className="w-[46vw] max-w-xl md:w-[30vw]"
        />
      </div>
    </div>
  );

  const renderOverlay = (s: HeroSlide) => (
    <>
      {/* 屏 1:is.offy 手写体字标(顶部居中,PSD LOGO 图层)+ 两行 slogan */}
      {s.wordmark && (
        <div className="absolute inset-x-0 top-[15%] flex flex-col items-center gap-4 md:top-[16%] md:gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/brand/is-offy-wordmark.png"
            alt="is.offy"
            className="w-[34%] max-w-md md:w-[22%]"
          />
          <p className="whitespace-pre-line text-center text-lg font-bold leading-relaxed tracking-[0.2em] text-ink md:text-2xl">
            {locale === "zh" ? s.text!.zh : s.text!.en}
          </p>
        </div>
      )}
      {/* 屏 3-5:「OFFY + 系列名」标题 PNG(PSD 文字层导出,顶部居中) */}
      {s.titleImage && (
        <div className="absolute inset-x-0 top-[15%] flex justify-center px-6 md:top-[16%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.titleImage}
            alt={locale === "zh" ? "OFFY 系列头图" : "OFFY series hero"}
            className="w-[42%] max-w-lg md:w-[28%]"
          />
        </div>
      )}
    </>
  );

  return (
    <div
      className="absolute inset-0"
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
