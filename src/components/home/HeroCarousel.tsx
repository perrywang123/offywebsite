"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";

export type HeroSlide = HeroSlideData;

const SWIPE_THRESHOLD = 40;

/**
 * 首页头图轮播(网站素材0926/1、网站头图/网站头图.psd,5 屏)——图片驱动布局:
 * 轮播容器宽 = 屏宽,高 = 宽 ÷ 1.592(3250×2041 头图区等比);图片 fill 铺满,
 * 文字/按钮/指示条/箭头全部按图片百分比定位(=PSD 头图区坐标),
 * 字号用 cqw(相对图片宽)+ clamp 上下限。
 *
 * 与旧版(3250×1815)的差异:头图加高;屏 2 促销屏改为「4 产品图(烤入背景)
 * + kicker + 两行超大促销语」;屏 3-5 改为「副标题在上 + 超大主标题在下 +
 * 右侧同带的无边框查看详情」;指示条改为底部左侧 5 条长条(PSD 仅画 4 条,
 * 经确认按 5 屏顺延);左右箭头上移到与主标题同带。
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
  const t = useTranslations("home");
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const go = (i: number) => setActive(((i % slides.length) + slides.length) % slides.length);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  /** 屏 2:促销屏 —— 背景图(4 张产品图已烤入)+ kicker + 两行超大促销语(实时文字)。 */
  const renderPromo = (s: HeroSlide) => (
    <>
      <Image
        src={s.image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* kicker「OFFY大促加赠」(PSD x12.2% y51.1%,80px=2.46cqw,Regular) */}
      <p className="absolute left-[12.2%] top-[51.1%] text-[clamp(11px,2.46cqw,36px)] font-normal uppercase leading-snug tracking-[var(--tracking-10)] text-ink">
        {locale === "zh" ? s.promo!.kicker.zh : s.promo!.kicker.en}
      </p>
      {/* 两行超大促销语(PSD x11.8% y58.6%,224px=6.9cqw,Semibold,行高≈1.05) */}
      <p className="absolute left-[11.8%] top-[58.6%] whitespace-pre-line text-[clamp(18px,6.9cqw,99px)] font-semibold uppercase leading-[1.05] tracking-tight text-ink">
        {locale === "zh" ? s.promo!.text.zh : s.promo!.text.en}
      </p>
    </>
  );

  /** 屏 3-5 系列屏:副标题在上 + 超大主标题在下 + 右侧同带的无边框查看详情。 */
  const renderSeriesOverlay = (s: HeroSlide) => {
    const arrowSrc = s.dark ? "/assets/hero/cta-arrow-white.png" : "/assets/hero/cta-arrow.png";
    const title = locale === "zh" ? s.title!.zh : s.title!.en;
    const subtitle = s.subtitle ? (locale === "zh" ? s.subtitle.zh : s.subtitle.en) : null;
    return (
      <>
        {/* 副标题(PSD x12.2% y64.2%,80px=2.46cqw,Regular) */}
        {subtitle && (
          <p
            className={`absolute left-[12.2%] top-[64.2%] text-[clamp(11px,2.46cqw,36px)] font-normal leading-snug tracking-[var(--tracking-10)] ${
              s.dark ? "text-cream/85" : "text-ink-soft"
            }`}
          >
            {subtitle}
          </p>
        )}
        {/* 主标题(PSD x11.9% y71.9%,224px=6.9cqw,Semibold);
            英文词组约为中文 2.4 倍长,同字号会折行溢出,英文档收窄到 4.6cqw
            保持单行且视觉比重接近(PSD 仅有中文稿)。 */}
        <p
          className={`absolute left-[11.9%] top-[71.9%] w-[62%] font-semibold uppercase leading-[1.05] tracking-tight ${
            locale === "zh" ? "text-[clamp(18px,6.9cqw,99px)]" : "text-[clamp(16px,4.6cqw,66px)]"
          } ${s.dark ? "text-cream" : "text-ink"}`}
        >
          {title}
        </p>
        {/* 查看详情(PSD x73.8% y62.8% w11.6% h4.95%,与副标题同带;
            PSD 矩形7:胶囊形(角半径≈47%高=rounded-full)+ 3px 描边无填充
            (浅底黑边黑字/深底 #f3f0f1 白边白字),47px=1.45cqw 文字 + 箭头图标;
            hover 反色填充,箭头同步反色。 */}
        <Link
          href={s.href!}
          className={`group absolute left-[73.8%] top-[62.8%] flex h-[4.95%] min-h-[28px] w-[11.6%] min-w-[84px] items-center justify-center gap-1.5 rounded-full border-[1.5px] text-[clamp(10px,1.45cqw,21px)] font-normal transition-colors ${
            s.dark
              ? "border-cream text-cream hover:bg-cream hover:text-ink"
              : "border-ink text-ink hover:bg-ink hover:text-cream"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="whitespace-nowrap">{t("heroDetailsCta")}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={arrowSrc} alt="" className="h-[0.85em] w-auto transition-colors group-hover:invert" />
        </Link>
      </>
    );
  };

  const renderOverlay = (s: HeroSlide) => (
    <>
      {/* 屏 1:is.offy 字标(PSD 居中,顶 8.0%,宽 18.3%)+ slogan(顶 25.5%);
          字号 4.3cqw(PSD 140px),Semibold,zh 字距 0.18em(PSD 0.2em 就近);
          en 文案允许用 "\n" 显式分两行(whitespace-pre-line)。 */}
      {s.wordmark && (
        <>
          <div className="absolute inset-x-0 top-[8%] flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/is-offy-wordmark.png"
              alt="is.offy"
              className="w-[18.3%] min-w-[80px] max-w-[264px]"
            />
          </div>
          <div className="absolute inset-x-0 top-[25.5%] flex justify-center px-[4%]">
            <p className="max-w-full whitespace-pre-line break-words text-center text-[clamp(15px,4.3cqw,62px)] font-semibold leading-[1.45] tracking-[var(--tracking-18)] text-ink">
              {locale === "zh" ? s.text!.zh : s.text!.en}
            </p>
          </div>
        </>
      )}
      {s.title && renderSeriesOverlay(s)}
    </>
  );

  return (
    // 外层定尺寸(aspect-ratio = 3250/2041);内层做 cqw 容器 —
    // container-type 与 aspect-ratio 同元素有 Chrome 高度计算异常,必须分层。
    <div
      className="relative w-full"
      style={{ aspectRatio: "3250 / 2041" }}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("heroRegionLabel")}
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
      <div
        className="absolute inset-0"
        style={{ containerType: "inline-size" }}
      >
      {slides.map((s, i) => {
        const cls = `absolute inset-0 transition-opacity duration-1000 ease-editorial ${
          i === active ? "opacity-100" : "pointer-events-none opacity-0"
        }`;
        return (
          <div
            key={s.image}
            aria-hidden={i !== active}
            className={cls}
            style={{ backgroundColor: s.bg }}
          >
            {s.promo ? (
              renderPromo(s)
            ) : (
              <>
                <Image
                  src={s.image}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover object-center"
                />
                {renderOverlay(s)}
              </>
            )}
          </div>
        );
      })}

      {/* 控件层:覆盖整个图片(共享一组控件,按图片比例定位,不随屏切换) */}
      <div className="pointer-events-none absolute inset-0 z-10">
          {/* 长条指示器(PSD 组 8:每条 367×24px=#f7f2f0,y89.8%,x 自 11.8% 起
              间隔 47px;active 100% / inactive 28% 透明。PSD 仅画 4 条,
              经确认按 5 屏同样式顺延至 5 条) */}
          <div className="absolute left-0 top-[89.8%] h-[1.18%] w-full" role="tablist" aria-label={t("heroSlidesLabel")}>
            {slides.map((sl, di) => (
              <button
                key={sl.image}
                role="tab"
                aria-selected={di === active}
                aria-label={t("heroGoToSlide", { n: di + 1 })}
                onClick={() => go(di)}
                className={`pointer-events-auto absolute top-0 h-full w-[11.3%] bg-[#f7f2f0] transition-opacity duration-500 ${
                  di === active ? "opacity-100" : "opacity-[0.28] hover:opacity-[0.5]"
                }`}
                style={{ left: `${11.82 + di * 12.74}%` }}
              />
            ))}
          </div>
          {/* 右下 ←/→ 箭头按钮(PSD y76.3-82.3%,与主标题同带;x89.8-97.2%;
              120×122px≈3.7cqw 方形,黑 50% 透明底 + 白色箭头图标;
              效果图实测两按钮间有约 8-12px 间距(gap-1)且角部微圆) */}
          <div className="absolute right-[2.8%] top-[76.3%] flex gap-1">
            <button
              type="button"
              aria-label={t("heroPrevSlide")}
              onClick={() => go(active - 1)}
              className="pointer-events-auto flex h-[clamp(30px,3.7cqw,48px)] w-[clamp(30px,3.7cqw,48px)] items-center justify-center rounded-[4px] bg-ink/50 transition-colors hover:bg-ink/70"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/hero/arrow-left.png" alt="" className="h-[clamp(8px,1.2cqw,15px)] w-auto" />
            </button>
            <button
              type="button"
              aria-label={t("heroNextSlide")}
              onClick={() => go(active + 1)}
              className="pointer-events-auto flex h-[clamp(30px,3.7cqw,48px)] w-[clamp(30px,3.7cqw,48px)] items-center justify-center rounded-[4px] bg-ink/50 transition-colors hover:bg-ink/70"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/hero/arrow-right.png" alt="" className="h-[clamp(8px,1.2cqw,15px)] w-auto" />
            </button>
          </div>
      </div>
      </div>
    </div>
  );
}
