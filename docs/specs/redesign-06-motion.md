# PLAYCORE 凭空幻想 · 深化动效规格（Motion Deep-Dive Spec）

> 文档编号：`redesign-06-motion.md` · 归属：网站动画专家
> 版本：v1.0 · 状态：待评审（Draft for Review）
> 输入：`docs/specs/redesign-03-animation.md`、`src/app/globals.css`、`src/components/layout/Header.tsx`、`src/hooks/useReveal.ts`、`src/components/Reveal.tsx`、`src/app/[locale]/page.tsx`、`src/app/[locale]/layout.tsx`
> 对齐：dogguo.com 抓取实证 —— ① header `isWindowScrolled` 透明→实底 + 文字黑白切换（sticky 跟随）；② SHOP 下拉子菜单带过渡；③ 一屏一 section 的 full-screen 大图 + 滚动揭示。
> 关系：`redesign-03-animation.md` 是「动效骨架」（token + reveal 体系 + 抽屉 + marquee），本文是「深化」（header 跟随 + 下拉 + 逐屏揭示）。两者不冲突，token 与缓动**完全复用** 03 号文档的 `--ease-*`。

---

## 0. 结论先行

- **评分：56 / 100**（详见 §4）。03 号文档的骨架已落地（`--ease-*`、`.reveal`、`useReveal`、`Marquee`、抽屉、`page-enter` 均已存在并接入首页），但 dogguo 三大核心动效**三缺三**：header 无滚动跟随、无下拉子菜单、首页 section 不是 full-screen 逐屏结构。
- **本文三个交付**：① sticky header 透明→实底 + 文字黑白切换（阈值 `scrollY > max(100, 80vh)`）；② SHOP 下拉进出场（`200ms` 淡入上移）；③ 叙事 section 升级 `min-h-svh` 全屏大图 + 内容 `reveal` 逐次浮现。

---

## 1. Sticky Header 滚动跟随（透明→实底 + 文字黑白切换）

### 1.1 现状与问题

- `Header.tsx` 是 **async server component**（`export async function Header()`），当前固定 `sticky top-0 z-40 border-b border-cream-line bg-cream/85 backdrop-blur`，**无滚动状态**、**无下拉**。
- 现状 header 永远是「奶油实底 + 黑字」，压在 hero 上会**挡住大图、破坏沉浸感**；hero 上需要的是「透明白字 header」。

### 1.2 目标两态

| 状态 | 触发 | header 背景 | 边框 | 前景（logo / nav / cart / lang） |
| --- | --- | --- | --- | --- |
| **态 A · 顶部** | `scrollY ≤ 阈值`，压在 hero 上 | `transparent`（或极淡 `ink/0→透明`） | `transparent`（无下边线） | `cream`（白字） |
| **态 B · 滚动后** | `scrollY > 阈值` | `color-mix(in srgb, var(--color-cream) 85%, transparent)` + `backdrop-blur` | `border-b border-cream-line` | `ink`（黑字） |

> 对照 dogguo：hero 上透明白字，滚过 hero 变实底黑字，header 全程 `sticky` 跟随不消失。这是「跟随滑动」的完整语义，不是单纯换背景。

### 1.3 触发阈值（建议）

- **推荐：滚过 hero 的 80% 高度**。等价 JS：`scrolled = scrollY > Math.max(100, window.innerHeight * 0.8)`。
  - `100px` 下限兜底：极矮视口/横屏时不会因 `80vh` 过小而在首帧就误触发。
  - `80vh` 主阈值：hero 为 `min-h-[88vh]`，滚到 80vh 时 header 已离开 hero 视觉重心（标题/CTA 区），此时切换不会在「文字最亮处」突然闪成白底。
- **可选更稳**：用 IntersectionObserver 观察 hero 底部的「哨兵」，感知真实 hero 高度（见 1.4-B）。

### 1.4 React 实现思路（两种，推荐 A）

> 关键点：`Header` 目前是 server 组件（需要 `getTranslations`），不能直接 `useState`。正确拆法：**server 外壳保留翻译 + 渲染 client 内核**。

