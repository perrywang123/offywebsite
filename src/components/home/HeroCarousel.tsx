"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";

export type HeroSlide = HeroSlideData;

const SWIPE_THRESHOLD = 40;
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
 * 暂停/播放控件的可访问名(zh / en)。
 *
 * 为什么不进 `messages/*.json`:本轮改动的文件范围被限定在
 * 本组件 + 它的单测(`home` 命名空间里也没有 pause/play 这类 key),
 * 所以按 `CategoryTabs.tsx` 的既有写法在组件内做双语映射。
 * 若日后允许改字典,应换成 `home.heroPauseAutoplay` / `home.heroPlayAutoplay`。
 */
const AUTOPLAY_LABELS = {
  zh: { pause: "暂停自动轮播", play: "播放自动轮播" },
  en: { pause: "Pause autoplay", play: "Play autoplay" },
} as const;

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

/**
 * 长条指示器的命中区(`::after` 只向上扩,视觉尺寸不动 —— 条本身只有 ~2.8px 高)。
 * 箭头显示时不能向下扩(会抢 84.8% 处箭头的命中区);箭头隐藏后这个约束消失,
 * 于是多扩 0.15rem,375px 下有效命中高度 ≈45.2px,稳过 44px 门槛。
 */
const INDICATOR_HIT_AREA_CLS = SHOW_HERO_ARROWS
  ? "after:h-[calc(100%+2.5rem)]"
  : "after:h-[calc(100%+2.65rem)]";

