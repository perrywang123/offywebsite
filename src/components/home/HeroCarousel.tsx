"use client";

import { useEffect } from "react";
import { useSwipeRail } from "@/hooks/useSwipeRail";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";
import styles from "./HeroCarousel.module.css";

export type HeroSlide = HeroSlideData;

/**
 * 老板 2026-10 诉求 1:头图隐藏「查看详情」胶囊与左右箭头。
 *
 * 口径是**开关控制不渲染**,而不是加 `hidden` / `sr-only` 类:
 *  1. 老板说的是"隐藏不是删除逻辑" —— 一个显式常量满足这点,恢复只需改回 true;
 *  2. **技术上必须不渲染**:CTA 关闭后要给屏 3-5 补整屏 `<a>` 补回点击区,
 *     而 `<a>` 内套 `<a>` 是非法 HTML —— SSR 输出的嵌套锚点会让浏览器解析器
 *     提前闭合外层 `<a>`,造成 hydration mismatch。两者只能取一(见 renderOverlay);
 *  3. CSS 隐藏会留下**看不见但可聚焦/可点**的幽灵控件(WCAG 2.4.7 反例),
 *     且在 jsdom 里 `hidden` 类不生效(Tailwind CSS 不加载),测试会假绿。
 */
const SHOW_HERO_DETAILS_CTA = false;
const SHOW_HERO_ARROWS = false;