```
src/components/layout/Header.tsx       (server，保留 getTranslations，只负责取词)
  └─ 渲染 <HeaderShell> …nav/logo/cart/lang 作为 children 传入… </HeaderShell>

src/components/layout/HeaderShell.tsx  ("use client"，持有 scrolled 状态，渲染 <header data-scrolled>)
```

**方案 A —— scroll listener + state（推荐，自足、无跨组件协调）**

```tsx
// HeaderShell.tsx
"use client";
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // 阈值：滚过 hero 80vh，下限 100px
        setScrolled(window.scrollY > Math.max(100, window.innerHeight * 0.8));
      });
    };
    onScroll(); // 首帧立即校正（刷新落在页面中段时 header 直接呈实底态）
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); };
  }, []);
  return <header data-scrolled={scrolled || undefined} className="site-header sticky top-0 z-40 border-b">
    {children}
  </header>;
}
```

- `rAF` 节流 + `passive: true`，每次滚动只写一次 state（布尔值变化才触发重渲染），INP 友好。
- `data-scrolled={scrolled || undefined}`：false 时不输出属性，避免 SSR/CSR 首帧 `data-scrolled="false"` 造成样式闪现。

**方案 B —— IntersectionObserver 哨兵（更稳，感知真实 hero 高度）**

- 在 hero 底部（或 `top: 80vh`）放一个 1px 哨兵 `<div ref={sentinelRef} aria-hidden />`；header 观察它，哨兵滚出视口顶部即 `setScrolled(true)`，滚回即 false。
- 因为 header 在 `layout`、hero 在 `page`，二者解耦：哨兵由页面渲染并带上 `data-hero-sentinel`，`HeaderShell` 在 `useEffect` 里 `document.querySelector('[data-hero-sentinel]')` 后 `io.observe`。或简化：哨兵绝对定位在 `<main>` 顶部 `top: 80vh`。
- 优点：hero 高度因内容/语言变化时无需重算 px；缺点：多一次跨组件查询，首帧时序要处理（哨兵挂载后才观察）。

> **取舍**：首期用方案 A（`Math.max(100, 80vh)`），代码最少、无时序问题；若日后 hero 做成可变高的大图轮播，再切方案 B。

### 1.5 过渡与前景色切换（CSS）

前景色用 **CSS 变量单点切换**，避免给 logo/nav/cart/lang 每个子元素都写 `data-*` 态：

```css
/* globals.css —— 复用 03 号文档的 --ease-editorial = cubic-bezier(0.16, 1, 0.3, 1) */
.site-header {
  --header-fg: var(--color-cream);            /* 态 A 白字 */
  background: transparent;
  border-color: transparent;
  color: var(--header-fg);
  transition:
    background-color 300ms var(--ease-editorial),
    border-color     300ms var(--ease-editorial),
    color            300ms var(--ease-editorial);
}
.site-header[data-scrolled] {
  --header-fg: var(--color-ink);              /* 态 B 黑字 */
  background: color-mix(in srgb, var(--color-cream) 85%, transparent);
  border-color: var(--color-cream-line);
}
/* 子元素统一吃变量：logo/nav/link/cart/lang 里删掉硬编码 text-ink / text-ink-soft */
.site-header [data-header-fg] { color: var(--header-fg); transition: color 300ms var(--ease-editorial); }
```

- **只动 `background-color` / `border-color` / `color`**（一次性低频切换，300ms），`backdrop-blur` 保持常开（不参与 transition，避免 backdrop-filter 动画的合成开销）。若希望实底更实，态 B 直接 `background: var(--color-cream)`（去掉 `85%` 混合）。
- 子元素里 `text-ink` / `text-ink-soft` 改为 `data-header-fg` 或直接继承 `color`；`LanguageSwitcher` 的 `text-ink-soft`、`CartButton` 图标色同理归一到变量。
- 兜底：`prefers-reduced-motion: reduce` 下 `.site-header { transition: none !important; }`。

