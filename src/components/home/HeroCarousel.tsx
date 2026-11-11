"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";
import styles from "./HeroCarousel.module.css";

export type HeroSlide = HeroSlideData;

const SWIPE_THRESHOLD = 40;
/**
 * 「吞掉 click」的独立门槛,比切屏门槛**更低**。
 *
 * 切屏要 40px 才判定(避免手抖误翻页),但**只要画面跟着手动过**,用户心理上
 * 就已经在"拖"而不是"点"了 —— 松手后如果仍触发整屏 <a> 的跳转,就是
 * "拖一半被弹回去、然后莫名其妙跳走"。
 *
 * 24px 这个值取在两者之间:高于真实点击时手指的漂移量(实测通常 <10px),
 * 低于切屏门槛(所以 24–39px 的拖拽 = 画面跟手 + 弹回 + **不跳转**、也不切屏)。
 */
const CLICK_SWALLOW_THRESHOLD = 24;
/** 松手速度阈值(px/ms):位移不到 40px 的**快速轻扫**也翻页(只用位移判会让用户觉得"我明明划了却没反应")。 */
const SWIPE_VELOCITY = 0.5;
/** 走速度判定要求的最小位移(px):防手抖,也防"两个事件挤在同一帧"被算成极速。 */
const FLICK_MIN_DISTANCE = 10;
/** 速度采样窗口(ms):只取松手前这一小段。整段平均会把"先停一下再甩"误判成慢速。 */
const VELOCITY_WINDOW_MS = 120;
/** 速度采样条数上限(防止长按期间采样数组无限增长)。 */
const VELOCITY_MAX_SAMPLES = 6;
/** 采样时间跨度下限(ms):低于它的速度不可信,一律当 0(不是"无限快")。 */
const VELOCITY_MIN_SPAN_MS = 8;
/** 头屏再往后拉 / 尾屏再往前拉时的位移衰减系数 —— 给出"到头了"的手感,而不是硬邦邦不动。 */
const EDGE_DAMPING = 0.35;
/** 松手后的弹性吸附时长与缓动(带 easing 滑回去 = 不闪的关键)。 */
const SETTLE_MS = 280;
const SETTLE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

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