/** A single grid row shares natural height across five horizontally adjacent screens. */
export function HeroCarousel({
  slides,
  locale,
  intervalMs = 5000,
}: {
  slides: HeroSlide[];
  locale: string;
  intervalMs?: number;
}) {
  const t = useTranslations("home");
  const rail = useSwipeRail(slides.length);
  const hasIndicators = slides.length > 1;
  const { active, goTo: go, reducedMotion, gestureActive, trackRef } = rail;
  useEffect(() => {
    if (reducedMotion || gestureActive || slides.length <= 1) return;
    const id = setInterval(() => {
      const target = (active + 1) % slides.length;
      // Wrap without sweeping across all intermediate screens.
      go(target, target !== 0);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, reducedMotion, gestureActive, slides.length, intervalMs, go]);

  // Every original destination remains a full-slide link. A normal-flow link
  // lets all five mounted panels contribute to the common grid height.
  const wrapScreenLink = (s: HeroSlide, node: React.ReactNode) =>
    s.href && !(s.title && SHOW_HERO_DETAILS_CTA) ? (
      <Link href={s.href} data-hero-link className={styles.slideLink}>
        {node}
      </Link>
    ) : (
      <div className={styles.slideLink}>{node}</div>
    );

  const picture = (s: HeroSlide, kind: string, priority = false) => (
    <div data-hero-photo className={`${styles.picture} ${kind}`}>
      <Image
        src={s.image}
        alt={s.imageAlt ?? ""}
        width={3250}
        height={2041}
        sizes="100vw"
        priority={priority}
      />
    </div>
  );

  // Same responsive image URLs as the photo, so the browser reuses its cache.
  // Only the original blank background is visible through this clipped layer.
  const backdrop = (s: HeroSlide) => (
    <div aria-hidden="true" className={styles.backdrop}>
      <Image src={s.image} alt="" width={3250} height={2041} sizes="100vw" />
    </div>
  );

  const renderDetailsCta = (s: HeroSlide) =>
    !SHOW_HERO_DETAILS_CTA || !s.href ? null : (
      <Link href={s.href} className={styles.details} onClick={(e) => e.stopPropagation()}>
        <span>{t("heroDetailsCta")}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.dark ? "/assets/hero/cta-arrow-white.png" : "/assets/hero/cta-arrow.png"}
          alt=""
        />
      </Link>
    );

  const renderSlide = (s: HeroSlide, index: number) => {
    if (s.wordmark) {
      const lines = (locale === "zh" ? s.text?.zh : s.text?.en)?.split("\n") ?? [];
      return wrapScreenLink(
        s,
        <>
          <div className={`${styles.copy} ${styles.brandCopy}`}>
            {backdrop(s)}
            <div data-hero-copy className={`${styles.copyContent} ${styles.brandContent}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/brand/is-offy-wordmark.png"
                alt="is.offy"
                className={styles.wordmark}
              />
              {lines.map((line, i) => (
                <p key={i} className={i === 0 ? styles.headline : styles.tagline}>
                  {line}
                </p>
              ))}
            </div>
          </div>
          {picture(s, styles.brandPhoto, index === 0)}
        </>,
      );
    }
    if (s.promo) {
      const lines = (locale === "zh" ? s.promo.text.zh : s.promo.text.en).split("\n");
      return wrapScreenLink(
        s,
        <>
          {picture(s, styles.promoPhoto, index < 2)}
          <div className={`${styles.copy} ${styles.promoCopy}`}>
            {backdrop(s)}
            <div data-hero-copy className={styles.copyContent}>
              {(locale === "zh" ? s.promo.kicker.zh : s.promo.kicker.en) && (
                <p className={styles.kicker}>
                  {locale === "zh" ? s.promo.kicker.zh : s.promo.kicker.en}
                </p>
              )}
              <p className={styles.promoTitle}>
                {lines.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </p>
            </div>
          </div>
        </>,
      );
    }
    if (s.title)
      return wrapScreenLink(
        s,
        <>
          {picture(s, styles.seriesPhoto, index === 0)}
          <div className={`${styles.copy} ${styles.seriesCopy} ${s.dark ? styles.dark : ""}`}>
            {backdrop(s)}
            <div data-hero-copy className={styles.copyContent}>
              {s.subtitle && (
                <p className={styles.subtitle}>{locale === "zh" ? s.subtitle.zh : s.subtitle.en}</p>
              )}
              <p className={styles.seriesTitle}>{locale === "zh" ? s.title.zh : s.title.en}</p>
              {renderDetailsCta(s)}
            </div>
          </div>
        </>,
      );
    return wrapScreenLink(s, picture(s, styles.fullPhoto, index === 0));
  };

  return (
    <div
      className={`relative w-full overflow-hidden ${styles.carousel}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("heroRegionLabel")}
      ref={rail.viewportRef}
      style={{ touchAction: "pan-y pinch-zoom" }}
      {...rail.handlers}
    >
      <div
        data-testid="hero-track"
        ref={trackRef}
        style={rail.trackStyle}
        className={`${styles.track} ${hasIndicators ? styles.trackWithIndicators : ""}`}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            data-hero-slide={i}
            aria-hidden={i !== active}
            inert={i !== active}
            className={styles.slide}
            style={{ backgroundColor: s.bg }}
          >
            {renderSlide(s, i)}
          </div>
        ))}
      </div>
      {hasIndicators && (
        <div
          className={`${styles.indicators} ${slides[active]?.wordmark || slides[active]?.dark ? styles.lightIndicators : ""}`}
          role="tablist"
          aria-label={t("heroSlidesLabel")}
        >
          {slides.map((_, i) => (
            <button
              type="button"
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={t("heroGoToSlide", { n: i + 1 })}
              onClick={(event) => {
                event.stopPropagation();
                go(i);
              }}
              className={styles.indicator}
              style={{ left: `${11.82 + i * 12.74}%` }}
            />
          ))}
          {SHOW_HERO_ARROWS && (
            <div className={styles.arrows}>
              {([-1, 1] as const).map((delta) => (
                <button
                  type="button"
                  key={delta}
                  aria-label={t(delta < 0 ? "heroPrevSlide" : "heroNextSlide")}
                  onClick={() => go(active + delta)}
                  className="flex min-h-11 min-w-11 items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={delta < 0 ? "/assets/hero/arrow-left.png" : "/assets/hero/arrow-right.png"}
                    alt=""
                    className="h-3 w-auto"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
