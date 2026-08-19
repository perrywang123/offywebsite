# PLAYCORE 凭空幻想 · 动效与交互规格（Animation & Motion Spec）

> 文档编号：`redesign-03-animation.md` · 归属：网站动画专家
> 版本：v1.0 · 状态：待评审（Draft for Review）
> 输入：`docs/brand-brief.md`、`docs/specs/02-ux-spec.md`、`docs/specs/03-visual-spec.md`、`src/app/[locale]/**`、`src/components/**`、`src/app/globals.css`
> 参考站：[dogguo.com](https://dogguo.com/)（[Limely 案例](https://www.limely.co.uk/inspiration/project/dogguo.com)）、[littlebeast.co](https://littlebeast.co/)、[casetify.cn](https://www.casetify.cn/iphone-cases/iphone-17-pro-max-cases)
> 工程约束：Next.js 15 (App Router) + React 19 + Tailwind CSS v4（`@theme` + `@keyframes`）——**不引入重型动画库**，只用 CSS transitions/animations + `IntersectionObserver` + 极少量 `requestAnimationFrame`。

---

## 0. dogguo.com 动效调研结论（对齐依据）

Limely 把 dogguo.com 归为 **editorial 杂志式电商**：图片优先、文案克制、以「波点」视觉识别贯穿。其动效语言的共性（editorial-ecommerce 惯用法，也是本 spec 的对齐方向）：

| 观察 | 落地到 Offy |
| --- | --- |
| 首屏不是「轰」出来的，而是**逐次浮现**（文字先、图后，慢而笃定） | Hero 用 stagger fade-up，总时长控制在 1s 内但单个元素 0.7s |
| 滚动进场用**大块「淡入 + 轻微上移」**，而非弹跳/旋转/缩放轰炸 | 全站统一 `.reveal` 淡入上移 |
| 图片 hover 是**克制的微缩放 + 暖色遮罩**，不做 3D 翻转/位移 | 商品图慢缩放，品牌图「去缩放 + 轻微变暗」 |
| 品牌叙事用**视差 / 文字逐行浮现**营造「翻阅杂志」感 | Story 区文字 masked reveal + Lookbook 错速视差 |
| 交互反馈**轻快利落**（抽屉滑入、按钮态、角标 pop），不打断浏览 | 抽屉 `ease-snap` 滑入，角标用轻微回弹 |

> 调研来源片段有限（搜索引擎只返回了 Limely 案例页与 [Dot carrier bag 产品页](https://dogguo.com/products/dot-carrier-bag-kopie)的链接，无逐帧动效文案），以上为「editorial-ecommerce 动效惯用法」综合，已与 `03-visual-spec.md` §6 的克制基调对齐。

---

## 1. 动效基调（一句话原则 + 时长/缓动约定）

**一句话原则：**
> 让页面像「被一页页翻开」——内容以克制的淡入上移逐次浮现，交互反馈轻快利落；只用 `transform` / `opacity`，让 Offy 的情绪叙事自然流动，而不是 PPT 式的弹跳 + 旋转 + 轮播轰炸。

### 1.1 缓动曲线（Tailwind v4 `@theme` 直出）

在 `src/app/globals.css` 顶部 `@theme` 内新增（`--ease-*` 会直接生成 `ease-*` 工具类，并**覆盖** Tailwind 默认的 `ease-out`）：

```css
@theme {
  /* 缓动曲线 */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* 标准减速（替代默认 0,0,0.2,1，更有「定住」感） */
  --ease-snap: cubic-bezier(0.16, 1, 0.3, 1);   /* ease-out-expo 感：抽屉/遮罩/遮罩滑出 */
  --ease-inout: cubic-bezier(0.65, 0, 0.35, 1); /* 对称：路由过渡、画廊交叉淡入 */
  --ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);/* 轻微回弹：角标/徽章/加购成功 */
  --ease-linear: linear;                         /* marquee 跑马灯 */
}
```

### 1.2 时长约定（尽量贴 Tailwind 默认 `duration-*` 档）

| 档位 | 值 | 工具类 | 用途 |
| --- | --- | --- | --- |
| 极快 | 150ms | `duration-150` | 底色/描边/文字色 hover（`transition-colors`） |
| 基础 | 200–300ms | `duration-200` / `duration-300` | 按钮、卡片、图片微交互 |
| 慢 | 400ms | `duration-[400ms]` | 抽屉滑入、遮罩淡入、大图交叉淡入 |
| 揭示 | 600–800ms | `duration-[700ms]` | scroll-reveal（editorial 偏慢、笃定） |
| 循环 | 30–40s | `animate-marquee` | 跑马灯（线性，可 hover 暂停） |

**原则：** 元素越「大/信息越重」，动得越慢、位移越小；元素越「小/反馈」，动得越快、越干脆。

---

## 2. 具体动效清单

> 每条标注：**触发时机 → 实现方式（具体 CSS/JSX）→ 用在哪**。
> 所有位移只作用于 `transform` / `opacity`；新加的公共类集中在 `globals.css`，组件内用语义工具类组合。

### 2.1 首页 Hero 入场与滚动

**触发时机：** 首屏首帧（SSR 渲染完成即播放，**不依赖 JS**）+ 用户向下滚动。

**入场（纯 CSS stagger，不依赖 JS）：**
- 顺序：eyebrow → H1 → 副标题 → CTA 按钮组 → 右侧大图，依次 `fade-up`，间隔 80–120ms。
- 用 `animation-fill-mode: both` + 逐元素 `animation-delay`；JS 关闭/加载慢时内容仍在 DOM 里，不遮挡首屏（LCP 见 §3.3）。

```css
@theme {
  --animate-fade-up: fade-up 0.7s var(--ease-out) both;
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

```tsx
// src/app/[locale]/page.tsx — Hero 左列
<p className="animate-fade-up" style={{ animationDelay: "0ms" }}>{t("eyebrow")}</p>
<h1 className="animate-fade-up" style={{ animationDelay: "90ms" }}>…</h1>
<p className="animate-fade-up" style={{ animationDelay: "180ms" }}>{t("heroSub")}</p>
<div className="animate-fade-up" style={{ animationDelay: "270ms" }}>…CTA…</div>
{/* 右图容器 */}
<div className="animate-fade-up overflow-hidden rounded-3xl …" style={{ animationDelay: "360ms" }}>
  <Image … className="object-cover" />
</div>
```

**滚动（可选 Tier B 视差，桌面 only）：**
- 右侧大图随滚动以 0.3× 速度向下漂移（`translateY`），制造「图片与文字分离」的杂志感。
- 实现：一个极小的 `useParallax(speed)`（rAF 读 `scrollY`，只写 `transform`），**仅在** `matchMedia('(prefers-reduced-motion: no-preference)')` 且 `matchMedia('(pointer: fine)')` 时启用；移动端跳过（触屏滚动与视差叠加会抖）。

```tsx
// 用法（桌面）：<div ref={ref} className="will-change-transform">…图…</div>
// useParallax 内部：el.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`，rAF 节流
```

> **取舍：** 若首期不想写 rAF，Tier A（纯 CSS 入场）已足够，视差降级为「图 hover 去缩放」即可，不影响质感底线。

### 2.2 Scroll-Reveal（区块/商品卡逐次淡入上移）★ 全站核心

**触发时机：** 元素进入视口（viewport）约 15% 时，一次性触发。

**实现：** `useReveal` hook（见 §4）+ 全局 `.reveal` 类；商品卡用 `--reveal-delay` 做 stagger（每张卡 +60ms，营造「依次浮现」而非整屏同跳）。

```css
/* 渐进增强：只有 <html class="js"> 时才隐藏初始态，JS 失败则内容直接可见 */
.js .reveal {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.7s var(--ease-out),
    transform 0.7s var(--ease-out);
  transition-delay: var(--reveal-delay, 0ms);
}
.js .reveal.is-in { opacity: 1; transform: none; }

/* 方向变体（data-variant） */
.js .reveal[data-variant="left"]  { transform: translateX(-24px); }
.js .reveal[data-variant="right"] { transform: translateX(24px); }
.js .reveal[data-variant="clip"]  { clip-path: inset(0 0 100% 0); transition: clip-path 0.9s var(--ease-out), opacity 0.6s var(--ease-out); }
.js .reveal.is-in { transform: none; clip-path: inset(0 0 0 0); opacity: 1; }
```

**用在哪：**
- 首页每个 `<section>`（Featured / Series / Story / Lookbook / Newsletter）的标题行 + 内容块。
- `ProductGrid`：给每张 `ProductCard` 外包 `<Reveal delay={i * 60}>`（`<ProductGrid>` 内部统一加）。
- Collections 页系列卡、About 页各 section、PDP 信息列（`data-variant="right"`）。

```tsx
// src/components/product/ProductGrid.tsx
{products.map((product, i) => (
  <Reveal key={product.code} delay={Math.min(i, 7) * 60}> {/* 只 stagger 前 8 张，避免首屏等待 */}
    <ProductCard product={product} locale={locale} />
  </Reveal>
))}
```

### 2.3 商品卡 Hover（图缩放 / 阴影 / 信息浮现）

**触发时机：** 桌面 `hover`（用 `group` 语义；移动端触屏无 hover，天然跳过）。

**实现（在现有 `ProductCard.tsx` 基础上增强）：**

```tsx
<article className="group">
  <Link href={…} className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-paper">
    {/* 图：慢缩放（0.7s，比现在 200ms 更「笃定」） */}
    <Image … className="object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.06]" />
    {/* 暖色遮罩：hover 从 0 → 0.08 淡入（只用 opacity，不触发重绘大开销） */}
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-ink-900 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.08]" />
    {/* 快速加购：桌面 hover 从底部滑入（pointer:fine 才渲染/显示） */}
    <div className="absolute inset-x-3 bottom-3 hidden translate-y-2 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 md:block">
      <AddToCartButton code={product.code} className="w-full h-10" />
    </div>
  </Link>
  {/* 名称下划线滑入 */}
  <h3 className="…">
    <span className="bg-gradient-to-r from-current to-current bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_1px]">{name}</span>
  </h3>
  …
</article>
```

- **阴影**：卡片整体 `transition-shadow duration-300` + hover 加深暖棕阴影 `shadow-[0_12px_32px_rgba(32,27,22,0.12)]`（对应 `03-visual-spec` §4.2）。
- **注意**：卡片 `hover:-translate-y-1` 这类位移保留但改 `duration-300 ease-out`；快速加购按钮与现有右上角 `AddToCartButton` 二选一，避免信息重复（PDP 保留右上角，卡片 hover 用滑入按钮）。

### 2.4 品牌叙事区（Story / Lookbook）—— 文字浮现 + 大图视差

**触发时机：** 滚动进入该 section 时。

**① 文字 masked reveal（Story 区大标题/引语，editorial 核心质感）：**
- 标题的每一行放在 `overflow-hidden` 的裁剪容器里，内部文字 `translateY(110%) → 0` 逐行浮现，像「被翻出来」。

```css
.mask-line { overflow: hidden; display: block; }
.js .mask-line > span {
  display: block;
  transform: translateY(110%);
  transition: transform 0.8s var(--ease-out);
  transition-delay: var(--reveal-delay, 0ms);
}
.js .is-in .mask-line > span { transform: translateY(0); }
```

```tsx
// Story 区：<Reveal variant="fade"> <h2>…每行…</h2> </Reveal>，行内用 <span className="mask-line"><span>…</span></span>
```

**② Lookbook 错速视差（可选 Tier B）：**
- Masonry `columns-2 md:columns-3` 的每一列上下漂移速度不同（如 `speed = 0.05 / 0.1 / 0.15` 交替），营造「拼贴画在流动」。
- 实现：复用 `useParallax`，桌面 + reduced-motion 关闭才启用；单列移动端关闭。

**③ 引语（Story Quote）：** 淡入 + 字距「收敛」：`letter-spacing` 从 `0.06em → 0`（用 `transition-[letter-spacing]`，低频一次，可接受）。不放大、不弹跳。

### 2.5 Marquee 跑马灯（Slogan / 系列名）

**触发时机：** 页面加载即循环（无限线性），进入视口不影响。

**用在哪：** Hero 与 Featured 之间插一条「品牌标语条」；内容 = 英文 slogan + 中文 slogan + 系列名轮转，用 `pop-yellow` / `pop-coral` 点缀关键词，呼应波普。

```css
@theme {
  --animate-marquee: marquee 30s linear infinite;
  @keyframes marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
}
```

```tsx
export function Marquee({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-sand-200 bg-ink-900 py-3 text-cream-50">
      <div className="flex w-max animate-marquee gap-8 group-hover:[animation-play-state:paused]">
        <span className="shrink-0">{children}</span>
        <span className="shrink-0" aria-hidden>{children}</span> {/* 无缝循环的复制半段 */}
      </div>
    </div>
  );
}
```

- **无缝循环**：内容渲染两份（第二份 `aria-hidden`），轨道 `translateX(-50%)`；两半段之间 `gap-8` 需在每半段末尾再补一个等宽空隙（`pr-8`）保证节奏连续。
- **无障碍**：`prefers-reduced-motion: reduce` 下停转（见 §3.1）；跑马灯内容同时作为 `sr-only` 文本可读。

### 2.6 购物车抽屉滑入 + 加购反馈

**现状问题：** `CartDrawer` 用 `if (!isOpen) return null` 直接卸载，**没有进出场动画**，且遮罩/抽屉是瞬现。

**目标：** 抽屉 `translate-x-full → 0` 滑入（`360ms ease-snap`），遮罩 `opacity 0 → 1`（`250ms`），关闭反向；角标与按钮态有反馈。

**实现（保持挂载 + `data-open` 状态驱动，卸载前等 transitionend）：**

```css
.cart-drawer { transform: translateX(100%); transition: transform 0.36s var(--ease-snap); }
.cart-drawer[data-open="true"] { transform: translateX(0); }
.cart-overlay { opacity: 0; transition: opacity 0.25s var(--ease-out); }
.cart-overlay[data-open="true"] { opacity: 1; }
```

```tsx
// CartProvider 里新增 mounted 状态：open 时立即 setMounted(true)，close 时先 data-open=false，
// 过渡结束（onTransitionEnd 或 setTimeout 360ms）再 setMounted(false)。
// CartDrawer：{mounted && (<div>遮罩 + 抽屉 … data-open={isOpen}>) }
```

- **遮罩点击关闭 / Esc 关闭 / 焦点陷阱**：已有部分，补齐 `role="dialog" aria-modal`（UX spec §5.4 已要求）。
- **加购按钮态**：`AddToCartButton` 点击后短暂进入「added」态——文字切「已加入 ✓」+ 背景 `pop-coral → success`，用 `--ease-pop` 做一次 `scale(1 → 1.04 → 1)`，`400ms` 后回 idle（`setTimeout`，防抖）。同时 `CartProvider.add()` 已自动 `open()` 抽屉。
- **角标 pop**：`CartButton` 的 `count` 变化时，给角标加一次性 `animate-pop`（`scale 1 → 1.35 → 1`，`--ease-pop`），用 `key={count}` 触发重播。

```css
@theme {
  --animate-pop: pop 0.4s var(--ease-pop);
  @keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
}
```

### 2.7 页面/路由切换过渡（App Router `template.tsx`）

**触发时机：** 每次路由导航，新页面内容挂载时。

**实现：** 新增 `src/app/[locale]/template.tsx`，`template` 在**每次导航都重新挂载**（与 `layout` 只在语言切换时重挂不同），正是入场动画的挂载点：

```tsx
// src/app/[locale]/template.tsx
"use client";
export default function LocaleTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter">{children}</div>;
}
```

```css
@theme {
  --animate-page-enter: page-enter 0.3s var(--ease-inout) both;
  @keyframes page-enter {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

- **只做入场淡入，不做退场**：App Router 无法可靠动画「离开的旧页」（需复杂的手动 View Transitions）。`<header>/<footer>` 在 layout 里、不在 template 里，因此导航时它们保持稳定，只有 `<main>` 内容淡入——这正好符合「编辑感」且不抖动。
- **可选进阶（后续）**：Next.js 15 的 `viewTransition` 实验特性 + React 19 `<ViewTransition>` 可做真正的共享元素过渡（如商品卡→详情图），首期**不做**，标记为 backlog。

### 2.8 图片 Hover 质感（微缩放 + 遮罩）

**统一规则（两种「手感」）：**

| 场景 | 触发 | 实现 | 遮罩 |
| --- | --- | --- | --- |
| 商品图（卡/详情） | hover | **放大** `scale-100 → scale-[1.06]`，`700ms ease-out` | `ink-900/0 → /8` 淡入 |
| 品牌/ins/lookbook 图 | hover | **去缩放** `scale-[1.04] → scale-100`（「图片静下来」的杂志感） | `ink-900/0 → /12` + 底部渐显一句 caption（可选） |

```tsx
// 品牌图容器（可抽成 <ImageReveal> 组件）
<div className="group relative overflow-hidden rounded-2xl bg-cream-100">
  <Image … className="object-cover transition-transform duration-[900ms] ease-out scale-[1.04] group-hover:scale-100" />
  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-900/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
</div>
```

- 遮罩只用 `opacity` 过渡，渐变底层预渲染，不触发 repaint 大开销。
- **不**加 `filter`（饱和度/色相）——品牌 spec §5 红线：保真 Offy 形象。

---

## 3. 无障碍与性能

### 3.1 `prefers-reduced-motion` 降级（硬化现有规则）

现有 `globals.css` 已有「0.01ms 全局停动」，但太粗（会连 marquee 的 `animation-duration` 也砍成瞬间，仍会「瞬跳」而非静止）。改为**精准降级**：

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }              /* 关闭平滑滚动 */
  .js .reveal,
  .js .mask-line > span { opacity: 1 !important; transform: none !important; clip-path: none !important; }
  .cart-drawer, .cart-overlay { transition: none !important; }
  *[class*="animate-"] { animation: none !important; }  /* marquee / fade-up / pop 全停 */
}
```

- **JS hook 侧**：`useReveal` / `useParallax` 在 `matchMedia('(prefers-reduced-motion: reduce)')` 命中时**直接跳过观察/直接置 `is-in`**，不产生任何位移。

### 3.2 只动 `transform` / `opacity`

- 位移：一律 `transform: translate/scale`。
- 浮现：一律 `opacity`（遮罩、clip 可选）。
- **禁止**动画 `width/height/top/left/margin`（触发 layout）；**避免**高频动画 `box-shadow/background-color`（触发 paint）——阴影加深用「静态阴影切换 + `transition-shadow`」一次性低频可接受，但 marquee/parallax 循环里绝不出现。
- `will-change` 只加在**循环动画**上（marquee 轨道、抽屉、视差图），且数量受控（≤3–4 个），其余元素不加，避免内存膨胀。

### 3.3 不阻塞首屏（LCP / INP）

- **Hero 入场用纯 CSS**（`@keyframes`），不依赖 JS 执行完；文字/图在 DOM 中即时存在，动画不延迟 LCP（`opacity` 动画不影响布局与首屏可交互）。
- **scroll-reveal 渐进增强**：初始隐藏态只在 `<html class="js">` 下生效（inline script 于 `<head>` 尽早写入），JS 失败/被禁则内容全可见。
- **hero 图保持 `priority` + `fetchpriority="high"`**（现有已 `priority`）；reveal 区图片 `loading="lazy"` + `decoding="async"`。
- 观察器阈值 `0.15`、`rootMargin: 0px 0px -10% 0px`、触发一次即 `unobserve`，避免常驻监听与反复回调。
- 移动端**关闭视差**（`pointer: fine` 判定），保留淡入。

---

## 4. 可复用实现：`useReveal` Hook

### 4.1 接口

```ts
// src/hooks/useReveal.ts
export type RevealVariant = "up" | "fade" | "left" | "right" | "clip";