### 1.6 对比度注意（hero 顶部 scrim）

hero 大图顶部是 `to-transparent`（较亮），白字 header 压上去可能对比不足。**在 hero 顶部加一条 1/3 高的顶边暗化渐变**（`bg-gradient-to-b from-ink/50 to-transparent`，absolute 置顶、pointer-events-none），保证态 A 白字可读——这是 editorial 大图站的标准手法，dogguo 同理。

---

## 2. 导航下拉子菜单（SHOP 下拉）

### 2.1 结构（桌面 only）

- 现有 nav 是 `hidden md:flex`，移动端无导航；下拉**只在 `md+`**。移动端菜单/drawer 属后续（§4 P1）。
- SHOP 下拉子项（建议，复用现有路由与目录数据）：`All Products`(`/products`) → `Collections`(`/collections`) → 各 `seriesList`(`/collections/<slug>`) → `Coming Next`(`/about#coming`)。子项文案走 `common.nav.*` 翻译。

### 2.2 进出场动画（hover 展开 + 200ms 淡入上移）

```css
/* 触发器：<button aria-haspopup="true" aria-expanded> 或 <a>，外层 .group relative */
.submenu {
  position: absolute; top: 100%; left: 0; min-width: 14rem;
  padding: 0.5rem; border-radius: var(--radius-card);
  background: var(--color-paper);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-cream-line);
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  visibility: hidden;
  transition:
    opacity 200ms var(--ease-editorial),
    transform 200ms var(--ease-editorial),
    visibility 0s 200ms;   /* 退场：等淡出完再 hidden，让退场也可见 */
}
.group:hover .submenu,
.group:focus-within .submenu {
  opacity: 1;
  transform: translateY(0) scale(1);
  visibility: visible;
  transition:
    opacity 200ms var(--ease-editorial),
    transform 200ms var(--ease-editorial),
    visibility 0s 0s;      /* 进场：立即 visible */
}
```

**要点：**
- **时长 200ms**（落在用户要求 150–250ms 区间内，与 `duration-200` 档对齐）；缓动 `--ease-editorial`（`cubic-bezier(0.16,1,0.3,1)`），比默认 `ease-out` 更有「定住」感。
- **`visibility` 延迟技巧**：进场 `visibility 0s 0s`（立即可见），退场 `visibility 0s 200ms`（延迟到 opacity/transform 动画结束才 hidden），从而用纯 CSS 同时获得**进出场**动画，无需 JS 管理 mounted。
- **hover 桥**：触发器与面板之间加 8px 隐形 padding（`.group` 与 `.submenu` 之间 `padding-top` 或一个 `h-2` 占位），避免鼠标滑过间隙时 hover 丢失导致闪烁。
- **键盘/无障碍**：`focus-within` 触发 + 触发器 `aria-haspopup="true" aria-expanded={open}` + 面板 `role="menu"`、子项 `role="menuitem"`；方向键切换子项属 P1。
- **退场健壮性**：`prefers-reduced-motion` 下 `.submenu { transition: none; }`（直接显隐，不做位移）。

### 2.3 与 header 态联动

下拉面板是 `bg-paper` 白底，在态 A（透明 header 白字）与态 B（实底黑字）下都成立，无需随 `data-scrolled` 换肤。唯一注意：态 A 时触发器文字是 `cream`，面板是白底，视觉分离清晰。

---

## 3. 每屏一 section 的 Full-Screen 滚动揭示

### 3.1 原则

- **叙事型 section 升级为「一屏一屏」**：hero / 品牌宣言(manifesto) / Shop the look / 未来 IP 等大图叙事块改成 `min-h-svh` + `flex items-center` + 全出血背景图；**每个 section 内内容用 `Reveal` 逐次浮现**。
- **商品/分类网格保持自然高度**（`py-20` 网格区），但仍沿用 `Reveal` stagger——不是所有 section 都该撑满一屏，否则目录页会变成「滚一屏才看 3 张卡」的糟糕体验。
- `min-h-svh`（small viewport height）优先，移动端地址栏收缩时高度稳定；降级 `min-h-screen`。

