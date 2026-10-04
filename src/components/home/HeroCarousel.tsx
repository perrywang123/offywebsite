"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";

export type HeroSlide = HeroSlideData;

const SWIPE_THRESHOLD = 40;

/**
 * 首页头图轮播(主 PSD UI 树,5 屏)——图片驱动布局:
 * 轮播容器宽 = 屏宽(左右边距 0),高 = 宽 ÷ 1.789(等比) —— 头图区域的高度
 * 就是图片高度,没有任何色块补边;图片 fill 铺满容器(同比例零裁切),
 * 文字/按钮/指示条/箭头全部按图片百分比定位(=PSD 头图区坐标),
 * 字号用 cqw(相对图片宽)+ clamp 上下限 —— 任何屏幕下,头图上的字和按钮
 * 都严格贴在 PSD 设计位置并跟随头图等比缩放。
 *
 * 标题/副标题/促销语均为实时文字(随 locale 切换),不再是设计稿导出的
 * PNG——PNG 无法跟随语言切换,见 2026 首页文案落地改造。
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

  /** 屏 2:PSD「头图-活动奖励」合成屏(元素按舞台百分比=PSD 头图区坐标)。 */
  const renderPromo = (s: HeroSlide) => (
    <div className="absolute inset-0 bg-white">
      {/* 玩偶(PSD 本体区 x11% y10% w46% h50%) */}
      <div className="absolute left-[11%] top-[10%] h-[50%] w-[46%]">
        <Image
          src={s.promo!.doll}
          alt=""
          fill
          priority
          sizes="46vw"
          className="object-contain object-center"
        />
      </div>
      {/* 包包 2×2(PSD x61.7%-99.9%,两列有重叠,总宽 38.2%) */}
      <div className="absolute left-[61.7%] top-[18.2%] grid w-[38.2%] grid-cols-2">
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
      {/* 促销文案(实时文字,PSD x11.5% w49.9% 区域;y 由 62.4% 下移到 69%——
          反馈:原位置太靠上;字号由 2.3cqw 加大到 3.2cqw 并改为 extrabold) */}
      <div className="absolute left-[11.5%] top-[69%] w-[49.9%] max-w-[680px]">
        <p className="text-[clamp(14px,3.2cqw,44px)] font-extrabold uppercase leading-tight tracking-[var(--tracking-10)] text-ink">
          {locale === "zh" ? s.promo!.text.zh : s.promo!.text.en}
        </p>
      </div>
    </div>
  );

  /** 屏 3-5 系列屏:左下标题组(标题+副标题+查看详情按钮),全部按舞台 % 定位。 */
  const renderSeriesOverlay = (s: HeroSlide) => {
    const arrowSrc = s.dark ? "/assets/hero/cta-arrow-white.png" : "/assets/hero/cta-arrow.png";
    const title = locale === "zh" ? s.title!.zh : s.title!.en;
    const subtitle = s.subtitle ? (locale === "zh" ? s.subtitle.zh : s.subtitle.en) : null;
    return (
      <>
        {/* 标题 + 副标题(实时文字区,放宽宽度容纳较长的英文词组,避免生硬截断/换行;
            反馈:文字块应与右下「查看详情」按钮(top 73.1% + h 6.1% → 中心 76.2%)
            在同一中轴线上——用 top 76.1% + -translate-y-1/2 做精确垂直居中,
            任意文案长度/换行都始终对齐;max-w 700px 保证最长的英文标题
            (OFFY Streetwear Series)在桌面端单行不折行,移动端经实测文字右缘
            ≤56% 不会碰到按钮(左缘 58%)。 */}
        <div className="absolute left-[11.5%] top-[76.1%] w-[58%] min-w-[170px] max-w-[700px] -translate-y-1/2">
          <p
            className={`text-[clamp(13px,3.2cqw,50px)] font-extrabold uppercase leading-[1.1] tracking-tight ${
              s.dark ? "text-cream" : "text-ink"
            }`}
          >
            {title}
          </p>
          {subtitle && (
            <p
              className={`mt-[1.2%] text-[clamp(10px,1.6cqw,20px)] font-medium leading-snug tracking-[var(--tracking-10)] ${
                s.dark ? "text-cream/85" : "text-ink-soft"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {/* 查看详情按钮(PSD x58% y73.1% w13% h6.1%):描边样式 + 箭头图标;
            字号 1.5cqw 跟随头图宽,clamp 约束上下限 */}
        <Link
          href={s.href!}
          className={`group absolute left-[58%] top-[73.1%] flex h-[6.1%] min-h-[28px] w-[15%] min-w-[84px] max-w-[200px] items-center justify-center gap-1.5 rounded-full border-[1.5px] text-[clamp(9px,1.5cqw,14px)] font-medium transition-colors ${
            s.dark
              ? "border-cream/70 text-cream hover:bg-cream hover:text-ink"
              : "border-ink/70 text-ink hover:bg-ink hover:text-cream"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="whitespace-nowrap">{t("heroDetailsCta")}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={arrowSrc} alt="" className="h-[0.9em] w-auto transition-colors group-hover:invert" />
        </Link>
      </>
    );
  };

  const renderOverlay = (s: HeroSlide) => (
    <>
      {/* 屏 1:is.offy 字标(PSD 居中,顶 9.7%,宽 18.3%)+ slogan;
          字号跟随头图宽,clamp 约束,过长自然换行不溢出;
          en 文案允许用 "\n" 显式分两行(whitespace-pre-line)。
          slogan 顶距由 29.5% 上收到 24%——反馈:文字与画面中间的 offy 玩偶
          有重叠,需更靠近顶部字标(字标本体约到 22% 高度)。 */}
      {s.wordmark && (
        <>
          <div className="absolute inset-x-0 top-[9.7%] flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/is-offy-wordmark.png"
              alt="is.offy"
              className="w-[18.3%] min-w-[80px] max-w-[264px]"
            />
          </div>
          <div className="absolute inset-x-0 top-[25%] flex justify-center px-[4%]">
            <p className="max-w-full whitespace-pre-line break-words text-center text-[clamp(14px,3.6cqw,46px)] font-bold leading-[1.45] tracking-[var(--tracking-10)] text-ink">
              {locale === "zh" ? s.text!.zh : s.text!.en}
            </p>
          </div>
        </>
      )}
      {s.title && renderSeriesOverlay(s)}
    </>
  );

  return (
    // 外层定尺寸(aspect-ratio = 屏宽/1.789);内层做 cqw 容器 —
    // container-type 与 aspect-ratio 同元素有 Chrome 高度计算异常,必须分层。
    <div
      className="relative w-full"
      style={{ aspectRatio: "3250 / 1815" }}
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
          {/* 横线指示条(PSD y88.3% 居中) */}
          <div className="absolute bottom-[11.7%] left-1/2 flex -translate-x-1/2 gap-2" role="tablist" aria-label={t("heroSlidesLabel")}>
            {slides.map((sl, di) => (
              <button
                key={sl.image}
                role="tab"
                aria-selected={di === active}
                aria-label={t("heroGoToSlide", { n: di + 1 })}
                onClick={() => go(di)}
                className={`pointer-events-auto h-[3px] rounded-full transition-all duration-500 ${
                  di === active ? "w-10 bg-ink/70" : "w-5 bg-ink/30 hover:bg-ink/50"
                }`}
              />
            ))}
          </div>
          {/* 右下 ←/→ 深色箭头按钮(PSD 右下角,尺寸跟随头图) */}
          <div className="absolute bottom-[5%] right-[2.8%] flex gap-2">
            <button
              type="button"
              aria-label={t("heroPrevSlide")}
              onClick={() => go(active - 1)}
              className="pointer-events-auto flex h-[clamp(30px,3.4cqw,44px)] w-[clamp(30px,3.4cqw,44px)] items-center justify-center bg-ink/80 transition-colors hover:bg-ink"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/hero/arrow-left.png" alt="" className="h-3 w-auto" />
            </button>
            <button
              type="button"
              aria-label={t("heroNextSlide")}
              onClick={() => go(active + 1)}
              className="pointer-events-auto flex h-[clamp(30px,3.4cqw,44px)] w-[clamp(30px,3.4cqw,44px)] items-center justify-center bg-ink/80 transition-colors hover:bg-ink"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/hero/arrow-right.png" alt="" className="h-3 w-auto" />
            </button>
          </div>
      </div>
      </div>
    </div>
  );
}