export interface RevealOptions {
  once?: boolean;        // 默认 true（只触发一次）
  threshold?: number;    // 默认 0.15
  rootMargin?: string;   // 默认 "0px 0px -10% 0px"
  delay?: number;        // stagger 延迟 ms，写入 --reveal-delay
  variant?: RevealVariant; // 默认 "up"
}

export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {}
): React.RefObject<T | null>;
```

配套的组件封装（页面里更顺手的写法）：

```tsx
// src/components/Reveal.tsx
import { useReveal } from "@/hooks/useReveal";
export function Reveal({ as: Tag = "div", variant = "up", delay = 0, className = "", children, ...rest }) {
  const ref = useReveal<HTMLDivElement>({ variant, delay });
  return <Tag ref={ref} data-variant={variant} className={`reveal ${className}`} {...rest}>{children}</Tag>;
}
```

### 4.2 关键实现思路

```ts
import { useEffect, useRef } from "react";

export function useReveal<T extends HTMLElement = HTMLDivElement>(options: RevealOptions = {}): React.RefObject<T | null> {
  const { once = true, threshold = 0.15, rootMargin = "0px 0px -10% 0px", delay = 0, variant = "up" } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--reveal-delay", `${delay}ms`);
    el.dataset.variant = variant;

    // 无障碍：reduced-motion 下直接可见，跳过观察
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-in");
      return;
    }

    // 视口内即先置位（防「已滚到但没触发」的等待）
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            if (once) io.unobserve(e.target);
          }
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin, delay, variant]);

  return ref;
}
```

**要点：**
- 单一 `IntersectionObserver` 无需共享（每元素一个开销可接受，但如需极致可抽全局 singleton）；触发即 `unobserve`（`once`）。
- 延迟用 CSS 变量 `--reveal-delay` 注入，`transition-delay` 消费，避免 JS 里维护 setTimeout。
- `data-variant` 与 `.reveal[data-variant=…]` 对应，切换方向不改 JS。
- SSR 安全：所有副作用在 `useEffect`（仅客户端）。

### 4.3 `useParallax`（视差，可选 Tier B）接口

```ts
export function useParallax<T extends HTMLElement>(speed: number): React.RefObject<T | null>;
// 内部：rAF 循环读 scrollY，写 el.style.transform = translate3d(0, offset*speed, 0)
// 守卫：reduced-motion 或 !matchMedia('(pointer: fine)') 直接 return 不启动
```

---

## 5. 对现有动效评分（100 分制）与 P0/P1 清单

### 5.1 评分：**40 / 100**

| 维度 | 现状 | 得分 |
| --- | --- | --- |
| 基线（`transform/opacity` 意识、`prefers-reduced-motion`、`scroll-behavior:smooth`） | 已有，但 reduced-motion 是粗粒度全局停动 | 12 / 15 |
| 微交互（按钮/卡片 hover） | 有 `hover:-translate-y`、`scale-105`、`transition-all duration-200 ease-out`，但**缓动全是 Tailwind 默认**、无节奏分层 | 10 / 20 |
| Scroll-Reveal / Hero 入场 | **完全没有**，页面一刷全屏直出 = 最大「PPT 感」来源 | 0 / 25 |
| 品牌叙事动效（视差/文字浮现/marquee） | **完全没有** | 0 / 20 |
| 购物车抽屉 / 加购反馈 | 抽屉 `return null` **无进出场**；按钮无 added 态；角标无 pop | 3 / 15 |
| 路由过渡 / 图片 hover 质感 | 路由无过渡；图片只有单一 200ms 缩放 | 5 / 15 |

**判语：** 现状是「有过渡、无动效」——交互过渡零星存在但无统一缓动/时长，叙事与反馈动效几乎为零，整体停在「静态页面 + 少量 hover」，距离 editorial 质感还差一整套 reveal + 反馈体系。

### 5.2 P0（本周必做，先立骨架）

1. **动效 token 化**：`globals.css` 加 `--ease-*` 缓动 + `@keyframes`（`fade-up` / `marquee` / `pop` / `page-enter`），并删除散落的 `transition-all duration-200 ease-out` 硬编码，统一走语义类。
2. **`useReveal` + `<Reveal>` + `.reveal`**（§4），并给首页各 section、`ProductGrid` 卡片（stagger）、Collections/About 列表接入 —— 这是「去 PPT 感」的最大单项。
3. **Hero 入场** stagger fade-up（纯 CSS，§2.1）。
4. **购物车抽屉进出场**（§2.6，`data-open` + 挂载管理）—— 交互质感的关键短板。
5. **加购反馈**（按钮 added 态 + 角标 pop，§2.6）。

### 5.3 P1（下一迭代，锦上添花）

6. **商品卡 hover 质感升级**：慢缩放 + 暖遮罩 + 快速加购滑入（§2.3）。
7. **Marquee 标语条**（§2.5，slogan/系列名）。
8. **品牌叙事区**：Story 标题 masked reveal + Lookbook 错速视差（§2.4）。
9. **路由过渡** `template.tsx`（§2.7）。
10. **统一图片 hover**（`ImageReveal` 组件，商品放大 / 品牌去缩放，§2.8）。

---

## 6. 技术选型说明：为什么不引入 framer-motion（取舍）

| 方案 | 结论 |
| --- | --- |
| **CSS + IntersectionObserver（本 spec 采用）** | 覆盖 95% 需求（reveal / hover / marquee / 抽屉 / 入场 / 路由淡入）。零依赖、包体不变、可被 `prefers-reduced-motion` 与渐进增强干净控制，符合「克制优雅」。 |
| **framer-motion（Motion）** | 仅当后续需要**布局动画/共享元素过渡**（如商品卡→详情图 morph、可拖拽底部 sheet、画廊手势）时再引入；届时用 `LazyMotion` 按需加载，避免 ~30–40KB gzip 常驻包体。**首期收益不足以覆盖成本。** |
| **View Transitions API** | 与 framer-motion 同为「后续」选项，做路由共享元素过渡用，暂不启用实验开关。 |

---

## 附：落地文件对照（实现时按此改）

| 文件 | 动作 |
| --- | --- |
| `src/app/globals.css` | 加 `@theme`（缓动 + `@keyframes`）、`.reveal` / `.mask-line` / `.cart-drawer` / `.cart-overlay`、细化 `prefers-reduced-motion` |
| `src/app/[locale]/layout.tsx` | `<head>` 内联 `document.documentElement.classList.add('js')`（尽早） |
| `src/hooks/useReveal.ts`（新建） | `useReveal` + `useParallax`（§4） |
| `src/components/Reveal.tsx`（新建） | `<Reveal>` 封装 + `<Marquee>` + `<ImageReveal>` |
| `src/app/[locale]/page.tsx` | Hero stagger 入场、各 section 接 `<Reveal>`、插 marquee |
| `src/components/product/ProductGrid.tsx` / `ProductCard.tsx` | 卡片 stagger、hover 质感升级 |
| `src/components/cart/CartDrawer.tsx` / `CartProvider.tsx` / `AddToCartButton.tsx` / `CartButton.tsx` | 抽屉进出场、加购态、角标 pop |
| `src/app/[locale]/template.tsx`（新建） | 路由入场淡入 |
| `src/app/[locale]/about/page.tsx`、`collections/*` | 接 `<Reveal>` 与图片 hover 质感 |

> 落地实现遵循 `AGENTS.md`：先 `pnpm exec openspec` 提 spec delta（若属行为变更），组件改动配 TDD（`Reveal`/`useReveal` 的挂载与 `is-in` 语义可用 Testing Library 断言 class），`pnpm test` / `pnpm typecheck` / `pnpm lint` 全绿后再提交。