### 3.2 结构模板

```tsx
<section className="relative flex min-h-svh items-center overflow-hidden">
  {/* 全出血背景：立即渲染，不放进 Reveal（避免白屏闪烁） */}
  <Image src={…} fill priority={false} sizes="100vw" className="object-cover object-center" />
  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
  <div className="grain absolute inset-0 opacity-[0.06]" />

  {/* 前景内容：relative z-10，逐次 reveal */}
  <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
    <Reveal><p className="kicker kicker--on-dark">…</p></Reveal>
    <Reveal delay={80}><h2 className="mt-4 font-display text-4xl text-cream md:text-6xl">…</h2></Reveal>
    <Reveal delay={160}><p className="mt-4 max-w-xl text-cream/80">…</p></Reveal>
    <Reveal delay={240}>…CTA…</Reveal>
  </div>
</section>
```

### 3.3 如何让「每屏滑过去都有动画」

`useReveal`（03 号文档 §4，已实现）默认 `threshold: 0.15`、`rootMargin: "0px 0px -10% 0px"`、`once: true`，已满足「进入视口约 15% 一次性触发」。把 section 改成 `min-h-svh` 后，逐屏滚动的观感即成立：

- **每屏 = 一个 section**：滚动到下一屏，其内容块进入视口 15% 时 `is-in` 触发，`opacity 0→1 + translateY(24px)→0`（`0.7s var(--ease-out)`）逐次浮现。
- **stagger 节奏**：kicker→h2→body→CTA 每级 `+80ms`（写 `delay`），总揭示落在 1s 内、单个元素 0.7s，符合 editorial「慢而笃定」。
- **背景图不 reveal**：全出血背景立即渲染，只让前景文案/CTA reveal；若想整屏「图片先、文字后」的杂志感，可给背景容器再套一层 `<Reveal variant="fade">`（只 `opacity`，无位移）。
- **首屏不等待**：第一屏（hero）内容在 SSR 即存在，`reveal` 的隐藏态只在 `<html class="js">` 下生效（`layout.tsx` 已内联写入），JS 失败/被禁内容直接可见，不挡 LCP。

### 3.4 可选 Tier B：scroll-snap 逐屏吸附

- 若真要做「一屏一停」的 dogguo 感，给包裹容器加 `snap-y snap-mandatory`，每个 section 加 `snap-start`；`scroll-padding-top` 预留 header 高度。
- **注意**：`snap-mandatory` 会夺走自由滚动、可能干扰 INP，移动端 Safari 有滚动卡顿历史。**首期只建议 `snap-proximity`（弱吸附）或完全不用**，用「全屏 section + reveal」已足够表达逐屏感。

---

## 4. 评分（100 分制）与 P0/P1 清单

### 4.1 评分：**56 / 100**

| 维度 | 满分 | 得分 | 现状 |
| --- | --- | --- | --- |
| 动效 token（`--ease-*` + `@keyframes`） | 10 | 10 | ✅ `globals.css` 已有 `--ease-editorial/out/inout/pop` + `fade-up/marquee/pop/page-enter` |
| Scroll-Reveal 体系（`useReveal`/`Reveal`/`.reveal` + stagger） | 15 | 15 | ✅ 已落地，首页各 section、`ProductGrid` 卡片 stagger（+60ms）已接 |
| Hero 入场 stagger | 10 | 2 | ❌ hero 元素无 `animate-fade-up`，仅靠 `page-enter` 整页淡入 |
| **Sticky header 跟随（透明→实底 + 黑白切换）** | 10 | 0 | ❌ header 是 server 组件固定奶油底，无滚动状态 |
| **导航下拉子菜单** | 10 | 0 | ❌ 无下拉，SHOP 是纯链接 |
| **全屏 section 逐屏揭示** | 10 | 4 | ⚠️ 有 reveal，但 section 是 `py-20`/`88vh`，非 full-screen 逐屏 |
| 微交互（抽屉/加购/卡片 hover） | 12 | 9 | ⚠️ 抽屉进出场✅、卡片 hover✅，加购 added 态/角标 pop 缺 |
| 品牌叙事（marquee/masked 文字/视差） | 10 | 6 | ⚠️ `Marquee`✅，文字 masked reveal / 视差未做 |
| 路由过渡 + `prefers-reduced-motion` + 性能 | 8 | 7 | ✅ `template.tsx` + 硬化 reduced-motion 已到位 |
| 无障碍 / 焦点管理 | 5 | 3 | ⚠️ 抽屉有 `dialog`/`aria-modal`，下拉键盘/焦点未做 |