/**
 * 首页头图轮播(网站素材0926/1、网站头图/网站头图.psd,5 屏)——图片驱动布局:
 * 轮播容器宽 = 屏宽,高 = 宽 ÷ 1.592(3250×2041 头图区等比);图片 fill 铺满,
 * 文字/按钮/指示条/箭头全部按图片百分比定位(=PSD 头图区坐标),
 * 字号用 cqw(相对图片宽)+ clamp 上下限。
 *
 * 与旧版(3250×1815)的差异:头图加高;屏 2 促销屏改为「4 产品图(烤入背景)
 * + kicker + 两行超大促销语」;屏 3-5 改为「副标题在上 + 超大主标题在下」;
 * 指示条改为底部左侧 5 条长条(PSD 仅画 4 条,经确认按 5 屏顺延);
 * 左右箭头与「查看详情」胶囊按老板 2026-10 诉求 1 **默认不渲染**(见下方两个开关),
 * 改为 5 屏全部整屏可点。
 *
 * 手动切换 / 无障碍(箭头隐藏后补齐的三件事,都在本文件内):
 *  1. **手势**:手指走 touch 事件、鼠标与触控笔走 pointer 事件(两者互斥分派,
 *     一次手势只切一屏),共用 40px 阈值 —— 桌面不再是"只能点 2.8px 细条";
 *  2. **暂停/播放控件**(WCAG 2.2.2):原生 button、`aria-label` 随状态切换、
 *     `aria-pressed` 暴露状态;`prefers-reduced-motion: reduce` 下默认不自动播放;
 *  3. **滑动吞 click**:整屏都是 `<a>`,手势判定为滑动后吞掉浏览器补发的 click,
 *     避免"想切屏结果跳走"(实测:不吞的话 300px 的拖动会照常触发导航)。
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

  /**
   * 自动轮播的开关。`null` = 用户还没表态 → 跟随系统 Reduce Motion;
   * 用户按过暂停/播放之后,他自己的选择优先(即使中途改了系统设置)。
   *
   * 不用 `useState(() => matchMedia(...))`:SSR 读不到 matchMedia,惰性初始值会让
   * 服务端与客户端首帧的 `aria-label` / `aria-pressed` 不一致(hydration 报错),
   * 所以首帧一律按"播放中"渲染,再由 effect 纠正。
   */
  const [autoplayChoice, setAutoplayChoice] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  /** 手势进行中(按下未松手)→ 自动轮播暂停;进 effect 依赖,松手时重新计时。 */
  const [gestureActive, setGestureActive] = useState(false);
  const playing = autoplayChoice ?? !reducedMotion;
  const labels = AUTOPLAY_LABELS[locale === "zh" ? "zh" : "en"];

  const go = (i: number) => setActive(((i % slides.length) + slides.length) % slides.length);

  /** 系统开了 Reduce Motion:默认**不**自动播放(WCAG 2.2.2 的默认值),用户仍可按播放。 */
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
    // 拖拽期间暂停自动轮播(按下即停):否则拖到一半会被 5 秒计时器把屏抢走。
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
   * 控件层(指示条 / 暂停钮)留在外面 —— 它们是按图片比例定位的共享控件,
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
    setGestureActive(true); // 按下即暂停自动轮播
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
    if (swiped || gesture.dragging) swallowClick.current = true;
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

  /**
   * 每一屏都整屏包成链接(屏 1/2 的品牌标语、促销屏、屏 3-5 的系列屏一律如此)。
   *
   * 历史:屏 1/2 原本整屏没有任何可点元素(只有屏 3-5 有「查看详情」),顾客在头图上
   * 点哪儿都没反应(P1-1),于是给带 `href` 的屏整体包链接。当时屏 3-5 **不能**包
   * —— 它们内部已有「查看详情」的 `<a>`,嵌套非法。
   *
   * 现在(老板诉求 1)「查看详情」默认不渲染,约束随之消失:5 屏统一整屏包链接,
   * 首页对 /collections/* 的内链数不减反增。若把 `SHOW_HERO_DETAILS_CTA` 翻回 true,
   * 系列屏必须回到"不包整屏"的老结构,否则嵌套锚点 —— 所以下面的 renderOverlay
   * 用**同一个常量**做分支,两个方向都不可能写错。
   * 可访问名来自链接内容(标语 / 促销语 / 系列标题),不额外造 i18n key。
   */
  const wrapScreenLink = (s: HeroSlide, node: React.ReactNode) =>
    s.href ? (
      <Link href={s.href} className="absolute inset-0 block">
        {node}
      </Link>
    ) : (
      node
    );

  /** 屏 2:促销屏 —— 背景图(4 张产品图已烤入)+ kicker + 两行超大促销语(实时文字)。 */
  const renderPromo = (s: HeroSlide) => (
    <>
      {wrapScreenLink(
        s,
        <>
          <Image
            src={s.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* kicker(PSD 图层「OFFY Big Sale: Bonus Gift Included」bbox x398 y1337:
          x12.25% y51.35%,79.8px=2.46cqw,黑字) */}
          <p className="text-ink absolute top-[51.35%] left-[12.25%] text-[clamp(11px,2.46cqw,36px)] leading-snug font-normal tracking-[var(--tracking-10)] uppercase">
            {locale === "zh" ? s.promo!.kicker.zh : s.promo!.kicker.en}
          </p>
          {/* 两行超大促销语(PSD bbox x386 y1508 w2439 h438:x11.88% y59.72%,
          224.5px=6.91cqw,黑字;两行 ink 高 438 = 行高 + 大写字高(0.75em)
          → 行高≈1.20em)。PSD/效果图里是 'BUY ANY 3 OFFYs,' 的小写 s,
          所以这里不加 uppercase。 */}
          <p className="text-ink absolute top-[59.72%] left-[11.88%] text-[clamp(18px,6.91cqw,100px)] leading-[1.2] font-semibold tracking-tight whitespace-pre-line">
            {locale === "zh" ? s.promo!.text.zh : s.promo!.text.en}
          </p>
        </>,
      )}
    </>
  );

  /** 屏 3-5 系列屏的**内容**(副标题 + 主标题)。整屏链接由 renderOverlay 统一包。 */
  const renderSeriesOverlay = (s: HeroSlide) => {
    const title = locale === "zh" ? s.title!.zh : s.title!.en;
    const subtitle = s.subtitle ? (locale === "zh" ? s.subtitle.zh : s.subtitle.en) : null;
    return (
      <>
        {/* 副标题:**独占一行**(`pr-[18cqw]` 给右侧按钮让出位置)。
            旧版副标题与「查看详情」曾在同一个 flex 行里(items-center + justify-between),
            按钮改成 absolute 后行高只由小字行盒决定,副标题稳定在 64.51%。
            按钮现在默认不渲染(诉求 1),但这套几何原样保留 —— 翻回开关时不必重调。 */}
        <div className="absolute inset-x-[6.4%] top-[64.51%]">
          {/* 副标题(PSD 例:Romanticize the Everyday bbox x210 y1606 w1147 h60:
              x6.46% y64.51%,79.8px=2.46cqw) */}
          {subtitle && (
            <p
              className={`pr-[18cqw] text-[clamp(11px,2.46cqw,36px)] leading-snug font-normal tracking-[var(--tracking-10)] uppercase ${
                s.dark ? "text-cream/85" : "text-ink-soft"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {/* 主标题(PSD 例:OFFY PRINCESS SERIES bbox x208 y1777 w2647 h168:
            x6.4%,224.5px=6.91cqw)。中英文同字号 —— 新 PSD 直接给了英文稿
            (PSD 里 OFFY DRESS-UP SERIES 宽 2723px = 83.8%),不再需要旧版「英文收窄到
            4.6cqw」的权宜处理。标题文案后来按用户要求去掉了「OFFY」前缀,
            最长屏现在是 STREETWEAR SERIES,字号规则不变。
            y:PSD 给的是字形 ink 顶(高 168 = 0.75em 大写字高),而 CSS top 定位
            的是行盒顶,两者相差约半行距+上伸部;实测在 1.05 行高下为 0.16em
            ≈ 1.7% 头图高,故 72.88% - 1.68% = 71.2%。
            窄屏(lg 以下)下移到 73%:头图是固定横构图、字号随宽度等比缩,所以副标题
            行盒(5.5% 头图高)与主标题行盒(11.6%)之间那 1.2% 间距在手机上只剩几 px,
            看着糊在一起;73% 把间距拉到 3%,主标题底 84.6% 距滚动条(89.8%)仍有 5.2%。
            lg 以上维持 PSD 原值。 */}
        <p
          className={`absolute top-[73%] left-[6.4%] w-[88%] text-[clamp(18px,6.91cqw,100px)] leading-[1.05] font-semibold tracking-tight uppercase lg:top-[71.2%] ${
            s.dark ? "text-cream" : "text-ink"
          }`}
        >
          {title}
        </p>
      </>
    );
  };

  /**
   * 「查看详情」胶囊。**默认关**(老板诉求 1)—— 返回 null 而不是加隐藏类:
   * 它内部是 `<a>`,留在 DOM 里就与屏 3-5 的整屏链接形成非法嵌套。
   * 几何/文案/i18n key(`home.heroDetailsCta`)全部保留,翻回开关即可恢复。
   */
  const renderDetailsCta = (s: HeroSlide) => {
    if (!SHOW_HERO_DETAILS_CTA) return null;
    const arrowSrc = s.dark ? "/assets/hero/cta-arrow-white.png" : "/assets/hero/cta-arrow.png";
    return (
      // 查看详情(PSD 组「查看详情 拷贝 N」:矩形7 bbox x2535 y1570 w499 h101
      //   = x78.00% w15.35% h4.94%头图高=3.11cqw;箭头 x90.62%;
      //   胶囊形 + 1.5px 描边无填充,浅底黑边黑字/深底白边白字)。
      //   内边距/间距按 PSD 实测:左右各 50/3250=1.54%、文字到箭头 27/3250=0.83cqw。
      //   宽度用 min-w 而不是固定 w —— 固定宽度在窄屏或中文短字时会挤压文字。
      //   尺寸统一用 cqw(相对头图容器),避免被父级 flex 行的宽度改变百分比基数。
      //   字号在 PSD 的 47.2px=1.45cqw 基础上再小 2 号 → 18px 封顶(箭头 h-[0.85em]
      //   是 em 单位,会跟着一起缩)。
      //   高度从 PSD 的 4.94% 头图高(=3.11cqw)收到 2.6cqw:1440 下边框 37.4px、
      //   文字 17.9px,上下各留 ~9.8px —— 比原来(边框 44.8px)矮一截但不贴字。
      //   窄屏命中区下限 24 → 44px(方案 §1.1);`lg:min-h-0` 让 ≥1024px 的高度
      //   回到 2.6cqw,桌面端不受影响。
      //   注:44px 的胶囊在 375px 下会向下多探 ~10px 到主标题带(标题在 73%),
      //   按钮在右端、标题尾巴在 `SERIES` 处可能轻微相交 —— 已列入需 375px
      //   截图复核项(方案 M6)。此项目前随开关关闭而不适用。
      <div className="absolute inset-x-[6.4%] top-[64.51%]">
        <Link
          href={s.href!}
          className={`group absolute top-1/2 right-0 flex h-[2.6cqw] min-h-[44px] w-auto min-w-[15.35cqw] -translate-y-1/2 items-center justify-center gap-[0.83cqw] rounded-full border-[1.5px] px-[1.54cqw] text-[clamp(12px,1.24cqw,18px)] font-normal transition-colors lg:min-h-0 ${
            s.dark
              ? "border-cream text-cream hover:bg-cream hover:text-ink"
              : "border-ink text-ink hover:bg-ink hover:text-cream"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="whitespace-nowrap uppercase">{t("heroDetailsCta")}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={arrowSrc}
            alt=""
            className="h-[0.85em] w-auto transition-colors group-hover:invert"
          />
        </Link>
      </div>
    );
  };

  /**
   * 覆盖层渲染 —— 5 屏**统一**结构:先算内容,再整体交给 `wrapScreenLink`。
   * 屏 3-5 是否包整屏链接,与「查看详情」是否渲染互斥(嵌套 `<a>` 非法),
   * 由同一个 `SHOW_HERO_DETAILS_CTA` 决定,不可能出现两边同时成立。
   */
  const renderOverlay = (s: HeroSlide) => {
    const inner = (
      <>
        {/* 屏 1:is.offy 字标(PSD 智能对象 bbox x1444 y468 w513 h193:
            x44.43% y8.81% w15.78%；左右居中)+ slogan(PSD bbox x869 y762 w1619 h218:
            x26.74% w49.82%,居中 just=2,104.7px=3.22cqw,黑字;两行 ink 高 218
            = 行高 + 大写字高 → 行高≈1.33em)。
            y 同样按 ink 顶换算行盒顶:实测偏低 1.58%,23.20% - 1.58% = 21.6%。
            en 文案用 "\n" 显式分两行(whitespace-pre-line)。 */}
        {s.wordmark && (
          <>
            <div className="absolute inset-x-0 top-[8.81%] flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/brand/is-offy-wordmark.png"
                alt="is.offy"
                className="w-[15.78%] max-w-[264px] min-w-[80px]"
              />
            </div>
            <div className="absolute inset-x-0 top-[21.6%] flex justify-center px-[4%]">
              <p className="text-ink max-w-full text-center text-[clamp(15px,3.22cqw,46px)] leading-[1.33] font-semibold tracking-[var(--tracking-18)] break-words whitespace-pre-line">
                {locale === "zh" ? s.text!.zh : s.text!.en}
              </p>
            </div>
          </>
        )}
        {s.title && renderSeriesOverlay(s)}
        {s.title && renderDetailsCta(s)}
      </>
    );
    // CTA 关闭(默认)时整屏包链接;CTA 打开时系列屏回到"不整屏包"的老结构。
    return s.title && SHOW_HERO_DETAILS_CTA ? inner : wrapScreenLink(s, inner);
  };

  return (
    // 外层定尺寸(aspect-ratio = 3250/2041);内层做 cqw 容器 —
    // container-type 与 aspect-ratio 同元素有 Chrome 高度计算异常,必须分层。
    // `overflow-hidden`:跟手位移只改 transform(不改 width/margin,所以高度仍由
    // aspect-ratio 决定、不触发回流),但拖到一半时图片会探出容器边缘,必须裁掉,
    // 否则 375px 下拖动会顶出横向滚动条。
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "3250 / 2041" }}
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
      <div className="absolute inset-0" style={{ containerType: "inline-size" }}>
        {/* 轨道层:跟手位移只写在这一层(transform),控件层在它外面不跟着动 */}
        <div className="absolute inset-0" data-testid="hero-track" ref={trackRef}>
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
        </div>

        {/* 控件层:覆盖整个图片(共享一组控件,按图片比例定位,不随屏切换) */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {/* 长条指示器(PSD 组 8:每条 367×24px=#f7f2f0,y89.8%,x 自 11.8% 起
              间隔 47px;active 100% / inactive 28% 透明。PSD 仅画 4 条,
              经确认按 5 屏同样式顺延至 5 条)。
              条本身只有 ~2.8px 高(1.18% 头图高),命中区用伪元素向上扩,
              视觉尺寸一点不动(getBoundingClientRect 量不到伪元素,验收用真实 touch)。
              扩多少按箭头是否渲染取值(INDICATOR_HIT_AREA_CLS):箭头显示的年代
              不能向下扩(会抢 84.8% 处箭头的命中区),箭头隐藏后多扩 0.15rem
              → 375px 下有效命中高度 ≈45.2px,过 44px 门槛(方案 §7 断言 1c)。
              这也是 CTA/箭头隐藏后**唯一可见**的手动切换控件(手势切换没有可见入口),
              所以必须保住 ≥44px。 */}
          <div
            className="absolute top-[89.8%] left-0 h-[1.18%] w-full"
            role="tablist"
            aria-label={t("heroSlidesLabel")}
          >
            {slides.map((sl, di) => (
              <button
                key={sl.image}
                role="tab"
                aria-selected={di === active}
                aria-label={t("heroGoToSlide", { n: di + 1 })}
                onClick={() => go(di)}
                className={`pointer-events-auto absolute top-0 h-full w-[11.3%] bg-[#f7f2f0] transition-opacity duration-500 after:absolute after:inset-x-0 after:bottom-0 ${INDICATOR_HIT_AREA_CLS} after:content-[''] ${
                  di === active ? "opacity-100" : "opacity-[0.28] hover:opacity-[0.5]"
                }`}
                style={{ left: `${11.82 + di * 12.74}%` }}
              />
            ))}
          </div>
          {/* 暂停/播放(WCAG 2.2.2):自动轮播 5s 无限循环,必须给用户一个"让它停下"的
              机制 —— 原生 button 天然可键盘聚焦 + Enter/Space 激活(实测:键盘 Tab 到
              它按 Enter 即暂停,再按 Space 恢复);`aria-label` 随状态在
              「暂停自动轮播 / 播放自动轮播」之间切换,`aria-pressed` 表示"已暂停"
              (true = 暂停中,按钮此刻显示的是播放三角)。
              位置:指示条同一条带(y89.8%)的最右侧。指示条到 x74.08% 结束,右边
              x74.1%-97.2% 是空的;`right-[2.8%]` + `-translate-y-1/2` 让命中区在
              375px(头图高 235px)与 1440px 下都完整落在头图内。
              ⚠️ 与左右箭头的冲突:箭头若翻回 true,窄屏它们在 y84.8%、同为 44px,
              会与这里重叠 —— 恢复箭头前必须先给暂停钮换位置。 */}
          {slides.length > 1 && (
            <button
              type="button"
              aria-label={playing ? labels.pause : labels.play}
              aria-pressed={!playing}
              onClick={() => setAutoplayChoice(!playing)}
              className="bg-ink/50 hover:bg-ink/70 text-cream pointer-events-auto absolute top-[89.8%] right-[2.8%] flex h-[clamp(44px,2.7cqw,48px)] w-[clamp(44px,2.7cqw,48px)] -translate-y-1/2 items-center justify-center rounded-[4px] transition-colors"
            >
              {playing ? (
                // 暂停:两条竖杠(纯内联 SVG —— 不新增素材文件,也不多一次请求)
                <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3.5 w-3.5 fill-current">
                  <rect x="2" y="1" width="3" height="10" rx="0.5" />
                  <rect x="7" y="1" width="3" height="10" rx="0.5" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3.5 w-3.5 fill-current">
                  <path d="M2.5 1 10.5 6 2.5 11Z" />
                </svg>
              )}
            </button>
          )}
          {/* 右下 ←/→ 箭头按钮(PSD y76.3-82.3%,与主标题同带;x89.8-97.2%;
              120×122px≈3.7cqw 方形,黑 50% 透明底 + 白色箭头图标)。
              **默认不渲染**(老板 2026-10 诉求 1):桌面鼠标失去了最直观的切换入口,
              但现在有两处补偿 —— 指示条(可点/可键盘聚焦/能直达任意屏)、
              pointer 拖拽(鼠标与触控笔,与手指同一套 40px 判定)+ 暂停/播放钮。
              几何与 44px 命中区原样保留,把 `SHOW_HERO_ARROWS` 翻回 true 即恢复
              (注意先挪开暂停钮,见上):
              窄屏(lg 以下)在 84.8% 并缩到 2.7cqw(最长的标题在窄屏会铺到 88% 宽,
              留在 76.3% 会压住标题尾巴),`lg:` 那两行原值保持不动。 */}
          {SHOW_HERO_ARROWS && (
            <div className="absolute top-[84.8%] right-[2.8%] flex gap-1 lg:top-[76.3%]">
              <button
                type="button"
                aria-label={t("heroPrevSlide")}
                onClick={() => go(active - 1)}
                className="bg-ink/50 hover:bg-ink/70 pointer-events-auto flex h-[clamp(44px,2.7cqw,48px)] w-[clamp(44px,2.7cqw,48px)] items-center justify-center rounded-[4px] transition-colors lg:h-[clamp(30px,3.7cqw,48px)] lg:w-[clamp(30px,3.7cqw,48px)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/hero/arrow-left.png"
                  alt=""
                  className="h-[clamp(6px,0.88cqw,12px)] w-auto lg:h-[clamp(8px,1.2cqw,15px)]"
                />
              </button>
              <button
                type="button"
                aria-label={t("heroNextSlide")}
                onClick={() => go(active + 1)}
                className="bg-ink/50 hover:bg-ink/70 pointer-events-auto flex h-[clamp(44px,2.7cqw,48px)] w-[clamp(44px,2.7cqw,48px)] items-center justify-center rounded-[4px] transition-colors lg:h-[clamp(30px,3.7cqw,48px)] lg:w-[clamp(30px,3.7cqw,48px)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/hero/arrow-right.png"
                  alt=""
                  className="h-[clamp(6px,0.88cqw,12px)] w-auto lg:h-[clamp(8px,1.2cqw,15px)]"
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