/** Five intrinsic grid panels share one height; gesture and autoplay behavior is unchanged. */
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

  /**
   * 系统是否要求 Reduce Motion。初始值恒为 false、挂载后由 effect 纠正 ——
   * 不用 `useState(() => matchMedia(...))`:SSR 读不到 matchMedia,惰性初始值会让
   * 服务端与客户端首帧不一致(hydration 报错)。
   */
  const [reducedMotion, setReducedMotion] = useState(false);
  /** 手势进行中(按下未松手)→ 自动轮播暂停;进 effect 依赖,松手时重新计时。 */
  const [gestureActive, setGestureActive] = useState(false);
  /** 是否自动轮播:只由系统 Reduce Motion 决定(没有手动开关)。 */
  const playing = !reducedMotion;

  const go = (i: number) => setActive(((i % slides.length) + slides.length) % slides.length);

  /** 系统开了 Reduce Motion:不自动播放(WCAG 2.2.2 的默认值,且没有开关可以覆盖)。 */
  useEffect(() => {
    const mq =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    if (!mq) return;
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    // Safari 14 以下只有 addListener;可选调用,拿不到就算了(默认值仍然可用)
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    // 拖拽期间自动轮播暂停(按下即停):否则拖到一半会被 5 秒计时器把屏抢走。
    // `gestureActive` 进依赖数组 → 松手时 effect 重跑,计时**重新开始**(不是接着走)。
    if (!playing || gestureActive || slides.length <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [playing, gestureActive, slides.length, intervalMs]);

  /**
   * 手势状态(鼠标 / 触控笔 / 手指共用一套判定:跟手位移 + 阻尼 + 双阈值)。
   *
   * 输入分派:
   *  · 触屏 → **touch 事件**(`pointerType === "touch"` 的 pointer 事件直接跳过)。
   *    一次手指横滑会同时派发 pointerdown/up 与 touchstart/end,两条通路各切一屏
   *    = 一次手势跳过两屏;触摸保留原路径的另一个理由是真机上浏览器接管滚动时
   *    会发 `pointercancel`(touch 事件不受影响),刚验证过的手机手势不该因此变脆。
   *  · 鼠标 / 触控笔 → pointer 事件(箭头隐藏后桌面唯一的手势入口)。
   *
   * **两条通路共用同一份位移状态**(`drag.current` + `trackRef` 上的 transform):
   * 跟手动画不是鼠标专享,手指拖同样跟手 —— 分派只决定"谁来喂事件"。
   *
   * `dragging`:位移**曾经**过阈值。它一旦为真,这次手势就按拖拽处理 —— 吞掉浏览器
   * 补发的 click,即使手指最后又拖回原点(否则整屏 `<a>` 会把拖拽当成点击跳走)。
   */
  const drag = useRef<{
    startX: number;
    lastX: number;
    dragging: boolean;
    /** 松手算速度用的采样点(只保留最近几条)。 */
    samples: Array<{ t: number; x: number }>;
  } | null>(null);
  const swallowClick = useRef(false);

  /**
   * 跟手位移的载体:包住 5 屏的轨道层。位移只写在这一个元素上(`transform`),
   * 控件层(指示条)留在外面 —— 它们是按图片比例定位的共享控件,
   * 跟着滑出去既会错位、也会被新加的 `overflow-hidden` 切掉。
   */
  const trackRef = useRef<HTMLDivElement | null>(null);

  /**
   * 单调时钟。速度采样统一读 `performance.now()`,不读 `event.timeStamp`:
   * jsdom 给的 timeStamp 是 **epoch 毫秒**(不是规范里的 DOMHighResTimeStamp),
   * 同一 tick 内派发的事件完全同值(dt=0,会算出"无限快"),测试没法构造轻扫;
   * 真实浏览器里两者同源,精度也都够用(采样窗口是 120ms 量级)。
   */
  const timeNow = () =>
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();

  /**
   * 松手速度(px/ms):**只取窗口内最后几个采样点**,不做整段平均 ——
   * "先慢后快"的手势按整段平均会算成慢速,轻扫就丢了。
   * 采样跨度低于 `VELOCITY_MIN_SPAN_MS` 时返回 0(宁可判成没扫,也不判成无限快)。
   */
  const releaseVelocity = (
    samples: Array<{ t: number; x: number }>,
    endT: number,
    endX: number,
  ) => {
    let from = samples[samples.length - 1] ?? { t: endT, x: endX };
    for (let i = samples.length - 1; i >= 0 && samples.length - i <= VELOCITY_MAX_SAMPLES; i--) {
      if (endT - samples[i].t > VELOCITY_WINDOW_MS) break;
      from = samples[i];
    }
    const dt = endT - from.t;
    if (dt < VELOCITY_MIN_SPAN_MS) return 0;
    return (endX - from.x) / dt;
  };

  /**
   * 手势位移 → 视觉位移。头屏再往后拉、尾屏再往前拉时衰减到 35%:
   * 那两下**没有对应屏**,全量跟手会像"能翻过去",衰减才是"到头了"的手感。
   */
  const visualOffset = (dx: number) => {
    const beforeFirst = active === 0 && dx > 0;
    const afterLast = active === slides.length - 1 && dx < 0;
    return beforeFirst || afterLast ? dx * EDGE_DAMPING : dx;
  };

  /**
   * 跟手:直接写内联 transform,**不**每帧 setState —— 60fps 的 state 更新会把
   * 5 屏图片(含 next/image)一起重渲染,反而卡。React 不管这个 style(JSX 里没声明),
   * 所以后续重渲染也不会把它擦掉。
   *
   * 位移取整到 0.01px:CSS 用不上更细的精度,顺便让"跟手位移 == 手指位移"可断言。
   */
  const paintTrack = (x: number) => {
    const el = trackRef.current;
    if (!el || reducedMotion) return;
    el.style.transform = `translateX(${Math.round(x * 100) / 100}px)`;
  };

  /**
   * 弹性吸附:松手后带 easing 滑回 0(切屏的 opacity 交叉淡出同时进行)。
   * 这一步是"不闪"的关键 —— 改之前是直接 `go()` 换索引,5 屏又是绝对定位叠着做
   * 淡出,所以图片看着是"瞬间替换"。
   *
   * `translateX(0)` 是恒等变换,留着不回滚也无害;下一次按下时会被 `transition: none`
   * 覆盖掉,不会给跟手带上延迟。
   */
  const settleTrack = () => {
    const el = trackRef.current;
    if (!el || reducedMotion) return;
    el.style.transition = `transform ${SETTLE_MS}ms ${SETTLE_EASING}`;
    el.style.transform = "translateX(0px)";
  };

  const beginDrag = (x: number | null) => {
    // 新手势开始 = 上一次的标记作废:合成 click 只会紧跟在手势之后,
    // 浏览器不发时不能把标记泄漏给下一次真实点击。
    swallowClick.current = false;
    if (x == null) {
      drag.current = null;
      return;
    }
    drag.current = { startX: x, lastX: x, dragging: false, samples: [{ t: timeNow(), x }] };
    setGestureActive(true); // 按下即自动轮播暂停
    // 跟手期间必须关掉过渡:否则每一帧位移都会带 280ms 缓动去追手指,手感发飘
    const el = trackRef.current;
    if (el && !reducedMotion) el.style.transition = "none";
  };

  /** 两条通路共用的位移处理:记录采样 → 写跟手位移。 */
  const moveDrag = (x: number | null) => {
    const gesture = drag.current;
    if (!gesture || x == null) return;
    gesture.lastX = x;
    gesture.samples.push({ t: timeNow(), x });
    if (gesture.samples.length > VELOCITY_MAX_SAMPLES + 1) gesture.samples.shift();
    if (Math.abs(x - gesture.startX) >= SWIPE_THRESHOLD) gesture.dragging = true;
    paintTrack(visualOffset(x - gesture.startX));
  };

  const endDrag = (endX: number | null) => {
    const gesture = drag.current;
    drag.current = null;
    setGestureActive(false); // 松手 → 自动轮播重新计时
    if (!gesture) return;
    const end = endX ?? gesture.lastX;
    const dx = end - gesture.startX;
    const velocity = releaseVelocity(gesture.samples, timeNow(), end);
    // 双阈值:位移 ≥40px **或** 速度 ≥0.5px/ms(快速轻扫,位移可以很小)
    const flicked = Math.abs(velocity) >= SWIPE_VELOCITY && Math.abs(dx) >= FLICK_MIN_DISTANCE;
    const swiped = Math.abs(dx) >= SWIPE_THRESHOLD || flicked;
    if (swiped) {
      // 方向以"起决定作用的那个信号"为准:位移够就看位移,否则看速度
      const dir = Math.abs(dx) >= SWIPE_THRESHOLD ? dx : velocity || dx;
      go(active + (dir < 0 ? 1 : -1));
    }
    // 动过就要吸附回位(拖出去再拖回原点时 dx≈0,但画面确实被拖离过原位)
    if (gesture.dragging || dx !== 0) settleTrack();
    // 注意这里用的是比 SWIPE_THRESHOLD 更低的 CLICK_SWALLOW_THRESHOLD:
    // 拖了 24–39px 时不会切屏,但画面确实跟手动过 —— 此时松手必须吞掉 click,
    // 否则会跳转到该屏的落地页(用户看到的是"拖一半被弹回,然后跳走了")。
    if (swiped || Math.abs(dx) >= CLICK_SWALLOW_THRESHOLD) swallowClick.current = true;
  };

  /**
   * 位移过阈值(已经确定是拖拽)之后才捕获指针 —— 这样在头图外松手也能收到 pointerup。
   *
   * 为什么不能更早捕获:**实测**(headless Chrome + CDP 派发真实鼠标事件)在
   * `pointerdown` 就 `setPointerCapture`,连"原地点击"都会把 mouseup 重定向到捕获
   * 元素,click 的 target 随之变成捕获元素 —— 子级那个整屏 `<a>` 再也收不到 click,
   * 桌面端 5 屏整屏可点会集体失效(8px 就捕获同样复现)。40px 之后捕获则不影响点击:
   * 那种位移本来就该判成拖拽、click 本来就要吞掉。
   * jsdom 没实现 setPointerCapture,可选调用直接跳过(单测仍走完整的判定逻辑)。
   */
  const capturePointer = (el: Element, pointerId: number) => {
    try {
      el.setPointerCapture?.(pointerId);
    } catch {
      /* 指针已失效(极端情况):靠 pointercancel 兜底 */
    }
  };

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
      <Image src={s.image} alt="" width={3250} height={2041} sizes="100vw" priority={priority} />
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
              <p className={styles.kicker}>
                {locale === "zh" ? s.promo.kicker.zh : s.promo.kicker.en}
              </p>
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
      // ---- 手势层(详见上面 drag / beginDrag / moveDrag / endDrag 的注释)----
      onPointerDown={(e) => {
        if (e.pointerType === "touch") return; // 触摸走 touch 分支,避免一次手势切两屏
        beginDrag(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === "touch" || !drag.current) return;
        // 捕获只在**刚过阈值那一帧**做一次(与位移状态分开:跟手从第一帧就开始)
        const crossedThreshold =
          !drag.current.dragging && Math.abs(e.clientX - drag.current.startX) >= SWIPE_THRESHOLD;
        moveDrag(e.clientX);
        // 过阈值后再捕获:更早捕获会把普通点击的 mouseup 重定向到容器,
        // 整屏 `<a>` 就收不到 click 了(见 capturePointer 的实测注释)。
        if (crossedThreshold) capturePointer(e.currentTarget, e.pointerId);
      }}
      onPointerUp={(e) => {
        if (e.pointerType === "touch") return;
        endDrag(e.clientX);
      }}
      // 浏览器取消指针(窗口失焦、系统手势)时用最后记录的位置结算,别把手势悬在半空
      onPointerCancel={(e) => {
        if (e.pointerType === "touch") return;
        endDrag(null);
      }}
      onTouchStart={(e) => beginDrag(e.touches[0]?.clientX ?? null)}
      onTouchMove={(e) => moveDrag(e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => endDrag(e.changedTouches[0]?.clientX ?? null)}
      onTouchCancel={() => endDrag(null)}
      // 头图里是一整张 `<img>` + 整屏 `<a>`:不掐掉原生拖拽,鼠标一拖就会走
      // HTML5 drag-and-drop(实测接着发 pointercancel → 手势断在半路);掐掉之后
      // 浏览器照常补发 click,由下面的守卫吞掉。
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        // detail === 0 = 键盘 Enter/Space 或脚本触发的 click(实测:键盘激活
        // `detail=0`,真实指针手势补发的 click `detail=1`)。它不可能来自手势,
        // 不能被上一次滑动的标记连坐 —— 混合输入(先横滑、再用键盘选屏)时
        // 否则会静默吞掉一次键盘操作。
        if (!swallowClick.current || e.detail === 0) return;
        // 本次手势判定为滑动 → 吞掉紧随的 click(捕获阶段:先于 next/link 的
        // 客户端跳转,preventDefault 同时掐掉浏览器默认导航)。
        // 实测(Chrome):鼠标拖 400px 后**确实**会补发一次 click(detail=1),
        // 不吞就会跳到该屏的落地页;手指横滑 Chrome 不发 click,是给
        // 会补发的浏览器(以及鼠标)留的守卫。
        swallowClick.current = false; // 一次手势只吞一次
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div data-testid="hero-track" ref={trackRef} className={styles.track}>
        {slides.map((s, i) => (
          <div
            key={s.image}
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
      <div
        className={`${styles.indicators} ${slides[active]?.wordmark || slides[active]?.dark ? styles.lightIndicators : ""}`}
        role="tablist"
        aria-label={t("heroSlidesLabel")}
      >
        {slides.map((s, i) => (
          <button
            type="button"
            key={s.image}
            role="tab"
            aria-selected={i === active}
            aria-label={t("heroGoToSlide", { n: i + 1 })}
            onClick={() => go(i)}
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
    </div>
  );
}
