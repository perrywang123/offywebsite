"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeroSlideData } from "@/lib/content";

export type HeroSlide = HeroSlideData;

const SWIPE_THRESHOLD = 40;

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
      <div className="absolute inset-0" style={{ containerType: "inline-size" }}>
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
              经确认按 5 屏同样式顺延至 5 条)。
              条本身只有 ~2.8px 高(1.18% 头图高),命中区用伪元素向上扩,
              视觉尺寸一点不动(getBoundingClientRect 量不到伪元素,验收用真实 touch)。
              扩多少按箭头是否渲染取值(INDICATOR_HIT_AREA_CLS):箭头显示的年代
              不能向下扩(会抢 84.8% 处箭头的命中区),箭头隐藏后多扩 0.15rem
              → 375px 下有效命中高度 ≈45.2px,过 44px 门槛(方案 §7 断言 1c)。
              这也是 CTA/箭头隐藏后**唯一**的手动切换控件之一(另一个是触摸滑动),
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
          {/* 右下 ←/→ 箭头按钮(PSD y76.3-82.3%,与主标题同带;x89.8-97.2%;
              120×122px≈3.7cqw 方形,黑 50% 透明底 + 白色箭头图标)。
              **默认不渲染**(老板 2026-10 诉求 1):桌面鼠标失去了最直观的切换入口,
              但指示条(可点/可键盘聚焦/能直达任意屏)+ 自动轮播仍在,功能零损失,
              只是可发现性下降(补 pointer 拖拽列为后续待办)。
              几何与 44px 命中区原样保留,把 `SHOW_HERO_ARROWS` 翻回 true 即恢复:
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