**判语：** 03 号骨架已扎实落地（token + reveal + 抽屉 + marquee），差距集中在「导航层动效」与「逐屏结构」——正是 dogguo 三大抓取实证对应的三块，本文 P0 补齐后可达 ~85/100。

### 4.2 P0（本次必做，对应三大交付）

1. **Sticky header 跟随**（§1）：拆 `Header`/`HeaderShell`，`scrollY > Math.max(100, innerHeight * 0.8)` 切换 `data-scrolled`；CSS `transition: background-color/border-color/color 300ms var(--ease-editorial)`；前景走 `--header-fg` 变量；hero 顶部加 `from-ink/50` 顶边 scrim。
2. **SHOP 下拉**（§2）：`.submenu` `opacity 0→1 + translateY(8px)→0 + scale(0.98)→1`，`200ms var(--ease-editorial)`，`visibility 0s 200ms` 延迟退场 + hover 桥 + `focus-within`。
3. **全屏逐屏 section**（§3）：叙事 section 改 `min-h-svh` + 全出血背景立即渲染 + 内容 `Reveal` stagger（`0/80/160/240ms`）。
4. **Hero 入场 stagger 补上**：hero 的 kicker/h1/sub/CTA 加 `animate-fade-up` + `animationDelay 0/90/180/270ms`（keyframes 已存在，只差在 page.tsx 加 class）。

### 4.3 P1（下一迭代）

5. 加购反馈：`AddToCartButton` added 态（`--ease-pop` 一次回弹）+ `CartButton` 角标 `key={count}` pop。
6. 品牌叙事：Story/manifesto 标题 masked line reveal（`.mask-line`）+ Lookbook 错速视差（`useParallax`，桌面 + reduced-motion 关闭）。
7. 下拉键盘导航（方向键 + Esc 关闭 + 焦点圈）。
8. scroll-snap 弱吸附（`snap-proximity`）实测后决定是否启用。

---

## 5. 落地文件对照（实现时按此改）

| 文件 | 动作 |
| --- | --- |
| `src/components/layout/Header.tsx` | 保留 server 取词，改为渲染 `<HeaderShell>` |
| `src/components/layout/HeaderShell.tsx`（新建） | client：scroll state + `<header data-scrolled class="site-header">` |
| `src/components/layout/NavDropdown.tsx`（新建） | `.group relative` + `.submenu`，SHOP 子项列表 |
| `src/app/globals.css` | 加 `.site-header`（两态 + `--header-fg`）、`.submenu`（进出场）；reduced-motion 补 `.site-header/.submenu { transition: none }` |
| `src/app/[locale]/page.tsx` | hero 加 `animate-fade-up` stagger + 顶边 scrim；叙事 section 改 `min-h-svh` + 全出血背景 + 内容 `Reveal` stagger |
| `src/components/layout/LanguageSwitcher.tsx` / `CartButton.tsx` | 前景色归一到 `--header-fg` |

> 落地遵循 `AGENTS.md`：属行为变更的先 `pnpm exec openspec` 提 delta；`HeaderShell` 的 `data-scrolled` 切换、`NavDropdown` 的 `aria-expanded`/`focus-within` 可用 Testing Library 断言；`pnpm test` / `typecheck` / `lint` 全绿后再提交。
