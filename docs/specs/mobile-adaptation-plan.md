# 移动端适配改造方案（执行版）

> 文档编号：`mobile-adaptation-plan.md` · 归属：本次手机端适配改造技术负责人
> **输入**：手机端 375×812 适配审计 56 条 + 产品视角评审 + 设计视角评审（`docs/specs/redesign-07-mobile.md`）
> **作用域**：只改 **< 1024px**（窄屏）；**≥ 1024px 的表现一律不变**（唯一例外：`ProductCard` 的区域徽章文案在 `sm` 以上仍走原 `regionBadgeLabel`，无变化）。
> 落地纪律：`AGENTS.md` 的 spec-first + TDD。行为变更（吸底条、抽屉关闭、售罄错误、袋子清空）先写 OpenSpec change + 失败测试；纯样式/间距归 `skip_specs: true`。

---

## 0. 前置事实（三份材料交叉核对后的基线，先纠正三个前提）

这三条直接改变排序与验收方式，所有后面的改法都建立在它们之上。

| # | 事实 | 证据 | 对方案的影响 |
| --- | --- | --- | --- |
| **F1** | **线上结算不经过 `/checkout`**。抽屉与 `/cart` 的 Checkout 直接 `POST /api/payments/checkout` → 整页跳 **Shopify 托管结算页** | `src/components/cart/useCheckoutRedirect.ts:80-104`（`provider: "shopify"` 写死）；`src/server/payments/shopify/provider.ts:76-90` 返回 `redirect.url = cart.checkoutUrl` | 手机端**真正的结算面只有购物袋抽屉**。`/checkout` 及其 `success` 是兜底页，审计 #35/#39/#40/#42 大部分落在"成功率≈0 的页"上，P2 |
| **F2** | **`/cart` 页在全站没有任何入口**（grep 只命中注释、`robots.ts:12` 的 disallow、Stripe 的 `cancelUrl`）；Header 的购物袋按钮只开抽屉（`CartButton.tsx` 的 `onClick={open}`） | `grep -rn 'href="/cart"' src/` 零命中 | `/cart` 的修复按"共享组件一致性"处理（步进器/Remove 与抽屉同一套 44px），不按"顾客主路径"排期 |
| **F3** | **站点对外英文单语**（`routing.locales = ["en"]`，`src/i18n/routing.ts`） | 同上文件注释："`messages/zh.json` 与各页面的 `locale === "zh"` 分支刻意保留，现在只是永不执行的死代码" | 审计里以 zh 文案为依据的量化（"逛全部系列 60.5px"、"查看详情 80×38px"）**线上不存在**。en 文案更长 → 问题更重不是更轻。**本方案全部按 en 计算**，zh 分支跟随同一套类名（将来恢复中文自动受益） |
| **F4** | **56 条 ≈ 40 个唯一改动** | 产品侧合并 | `#4=#18=#27`（区域徽章）、`#5=#19=#24=#31`（卡片名截断）、`#7=#48=#49`（UpcomingCard）、`#20=#33`（抽屉步进器）、`#21=#36`（抽屉 vh/安全区）、`#1/#23/#43/#47/#50/#51/#52`（同一个"文字链没有 44px 命中区"模式） |
| **F5** | **`template.tsx` 把页面包在 `animate-page-enter`（`fill-mode: both`）里**，终态保留 `transform: translateY(0)`，使该包裹层成为 `fixed` 的 containing block | `src/app/[locale]/template.tsx`；`globals.css:80-84`（`--animate-page-enter: page-enter 0.3s var(--ease-inout) both`） | 吸底购买条**必须用 `sticky`（或 Portal / 放 layout），不能用 `fixed`**——这正是 `bag-charm/TeaserProductGrid.tsx` 的 quick-view 被迫用 `fixed inset-0` 却仍能工作的原因（它的祖先链上没有这个 transform，但页面内容在 `<main>` 内，PDP 的条会被 `<main>` 的 transform 干掉） |

**主链路（唯一需要保证"一定能买成"的路径）**

```
首页/列表 → PDP（标题+价格+加购）→ 加购 → 购物袋抽屉（自动打开）→ 改数量 → Checkout
   → /api/payments/checkout（provider=shopify）→ window.location.assign(cart.checkoutUrl)
   → Shopify 托管结算页（收地址 + 付款）→ 回到本站信号 → 袋子必须为空
```

审计里 56 条中影响这条路的只有 **8 条**（#14 #20 #32 #33 #36 #37 + 2 条审计未发现的），它们是 P0。

---

## 1. 统一规范表（< 1024px）与"在哪一层实现"

### 1.1 规范表

**版心（左右边距）= 16px**——不改成 20/24。375px 下 343px 是唯一还放得下 2 列商品卡的宽度（每卡 163.5px）；加大边距会同时恶化 4 条截断问题。

| 项 | 375px | ≥768px (`md`) | ≥1024px (`lg`) | 实现类 | 在哪一层 |
| --- | --- | --- | --- | --- | --- |
| **版心 / 左右边距** | **16px**（内容 343px） | 8%（92%） | 8% | `.container-site` | `globals.css` @layer components（**唯一来源**） |
| 阅读宽度上限（表单 / 政策正文 / hero 标题） | 不限，走 `.container-site` | — | — | `max-w-5xl` / `max-w-[68ch]` / `max-w-3xl` | **页面内层**（写在 `.container-site` 里，**不准再自带 `px-*`**） |
| **section / 页面壳 padding-y** | **48** | 80 | 112 | `.section-y`（`py-12 md:py-20 lg:py-28`） | `globals.css` @layer components（**唯一来源**） |
| 相邻 section 交界 | **96**（原 160） | 160 | 224 | 由 `.section-y` 相加得出 | 同上 |
| 区块内主间距（标题 ↔ 内容） | **24** | 40 | 40 | `mb-6 md:mb-10` | 页面 |
| 同一 section 子块间距 | **40** | 64 | 64 | `mt-10 md:mt-16` | 页面 |
| 页头之后首块 | **32** | 64 | 64 | `pt-8 md:pt-16` | 页面 |
| **字号：封面 H1**（About / 系列 hero） | **48**（**不缩**） | 72 | 72 | `text-5xl md:text-7xl` | 页面 |
| **字号：页面 H1**（PDP / 列表 / 购物袋 / 结算 / FAQ / 政策 / bag-charm） | **36** | 48 | 48 | `text-4xl md:text-5xl` | 页面 |
| **字号：section H2**（所有区块标题） | **30** | 30→48 流式 | 48 | `clamp(30px, …, …)` / `text-3xl md:text-5xl` | 页面（下限统一 30） |
| 字号：小节 H3 | **24** | 30 | 30 | `text-2xl md:text-3xl` | 页面 |
| 字号：正文 / 表单 / 商品名 | **16** | 16 | 16 | `text-base` | 页面 |
| 字号：辅助（价格 / 导航 / 说明） | **14** | 14 | 14 | `text-sm` | 页面 |
| 字号：caps 标签 / 徽章 / kicker（非交互） | **11** | 11 | 11 | `.kicker`（`0.6875rem`） | `globals.css`（既有 token） |
| 字号：交互式 caps（tab / 小 CTA 文字） | **12** | 12 | 12 | `text-xs` | 页面 |
| **绝对下限** | **11px（无例外）** | 11 | 11 | — | 全站断言（§6 验收 4） |
| **商品网格**（全站所有场景） | **2 列**，x 16 / y 40 | x 24 | x 32 | `grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8` | 组件（`ProductGrid` / 首页两处 / PDP related） |
| 资讯副卡 2×2 | 2 列 / gap 16 | — | — | `grid-cols-2 gap-4`（不动） | `NewsGrid.tsx` |
| 后续计划卡 | 1 列 / gap 24 | 2 列 | 2 列 | `grid-cols-1 gap-6 md:grid-cols-2`（不动） | `page.tsx` |
| **名册圆头像** | **4 列** / gap 12 | 8 列 / gap 12 | 12 列 | `grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-12` | `page.tsx` |
| **PDP 同系列缩略图** | 横滑（不换行）/ gap 10 | 同 | 同 | `.hscroll mt-3 gap-2.5 pb-2` | `globals.css` + PDP 页面 |
| **联名 14 形象** | 4 列 / gap 16 | 7 列 | 7 列 | `grid-cols-4 gap-4 sm:grid-cols-7`（需 4×4 素材，见 §3 E1） | `page.tsx` |
| **点击目标：独立控件** | **≥44×44** | 同 | 同 | `h-11 w-11` / `min-h-11` / `h-12`（主 CTA） | 组件 |
| **点击目标：行内文字链** | 高度 **≥44**，宽度随文字 | 同 | 同 | `.tap-target`（`inline-flex min-h-11 items-center`） | `globals.css` @layer components |
| 需要"视觉行高完全不动"的行内链接 | 同上 | 同 | 同 | `.tap-target--quiet`（`padding-block:.75rem; margin-block:-.75rem`） | `globals.css` @layer components |
| 段落内联链接（政策正文 `<p>` 里） | **24×24**（WCAG 2.5.8 AA） | 同 | 同 | 无需改动 | — |
| 相邻目标间距 | **≥8px** | 同 | 同 | 名册 `gap-3`(12) / tab `gap-6`(24) ✓ | — |
| 浮层高度 | **`h-dvh`**（`h-full` 兜底） | 同 | 同 | `h-dvh` | 组件 |
| 浮层底部安全区 | `calc(1rem + env(safe-area-inset-bottom))` | 同 | 同 | `.safe-b` / `.safe-t` | `globals.css` @layer components |
| 横滑容器 | 吸附 + 两端渐隐 + 隐藏滚动条 | 同 | 同 | `.hscroll` | `globals.css` @layer components |

**两条机械规则（取代逐条拍脑袋）**

1. **所有 `clamp()` 的下限 = 上表对应档位的值。** 审计里 20/22/24/26/30 的混乱收敛为**一个 section 字号 30**；页面 H1 统一 36；`#54` 的"About 48 vs FAQ 28 差 71%"用**把 FAQ 抬到 36**解决，不是把 About 压到 28——**救小字，不砍大字**。
2. **所有 `cqw` / `vw` 字号必须带下限。** 写法 `text-[max(11px,4.84cqw)]` 或 `text-[clamp(11px,…,20px)]`，治"窄屏线性缩水到 7.91px / 9px"那一整类（`NewsGrid` 副卡、`UpcomingCard`、`HeroCarousel` 的 kicker/CTA）。

### 1.2 在哪一层统一实现（这是本方案的核心结构决定）

**七件事加到 `globals.css` / layout，剩下才是页面级工作**：边距、节奏、字阶下限、命中区、安全区、横滑、CSS 规则。56 条里 **39 条（70%）**由这一层一次性覆盖。

| 统一层 | 落点 | 一次性覆盖的审计条目 |
| --- | --- | --- |
| `globals.css` @layer components 新增 6 个类 | `.section-y` / `.tap-target`(`--quiet`) / `.hscroll` / `.safe-b`(`.safe-t`) | 1,2,12,13,15,20,23,25,26,30,31,33,34,39,43,46,47,50,51,52,53 |
| `globals.css` 2 处规则修复 | `.js .reveal[data-variant="left"]:not(.is-in)`；`.link-line:active::after` | 44；26/23 的触屏反馈 |
| `src/app/[locale]/layout.tsx` 新增 `export const viewport` | `viewportFit: "cover"`（否则 `env(safe-area-*)` 恒为 0） | 21,36,32,53 |
| 新增 `src/hooks/useScrollLock.ts`（三个浮层共用） | `html { overflow: hidden }` | 37,53 |
| header 写回真实 `--header-h`（`ResizeObserver`）+ promo 条定高 | `Header.tsx` | 29 |
| 9 个页面根容器换 `.container-site` + `.section-y` | 逐页一句替换 | 22,28,38,56,30,39,40,46 |

**不新增任何字号 / 间距 / 颜色 / 圆角 / 缓动**：16px←`.container-site`；48/80/112←Tailwind 4px 基（今天已在用）；36/30/16/14←`redesign-02 §2.3` 原文；11px←`.kicker`；44px←`02-ux-spec §5.2`；`h-dvh`←`redesign-06 §3`。

---

## 2. 问题 → 改法逐条映射（按模块分组，合并同类项）

分组原则：**一个分区 = 一组文件 = 一种根因**。标注 ✱ 表示"由 §1 的统一规范层（`globals.css` / layout / 共用组件）覆盖"，不需要逐条手改。

### A. 全局基础设施（`globals.css` + layout + 新 hooks）— 覆盖 39 条

| 条目 | 文件:行 | 改前 → 改后 | 根因归属 |
| --- | --- | --- | --- |
| 新增 `.section-y` | `src/app/globals.css`（`@layer components`，紧邻 `.kicker`） | 新增：`padding-block:3rem` / `@media(md){5rem}` / `@media(lg){7rem}` | ✱ RC-2 统一 |
| 新增 `.tap-target` / `.tap-target--quiet` | 同上 | 新增：`display:inline-flex;align-items:center;min-height:2.75rem` / 加 `padding-block:.75rem;margin-block:-.75rem` | ✱ RC-4 统一（14 条共用一招） |
| 新增 `.hscroll` | 同上 | `display:flex;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:none` + 两端 `mask-image` 12px 渐隐；`.hscroll::-webkit-scrollbar{display:none}`；`.hscroll>*{flex:none;scroll-snap-align:start}` | ✱ RC-6 统一（3 条） |
| 新增 `.safe-b` / `.safe-t` | 同上 | `padding-bottom:calc(1rem + env(safe-area-inset-bottom))` / `padding-top:calc(1rem + env(safe-area-inset-top))` | ✱ RC-7 统一 |
| **#44 永久位移** | `globals.css:316-317` | `.js .reveal[data-variant="left"] { transform: translateX(-24px) }` → `.js .reveal[data-variant="left"]:not(.is-in) { … }`（right 同理） | ✱ RC-10（3 行，必带） |
| **#23/#26 触屏无反馈** | `globals.css:195` | 追加 `.link-line:active::after { transform: scaleX(0); }` | ✱ RC-4 附带 |
| **#21/#36/#32/#53 viewport** | `src/app/[locale]/layout.tsx`（无 `viewport` 导出处） | 新增 `export const viewport: Viewport = { width:"device-width", initialScale:1, viewportFit:"cover" }` | ✱ RC-7 |
| **#37/#53 滚动锁** | 新增 `src/hooks/useScrollLock.ts`（参照 `src/hooks/useReveal.ts` 的写法与测试风格） | 新增 `useScrollLock(open: boolean)`：`document.documentElement.style.overflow='hidden'`，卸载还原 | ✱ RC-7 三处共用 |
| **#3 副卡胶囊 7.91px** | `src/components/home/NewsGrid.tsx:96` | `text-[4.84cqw]` → `text-[max(11px,4.84cqw)]` | ✱ RC-3（规则 2） |
| **#10 主卡大标溢出** | `NewsGrid.tsx:66` / `:62` | 字号**不缩**：`px-[14%]` → `px-[8%] sm:px-[14%]`；同时 `text-[9.59cqw]` → `text-[max(30px,9.59cqw)]` | ✱ RC-3（改文字框，不改字号） |
| 主卡徽章 / CTA 同样带下限 | `NewsGrid.tsx:63` / `:71` | `text-[4.77cqw]` → `text-[max(11px,4.77cqw)]`；`text-[4.65cqw]` → `text-[max(11px,4.65cqw)]` | ✱ RC-3 |
| **#7/#48/#49 UpcomingCard** | `src/components/home/UpcomingCard.tsx:59,64,67` | `clamp(9px,2.40cqw,35px)`→`clamp(11px,2.40cqw,35px)` + `min-h-[18px]`→`min-h-[20px]`；`clamp(20px,6.21cqw,90px)`→`clamp(24px,6.21cqw,90px)`；`clamp(10px,2.15cqw,31px)`→`clamp(12px,2.15cqw,31px)` | ✱ RC-3 |
| **#48 文字压插画（About 那张）** | `UpcomingCard.tsx:53,58,67` | `<640px`：插画 `left-[33%] w-[72.1%]` → `left-auto right-0 w-[58%]`；文字块 `w-fit` → `max-w-[46%] sm:max-w-none`；tagline 保持常显 | 特例（构图，窄屏专有） |
| 横滑三处接入 `.hscroll` | `CategoryTabs.tsx:26`；PDP `:106`；`Marquee.tsx:10` | 见 §2 B / F；`Marquee` 额外 `motion-reduce:whitespace-normal motion-reduce:text-center` + 第二份 `motion-reduce:hidden` | ✱ RC-6 |

### B. 全局框架（Header / CategoryTabs / Marquee）

| 条目 | 文件:行 | 改前 → 改后 | 根因 |
| --- | --- | --- | --- |
| **#29 header 高度跳变 15.1px + 分类条被盖 17.4px** | `src/components/layout/Header.tsx`（`<header>` 元素加 ref） | 新增 `ResizeObserver` 把实测高度写入 `document.documentElement.style.setProperty("--header-h", h+"px")`；promo 条同时固定 2 行高：`min-h-10` 的外层改 `h-[42px] overflow-hidden`，内层 span 加 `line-clamp-2`（保守替代方案；两者只做其一即可，**推荐 ResizeObserver**，视觉零变化） | ✱ RC-2 |
| **#25/#26/#29 分类条** | `CategoryTabs.tsx:24,26,30,43` | `:26` `no-scrollbar container-site flex items-center gap-6 overflow-x-auto py-4` → `hscroll container-site gap-6`；`:30/:43` 链接加 `.tap-target`（命中 16px → 44px）；新增客户端 `useEffect` 对 `[aria-current="page"]` 调一次 `scrollIntoView({inline:"center", block:"nearest"})`（需把 `CategoryTabs` 拆出一个小客户端子组件，或整文件加 `"use client"`——选后者，它没有服务端专有逻辑） | ✱ RC-4 / RC-6 |
| **#13 Marquee** | `src/components/Marquee.tsx:10-16` | 容器加 `motion-reduce:whitespace-normal motion-reduce:text-center`，内层 `flex w-max animate-marquee gap-8` 加 `motion-reduce:block motion-reduce:w-full`，第二份内容加 `motion-reduce:hidden`；**不做**审计建议的"改成可横滚 + 换行"两套（`overflow-x-auto` 与 `whitespace-normal` 互斥，且 `redesign-07 §1.7` 已定为"只补 reduced-motion 回退"） | ✱ RC-6 特例 |
| **p1-7 newsletter 输入框 14px 触发 iOS 整页缩放** | `src/components/newsletter-form.tsx:54` | `… px-5 py-3 text-sm outline-none …` → `… px-5 py-3 text-base outline-none md:text-sm …`（全站唯一留资表单；`checkout` 的输入框已是 `text-base`，安全） | 产品侧 §3.5：iPhone Safari 聚焦即缩放 |
| **#9 名册 6 列** | 见 §2 C（首页模块，与 #6 合并） | — | — |

### C. 首页（`src/app/[locale]/page.tsx` + `home/*` + `HeroCarousel`）

**统一规范覆盖部分（一次替换）**

| 条目 | 文件:行 | 改前 → 改后 |
| --- | --- | --- |
| ✱ #12 五处 160px 空白 | `page.tsx:76,119,187,248,269,283` | `py-20 md:py-28` / `py-20` → `section-y`（48/80/112）。**注意**：`:76/:119/:187` 三个 section 带 `<Image fill className="object-contain object-top">` 满幅底图，`padding` 同时决定底图缩放——改完必须附 **375px 截图对比底图水印位置**，不允许水印压到标题上；其余（`:248/:269/:283` 无底图）直接改 |
| 首页内 `mt-16` 两块间距（`:147/:159`） | `mt-16` → `mt-10 sm:mt-16` |
| ✱ #1 三处 CTA 命中区 15.4/19.1px | `:87` `link-line mt-5 inline-block …` → 加 `.tap-target` 并去掉 `inline-block`；`:129` `link-line text-sm` → 加 `.tap-target`；`:257` `focus-ring link-line mt-4 inline-block text-sm` → 加 `.tap-target` |
| ✱ #2 查看详情胶囊 38px | `:236` `h-[clamp(38px,6.31vw,124px)]` → `h-[clamp(44px,6.31vw,124px)]` |
| ✱ #1 的字号下限 | `:87` `clamp(11px,1.11vw,24px)` → `clamp(12px,1.11vw,24px)`（交互式 caps）；`:202` 同改 `clamp(12px,…)` |
| ✱ #11 上级比下级小 | `:82` `clamp(20px,2.49vw,54px)` → `clamp(30px,2.49vw,54px)`；`:205` `clamp(22px,…)` → `clamp(30px,3.14vw,68px)`；`:226` `clamp(20px,…)` → `clamp(30px,3.91vw,84px)`；`:251` `clamp(26px,…)` → `clamp(30px,2.4vw,48px)`；`:273` `clamp(24px,…)` → `clamp(30px,2vw,40px)`；`:285` `clamp(26px,…)` → `clamp(30px,2.53vw,81px)`。`:121`（已是 30）、`:126`（`text-2xl md:text-3xl`=24）、`:230`（句读 → `clamp(14px,1.99vw,42px)`）按表微调 |
| **#6/#9 名册无可见名 + 43.83px** | `page.tsx:164-177` | 栅格 `grid-cols-6 gap-4 sm:grid-cols-8 sm:gap-3 lg:grid-cols-12` → `grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-3 lg:grid-cols-12`；`<Link>` 由单圆改为 `flex flex-col items-center gap-1.5`；圆挪进 `span.aspect-square w-full max-w-16`；**新增常显标签** `<span className="w-full truncate text-center text-[11px] leading-tight text-ink-soft">{name}</span>`（覆盖 RC-4 的"hover/`title` 不是唯一通路"）。375px 单元 = (343−3×12)/4 = **76.75px** |
| **#8 联名 14 形象 49px** | `page.tsx:262-265` | **本方案保留整图**，窄屏不做拆图（理由见 §3 E1）；如素材就绪则 `img` → `.hscroll` 横滑（14 格每格 ≥ 现 49px，加吸附与渐隐提示）——**默认不做**，列为可选项 |

**首页 hero（审计未发现，P1-1）**

| 条目 | 文件:行 | 改前 → 改后 |
| --- | --- | --- |
| 5 屏里只有 3 屏有 CTA | `src/components/home/HeroCarousel.tsx:88-101`（`hero-brand` / `hero-promo` 两屏无 `href`） | 品牌屏与促销屏**整屏可点**：`src/lib/content.ts` 给 `heroSlides[0]` / `[1]` 补 `href`，`HeroCarousel` 在 `s.promo` / `s.wordmark` 分支外层包 `<Link href={s.href} className="absolute inset-0 block" aria-label={…}>`；已有的内部 `onClick={(e)=>e.stopPropagation()}`（`:118`）保证不冲突 |
| 指示条 42×2.8px 却是 `role="tab"` + onClick | `HeroCarousel.tsx:221-233` | 视觉不变，加伪元素扩命中区：`after:absolute after:inset-x-0 after:-top-5 after:h-[calc(100%+2.5rem)] after:content-['']`（**只向上扩**——条在 89.8%，向下扩会与 84.8% 的箭头抢命中区；按钮自身 `top-0 h-full` 不动）。**不**把 2.8px 条加高（会破坏 PSD 构图）。验收：条中心上方 20px 处派发真实 touch → `aria-selected` 变化（`getBoundingClientRect()` 量不到伪元素） |
| 左右箭头 20×20px | `:262/:270` | `h-[clamp(20px,2.7cqw,38px)] w-[…]` → `h-[clamp(44px,2.7cqw,48px)] w-[clamp(44px,2.7cqw,48px)]`（窄屏 44，`lg` 仍 30–48） |
| CTA 24px 高 / 9px 字 | `:112-116` | `h-[2.6cqw] min-h-[24px]` → `min-h-[44px]`；`text-[clamp(9px,1.24cqw,18px)]` → `text-[clamp(12px,1.24cqw,18px)]`（`lg:` 用原值，避免桌面变高：加 `lg:h-[2.6cqw] lg:min-h-0`） |
| kicker / 促销语下限 | `:51` `clamp(11px,2.46cqw,36px)` | 已是 11 下限，保留 |
| hero 高度 | `:174` `aspectRatio: "3250 / 2041"` | **不动**（redesign-07 §3 保留项 2：不为露出下一屏裁切 hero） |

### D. 商品卡（`ProductCard.tsx`，一个文件吃掉 6 条审计）

`#4=#18=#27` 与 `#5=#19=#24=#31` 合并后 **3 处改动**：

| 条目 | 文件:行 | 改前 → 改后 | 理由 |
| --- | --- | --- | --- |
| **#4/#18/#27 区域徽章折行 + 9px** | `ProductCard.tsx:71-76` | `absolute right-2 top-2 flex items-center gap-1 bg-[#c8102e] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white` → 保持红底与位置，改：`… gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white max-w-[calc(100%-1rem)] whitespace-nowrap overflow-hidden`；文案窄屏缩短（见下） | 9px 低于可读下限；`AVAILABLE IN THE U.S. ONLY` 在 155.5px 卡宽下**每一种国家都折 2 行**（92–110% 卡宽） |
| ↳ 短文案 | `ProductCard.tsx:74` | `{flagEmoji(product.badge)} {regionBadgeLabel(product.badge, locale)}` → `<span className="sm:hidden">{flagEmoji(product.badge)} {product.badge} ONLY</span><span className="hidden sm:inline">{flagEmoji(product.badge)} {regionBadgeLabel(product.badge, locale)}</span>`（375px 下 `🇺🇸 US ONLY` ≈ 45px，单行；`sm` 以上**完全不变**） | 完整句留在 `page.tsx:147` 的区域区块标题与 PDP |
| **#5/#19/#24/#31 商品名被砍到 80.3px** | `ProductCard.tsx:88-94`、`:89-91` | 信息行 `flex items-baseline justify-between gap-3 pt-3` → `flex flex-col items-start gap-1 pt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3`；名链接 `min-w-0` → `tap-target--quiet min-w-0`；`h3` `truncate text-sm font-medium text-ink md:text-base` → `line-clamp-2 text-sm font-medium leading-snug text-ink md:text-base` 且**窄屏不 truncate**（`line-clamp-2` 自带 overflow hidden） | 价格 `shrink-0` 占 71.2px（HK$369.00）+ gap 12px，名字只剩 80.3px；33 个英文名里 22 个显示不全，最长 `SWAN QUEEN- LIMITED` 只显示 51%。窄屏独占 163.5px 后 157.9px 刚好放得下 |
| ↳ 价格 | `ProductCard.tsx:92` | `shrink-0 text-sm` → `shrink-0 text-sm`（**不动**，`sm:flex-row` 后自动回到右端） | 价格是决策信息，不为名称让路 |
| **#27 New in 徽章 10px** | `ProductCard.tsx:63` | `text-[10px]` → `text-[11px]` | 站内既有下限 `.kicker`=11px |
| 两枚徽章同屏重叠风险（潜在） | `ProductCard.tsx:62-76` | 短文案后 `New in`（左上，实测 64.1×27）与 `🇺🇸 US ONLY`（右上 ≈45px）在 163.5px 卡宽下不再相交；仍加一条**数据校验测试**：同一商品不得同时置 `featured` 与 `badge` | 现有 19 款互斥，属潜在冲突 |
| 售罄（审计未发现，P0-3 配套） | `ProductCard.tsx`（新增分支） | `!product.isAvailable && !product.isUpcoming` → 图上加常显 `Sold out` 胶囊（`bg-ink/80 text-cream`，`left-2 top-2` 或图片中部），图片 `opacity-60`，`<Link>` 加 `aria-disabled` 并移除跳转 | 现在卡片不显示库存，而 `/products` 列出全部商品（`getLiveProducts` 不过滤 `available`），顾客会一路点到结算才被 400 拦下 |
| `#31` 价格死区 | （同信息行改动） | 名称与价格分行后，点价格不再无反应——把价格并入同一个 `<Link>`（`flex-col` 下包住两行即可），或至少保证名称命中区 44px（`.tap-target--quiet`） | 20px 高的命中区 + 右侧死区 |

### E. PDP（`products/[code]/page.tsx` + `AddToCartButton`）— 唯一 P0

| 条目 | 文件:行 | 改前 → 改后 |
| --- | --- | --- |
| **#14 首屏无标题/价格/加购（P0）** | `products/[code]/page.tsx:79,88,91-92,106,206` | 根容器 `mx-auto max-w-7xl px-6 py-12 lg:px-8` → `container-site py-6 md:py-12`；网格 `grid gap-12 lg:grid-cols-[6fr_5fr]` → `grid gap-6 md:gap-12 lg:grid-cols-[6fr_5fr]`；画廊卡 `aspect-[3/4]` → `aspect-[4/5] md:aspect-[3/4]`；缩略图条 `mt-4` → `mt-3`；相关商品 `mt-20` → `mt-10 md:mt-20`。改后 375px：h1 顶边从 **807px → ≈700px**（进入首屏） |
| ↳ **吸底购买条（P0，规范硬性要求）** | 新增 `src/components/product/StickyBuyBar.tsx` + `page.tsx`（信息区下方） | `md:hidden sticky bottom-0 z-30`（**不用 `fixed`**，见 F5）。内含价格 + `AddToCartButton className="h-12 flex-1"`；外层 `container-site`，内层 `.safe-b` + `border-t border-cream-line bg-cream/90 pt-3 backdrop-blur`；加 `data-testid="pdp-buybar"` 供验收断言。CSS 静态类必须**写全字符串**（Tailwind 只扫源码字面量，不拼模板串） |
| ↳ 三态覆盖 | 同上 | 在售（价格 + Add to bag）/ 售罄（`Sold out`，`disabled`，价格仍在）/ 预告（`Notify me` 或沿用 `upcomingNotice` 文案，价格位显示 `Revealing soon`）。三态都有条 |
| ↳ 桌面不双份 | `page.tsx:198` + `AddToCartButton.tsx` | 信息区 `AddToCartButton code={product.code} className="w-full max-md:hidden"`；吸底条 `className="h-12 flex-1"`。`AddToCartButton` 无需改文件（已支持 `className`） |
| **#15 缩略图横滑 386px 塞 327px** | `page.tsx:106-117` | `mt-4 flex gap-2.5 overflow-x-auto pb-2` → `hscroll mt-3 gap-2.5 pb-2`（吸附 + 渐隐 + 隐藏滚动条，一次解决三个缺失） |
| **#17 缩略图无可见名 + 无触屏反馈** | `page.tsx:108-115` | 每项包成 `flex flex-col items-center gap-1`；图上状态矩阵照抄 `redesign-02 §4.5`：默认 `border-sand` / 当前浏览项 `aria-[current=page]:border-brown-600 aria-[current=page]:ring-2 aria-[current=page]:ring-brown-100` / `active:border-brown-600`；**新增常显名称** `<span className="w-14 truncate text-center text-[11px] leading-tight text-ink-soft">{name}</span>`（`title` 对触屏无效，保留亦无害） |
| **#16 相关商品 3 列 98.3px** | `page.tsx:211,215` | `grid grid-cols-3 gap-4 md:grid-cols-6` → `grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-6`；`sizes="(max-width:768px) 33vw, 16vw"` → `"(max-width:768px) 50vw, 16vw"`（否则按 33vw 过采） |
| **#22 左右边距两套** | `page.tsx:79` | 已并入 #14：`max-w-7xl px-6` → `.container-site`（375px 下 logo x=16 与标题 x=16 对齐，不再是 24） |
| **#23 面包屑 32×20** | `page.tsx:80-86` | `nav.mb-6 text-sm` 保留；两个 `<Link className="link-line">` → `className="link-line tap-target--quiet"`；`nav` 加 `flex items-center gap-2`（避免两个 44px 命中区贴在一起） |
| **新增（产品侧 §3.3）PDP 其实只有一张图** | `src/server/catalog/live.ts:257`（`images: data.images.length > 0 ? data.images : …`）+ `page.tsx:94` | **数据层已经拿到了最多 10 张**（`shopify/products.ts:63` 的 `images(first: 10)`），但 `toLiveProduct` 把它收成 `[item.image]`（单图路径）。改：`toLiveProduct` 增加可选 `images?: string[]` 入参，`fetchProductCards` 传入完整数组；`page.tsx` 主图改为可切换（`useState` 客户端小组件）或至少渲染 `images[1]`，让"缩略图"名副其实。**与 #17 一起做**，否则 6 个缩略图仍是"别的商品" |
| **新增（产品侧 §3.9）吸底条不能用 `fixed`** | — | 见 F5；验收断言 `getComputedStyle(buybar).position === "sticky"` |

### F. 购物袋抽屉 + `/cart` 页 + `/checkout` + 结算不再死路（手机唯一结算面）

| 条目 | 文件:行 | 改前 → 改后 |
| --- | --- | --- |
| **#32 抽屉 100% 宽、遮罩点不到** | `CartDrawer.tsx:48,50` | `aside` 的 `w-full max-w-md` → `w-[88%] max-w-md`（保留 ≥40px 可点遮罩，对齐同仓 `MobileNav.tsx:60` 的 `w-4/5 max-w-xs`）；`h-full` → `h-dvh` |
| **#32/#33/#20 关闭 32×32** | `CartDrawer.tsx:65` | `flex h-8 w-8 …` → `flex h-11 w-11 …` |
| **#33/#20 步进器 32×32** | `CartDrawer.tsx:108,110` | `h-8 w-8` → `h-11 w-11`；两个按钮之间加 `gap-1`，数量显示区 `w-8` → `w-9`（`−` / `+` 不再相邻误触） |
| **#33/#20 Remove 45×16** | `CartDrawer.tsx:112` | `link-line text-xs` → `link-line tap-target--quiet px-2 text-xs`（命中 44px，视觉行高不变） |
| **#21/#36 无 dvh / 无安全区** | `CartDrawer.tsx:120`（footer）、`:56`（header） | footer `p-6` → `p-6 safe-b`（= `pb-[calc(1.5rem+env(safe-area-inset-bottom))]`）；header 加 `safe-t`（顶部安全区）。根 `fixed inset-0` 保留（抽屉不在 `template` 的 transform 子树内——它在 `layout.tsx` 里，与 `<main>` 平级） |
| **#37 无滚动锁、overscroll 外溢** | `CartDrawer.tsx:22-30` 的 `useEffect`、`:89` | `useEffect` 里加 `useScrollLock(isOpen)`；列表 `overflow-y-auto` 加 `overscroll-contain`（`.hscroll` 不适用——它是纵向列表） |
| **#38 抽屉内 24/16 不一致** | `CartDrawer.tsx:56,91,120` | 统一 16px：header/footer `px-6` → `px-4`，行 `p-4` 保留；或统一 24px（行改 `px-6 py-4`）。**选统一 16px**，与 `.container-site` 的 16px 版心一致（从首页点进袋子横向不跳） |
| **#41 长商品名（线上 49 字符）** | `CartDrawer.tsx:102` | `text-sm font-medium` → `line-clamp-2 text-sm font-medium`（行高稳定，价格↔步进器间距不再 52px↔12px 抖动）；`:106` 的 `mt-auto flex … justify-between` 加 `gap-2` |
| **#34 `/cart` 步进器 36、Remove 16** | `cart/page.tsx:74,76,78` | `h-9 w-9` → `h-11 w-11`；Remove `text-xs underline` → 加 `.tap-target--quiet px-2`（**与抽屉同一套值**） |
| **#43 空态 141×20 文字链** | `checkout/page.tsx:166` | `link-line mt-4 inline-block text-sm` → 与其他空态一致的 pill：`mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream`（照抄 `CartDrawer.tsx:82` / `cart/page.tsx:48`） |
| **#35 结算摘要排在支付按钮之后** | `checkout/page.tsx:171,172,302` | `<aside className="h-fit rounded-card bg-paper p-6">` → `className="order-first h-fit rounded-card bg-paper p-6 lg:order-none"`（栅格 `grid gap-10 lg:grid-cols-[2fr_1fr]` 在 <1024px 单列，`order-first` 把摘要提到表单前；≥1024px 恢复右列）。`<li className="flex justify-between">`（`:306`）顺手加 `gap-3` + 名称 `min-w-0`（E11） |
| **#42 表单无 autoComplete / inputMode** | `checkout/page.tsx:179-257` | 9 个控件补 `autoComplete`：`email` / `tel` / `name` / `address-level1`(select) / `postal-code` / `address-line1` / `address-line2` / `address-level2` / `address-level1`；邮编加 `inputMode="numeric"`。**定位降级**：`/checkout` 是兜底页，这属于"顺手 15 分钟"，不单独排期（产品侧驳回其"主修"定位） |
| **新增（产品侧 §3.1）售罄 = 结算死路（P0）** | `src/server/payments/shopify/provider.ts:55`、`api/payments/checkout/route.ts:56`、`useCheckoutRedirect.ts:90-117` | ① provider 区分原因：`!product \|\| !product.shopifyVariantId` → `unknown_items`；`!product.isAvailable \|\| product.isQuoteOnly` → `unavailable_items`（各返回 400，附 `items: [{code, reason}]`）；② hook：按 `res.status` 分流——**仅网络错误 / 5xx 回退 `/checkout`**，4xx **不跳转**，把 `{code, reason}` 交给调用方；③ `CartDrawer` 在 footer 渲染可行动文案（指名商品 + "从袋子移除后重试"），不再只显示 `checkoutFallback`，且用户能原地重试。**全站任何位置不得渲染 `invalid_items` / `checkout_failed` 这类原始码**（验收断言） |
| **新增（产品侧 §3.2）买完袋子必须清空（P0）** | 新增 `src/app/[locale]/checkout/return/page.tsx`；`src/server/payments/shopify/provider.ts:64-71` 的 `cartCreate` 传入 `returnUrl` | 主链路不回 `/checkout/success`，而 `ClearCartOnSuccess` 只挂在那里（`ClearCart.tsx`，grep 只有 1 处引用）。新增：Shopify cart 带 `returnUrl = ${SITE_URL}${publicPath(locale, "/checkout/return")}`；该页挂 `<ClearCartOnSuccess />` 并渲染"付款完成 / 感谢"文案 + 返回首页。行为必须可测：回到站上袋子行数 = 0 |

### G. 内容页（About / FAQ / policies / bag-charm）与横滑条

| 条目 | 文件:行 | 改前 → 改后 |
| --- | --- | --- |
| **#56 About 两套边距 + 纵向节奏** | `about/page.tsx:33,44,72,89` | `mx-auto max-w-7xl px-6 py-20 text-center lg:px-8` → `container-site section-y text-center`（4 处；`max-w-7xl` 去掉，它已被 `.container-site` 取代）；阅读宽度如需保留则放内层 |
| **#55 About 12 段 `.lede` 20px** | `about/page.tsx:63` | `className="lede mb-4"` → `className="mb-4 text-base leading-relaxed"`（`.lede` 只留给 hero 副标题 `:39`）。**不改字号治不了长度**——12 段正文本身就是 4752px，属内容问题，不在本轮 |
| **#54 页面 H1 48 vs 28** | `faq/page.tsx:31`、`policies/page.tsx:54`、`policies/[handle]/page.tsx:63` | `text-[clamp(1.75rem,1.4rem+1.4vw,3rem)]` → `text-4xl md:text-5xl`（**把小的抬到 36**，不把 About 的 48 压下去）；About `:36` 的 `text-5xl md:text-7xl` **不动**；`bag-charm/page.tsx:31` `clamp(30px,4.2vw,60px)` → `text-4xl md:text-5xl`，并 **`font-extrabold` → `font-semibold`**（违反 `redesign-02 §2.3`"标题不超 700"） |
| **#50 FAQ summary 命中区 28px** | `faq/page.tsx:56-59` | 把纵向内边距从 `<details className="group py-4">` 挪到 `<summary>`：`details` 去 `py-4`；`summary` 加 `py-4`（单行 28px → 60px，**视觉完全不变**，且不再有"假可点区域"） |
| **#51 三个返回链接 118×17** | `faq/page.tsx:82-85`、`policies/page.tsx:84-87`、`policies/[handle]/page.tsx:93-96` | `<Link className="focus-ring transition-colors hover:text-ink">` → 加 `.tap-target` |
| **#52 联系页邮箱/Instagram 24px 高** | `policies/[handle]/page.tsx:115-129` | `<a className="focus-ring link-line break-words">` → 加 `.tap-target`（`break-words` 保留） |
| **#44 永久位移** | 见 §2 A（`globals.css`） | 修完复核 `/bag-charm` `scrollWidth = 375`、`/about` 起源区左右留白均 24px |
| **#45 bag-charm 竖图 343×844px** | `bag-charm/page.tsx:60` | `relative aspect-[608/1496] w-full overflow-hidden rounded-card bg-cream-deep md:w-[25%]` → `relative aspect-square w-full … md:aspect-[608/1496] md:w-[25%]`（窄屏复用左图的方形，而不是按 0.4064 比例反算 844px） |
| **#46 bag-charm 首屏 144px 空白** | `bag-charm/page.tsx:29` | `container-site pt-[calc(var(--header-h)+2.5rem)]` → `container-site pt-12 md:pt-16`（Header 是 `sticky` 占文档流，不该再补一次高度；`:75` `pt-14` / `:86` `py-12` 统一到 `section-y`） |
| **#47 TeaserProductGrid SKU 折行 + View → 49.5×20** | `bag-charm/TeaserProductGrid.tsx:219,236-246` | `:219` `grid grid-cols-2 gap-x-4 gap-y-10` 保留 2 列；`:236` 行 `flex items-center justify-between gap-3` → `flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3`；SKU `text-sm` → `text-xs tabular-nums md:text-sm`（12 字符不再折成两行）；`View →` 按钮加 `.tap-target` |
| **#53 quick-view 关闭 32×32 + 无滚动锁** | `TeaserProductGrid.tsx:180,197` | 关闭按钮 `h-8 w-8` → `h-11 w-11`；overlay 加 `useScrollLock(!!activeCode)` + `overscroll-contain`（`fixed inset-0` 可保留——该浮层不在 `template` 的 transform 子树内） |
| **#29 分类条被 header 盖** | 见 §2 B | — |

### H. 商品网格容器（`ProductGrid.tsx`）

| 条目 | 文件:行 | 改前 → 改后 |
| --- | --- | --- |
| 列数与间距 | `ProductGrid.tsx:22-23` | 窄屏已是 2 列（`grid-cols-2 gap-x-4 gap-y-10`）→ 保持，补 `sm:gap-x-6 lg:gap-x-8`（当前 `sm:gap-x-5` / `lg:gap-x-6` 与首页两处不一致，统一到规范表） |
| `sizes` | `ProductGrid.tsx:25` | `"(max-width: 768px) 50vw, …"` 已正确，不动 |

---

## 3. 明确剔除项（不改，以及为什么）

| # | 剔除项 | 谁驳回 | 理由 |
| --- | --- | --- | --- |
| **E1** | **#8 联名图拆成 14 张独立 PNG + 4 列栅格** | 产品侧 + 技术负责人 | ① 这是装饰性品牌位图，**块内唯一可点元素是它上方的 CONTACT 链接**（`page.tsx:257`），顾客买不成与它无关；② 拆图要设计出图 + 新增栅格 + 验收，是 56 条里 ROI 最低的一项；③ 手机端 `hscroll` 横滑是可随时追加的**单行增强**，不需要素材。**已列为可选增强，不排期** |
| **E2** | **#9 单开一个"43.83px → 44px"的改动** | 产品侧 | 差 0.17px 属阈值内实现噪声。真正的缺陷是圆圈没有可见名称（#6），而 #6 的修法本身就把列数改到 4 列、单元 76.75px——**两个问题同一个改动**，不单开 |
| **E3** | **#12 把三个 image-backed section 的 `py-20` 直接砍成 `py-12`（审计建议的做法）** | 产品侧 + 设计侧 | 这三个 section 的底图是 `<Image fill className="object-contain object-top">` 铺在 section 盒子上，**盒子高度 = 内容 + padding**，砍 padding 会同时缩小底图、改变 PSD 构图比例。**采纳但加约束**：只在附 375px 截图对比（水印位置不变）后合入；无底图的三个 section 直接改 |
| **E4** | **#13 把 Marquee 内容改成 `whitespace-normal` 换行 + `overflow-x-auto` 手动横滚（审计建议的两套）** | 产品侧 + 设计侧 | ① 两条文案**与 Header promo 完全同源**（`promoMessages`，`page.tsx:26-27`），信息并不丢失；② 把单行黑条变成多行块，版式变化比"看不全"更糟；③ `overflow-x-auto` 与 `whitespace-normal` 互斥。**只做 reduced-motion 回退**（系统"减弱动态效果"下动画停止 → 改成静态换行块，文案完整可读） |
| **E5** | **#54 把 About 的 48px 封面标题压到 28px** | 产品侧 + 设计侧 | 审计自己的实测证明 48px **没有溢出**（`Meet Who You Love to Be` 在 327px 内折 2 行、高 100.8px）。正确方向是把 FAQ/政策/bag-charm 的 28/30px **抬到 36**——救小字，不砍大字 |
| **E6** | **#55 `.lede` 20px 降到 17px，以及"一个模块只能一种正文字号"** | 产品侧 + 设计侧 | 20px/1.6 在手机上比 FAQ 的 15px **更好读**；"模块内阶梯必须一致"是设计洁癖，不是顾客问题。About 真正的毛病是 12 段正文把页面拉到 4752px——那是**内容长度**问题，改字号治不了。只把 `.lede` 从长正文降级为 hero 副标题专用（§2 G） |
| **E7** | **#42 把兜底页的 9 个控件补 `autoComplete` 当作主修** | 产品侧 | 主链路在 Shopify 那边收地址，这个表单本身就是重复建设。正确动作是**让兜底页不再是第二个结算表单**（重试 + 说明 + 单项错误）。仍补 `autoComplete`/`inputMode`，但算顺手 15 分钟，**不单独排期**（§2 F 已并入） |
| **E8** | **#11 统一给 5 个 section 标题加 `max-sm:text-[22px]`** | 设计侧 + 技术负责人 | 目标对、手段错：会把 5 个按 PSD 定稿的 section 标题压成同一个值。**改成两条机械规则**：所有 `clamp()` 下限 = 对应档位值（section → 30），并只修"上级比下级小"的 3 处（资讯 20、teaser h2 22 / h3 20） |
| **E9** | **#39 / #40 成功页 96px 上下留白与 24 vs 20 卡片内边距** | 产品侧 | `/checkout/success` 只有 Stripe/PayPal 回跳会到，而这两条通道当前不可用（provider 固定 `shopify`，`parseCallback` 恒返回 `null`）——**主链路不可达的页面**。按"顺带"处理：若本轮改了 `container-site`，`py-24` → `py-12 md:py-24` 顺手对齐，`p-5`/`p-6` 统一，不单独立任务 |
| **E10** | **审计 #30 列表页纵向节奏（`py-12/16/20` 三套 + `mb-8` vs `mb-10`）** | 技术负责人 | 被 `.section-y` 一次性覆盖（§1.2），**不需要逐页拍值**——列在这里只是说明"它不单独排期" |
| **E11** | **#41 里 checkout 摘要行（`flex justify-between` 无 gap）** | 产品侧 | 兜底页；且 #35 已把摘要在移动端提到前面，顺手加 `gap-3` + 名称 `min-w-0` 即可，不单列 |
| **E12** | **新增"订单回站信号"做成完整 webhook / 订单落库** | 技术负责人 | 产品侧要求"买完袋子必须清空"的**行为**，不要求完整订单系统。最小实现是 `returnUrl` → `/checkout/return` 清袋子（§2 F）；webhook 落库仍属"future milestone"（`provider.ts:34-36` 的注释），不在本轮扩范围 |

**明确保留、不为适配牺牲的 7 件事**（与设计侧一致）：封面 48px 大字；首页 hero 大图与等比高度；`.container-site` 的 16px 与满幅底图；图的画框边与比例（`p-2/p-3`、3:4 / 4:5、PDP `object-contain`）；editorial caps 与 `--tracking-*` 字距系统；区域徽章的红 `#c8102e`（只缩短文案，不换色）；动效节奏（`Reveal` 0.7s / `--ease-editorial` / reduced-motion 全量降级）。

**明确允许牺牲的 5 项**：名册 6→4 列（一屏 12→8 个，换来标签可见）；PDP 相关商品 3→2 列（换来名称 14→22 字符）；商品卡名称单行→两行（卡片信息区 +20px）；section 交界 160→96px（换来省 320px ≈ 0.4 屏）；联名图保持整图（换来零素材依赖）。

---

## 4. 风险与回归点

**总原则：所有窄屏改动必须写在 `max-*` / 无前缀（移动优先）+ `md:` 恢复的分支里；任何改动都不得改变 `lg` 及以上断点的计算结果。** 具体风险与规避：

| # | 风险 | 触发点 | 规避 / 验证 |
| --- | --- | --- | --- |
| R1 | **`.section-y` 改变 image-backed section 的底图缩放** | `page.tsx:76/119/187`（`<Image fill object-contain object-top>`，盒子高 = 内容 + padding） | 改完附 **375px 截图对比**：底图水印 / 淡化字标位置不得压到标题。设计侧已把这条列为"需目视复核的例外" |
| R2 | **吸底条用 `fixed` 会失效** | `template.tsx` 的 `animate-page-enter`（`fill-mode: both`）让包裹层成为 containing block（F5） | 只用 `sticky bottom-0`（或 Portal / 放 layout）。验收断言 `position === "sticky"` |
| R3 | **吸底条父级带 `overflow-hidden` 会让 sticky 失效** | PDP 根节点当前无 `overflow`，但新增包裹层时容易顺手加 | 吸底条的祖先链上不得出现 `overflow-hidden` / `overflow:auto`；`md:hidden` 保证桌面不存在该元素 |
| R4 | **`.tap-target` 的 `min-h-11` 改变行盒 → 打乱既有 `mb-12` / `mt-5` 节奏** | 首页三处 CTA、面包屑、返回链接、Remove | 视觉行高必须不变的处用 `.tap-target--quiet`（`padding-block:.75rem; margin-block:-.75rem` 自相抵消）；`inline-block` 必须换成 `inline-flex`（`min-height` 对 `inline-block` 无效） |
| R5 | **`min-h-11` + `inline-block` 一起写 = 命中区没变大** | 审计原始建议的 `py-3 -my-3` 写法 | 统一走 `.tap-target`，禁止散写 `py-3 -my-3`；CI 断言不允许出现裸 `py-3 -my-3` |
| R6 | **`ProductCard` 信息行改 `flex-col` 让桌面卡片变高 → 网格行高变化** | `sm:flex-row` 断点 | 改动只在 `<640px` 生效；**1440px 桌面截图 diff 必须为 0**（`sm:` 前缀 = 640px，桌面走原路） |
| R7 | **徽章短文案用 `sm:hidden` 双 span 会重复文本 → 读屏读两遍** | `ProductCard.tsx:74` | 两个 span 都必须 `aria-hidden`（或只留一个 `sr-only` 完整句）；验收：`accessibility tree` 里不出现两段相同信息 |
| R8 | **`--header-h` 被 JS 写死成实测值后在桌面端失效** | `Header.tsx` 的 `ResizeObserver` 在 `md` 断点变化时触发 | `ResizeObserver` 必须监听元素尺寸变化（跨断点自动重测）；`globals.css` 的 `@media (min-width:768px){ :root{ --header-h:112px } }` **保留为初始值**，JS 只做覆盖 |
| R9 | **`h-dvh` 在旧浏览器不支持** | Safari < 15.4 | 写成 `h-full h-dvh`（同属性后者覆盖，不支持的浏览器保留 `h-full`）；项目已用 Next 15 + React 19，基线浏览器支持 `dvh` |
| R10 | **`viewport-fit=cover` 让内容进入刘海/圆角区** | `layout.tsx` 新增 `viewport` 导出 | 必须与 `.safe-t` / `.safe-b` 同时落地（同一分区 A + F 的交付物）；验收：iPhone 真机截图，header/抽屉内容不被圆角裁切 |
| R11 | **`ProductCard` 售罄态改动被 `/products` 的过滤逻辑重复** | `getLiveProducts` 不过滤 `available`（`live.ts:180-183`），`products/page.tsx:18` 直接返回全量 | 只改卡片与 PDP 的**呈现**（显示 Sold out + 禁用加购），**不**在列表层过滤——商家要靠列表看到"哪些下架了"是产品决定；过滤会连带影响 `#11 home New Looks`（该处已自行 `filter(available)`） |
| R12 | **`useCheckoutRedirect` 改 4xx 不跳转后，`/checkout` 的"兜底"语义变了** | `cart/page.tsx:93-97` 与 `CartDrawer.tsx:125-129` 都在渲染 `checkout.failed` | hook 的返回类型要区分 `failed`（网络/5xx，仍回退）与 `blocked`（4xx，留在原地 + 指名商品）。两处调用点都要更新，否则 `/cart` 会出现"提示了但不跳转"的死界面 |
| R13 | **`returnUrl` 可能不被 Shopify 的 `cartCreate` 接受** | `src/server/shopify/cart.ts` 的 mutation | 落地前先查 `cartCreate` 的 `buyerIdentity`/`attributes` 是否支持自定义 return（或改用 `checkoutUrl` 的 query 参数）；**若两者都不可行，退路**：在抽屉的"Checkout"点击时记录 `pendingCheckout` 到 `localStorage`，任意一次回到站上（`CartProvider` 挂载时）若存在该标记且袋子内容与标记一致则清空。行为断言不变（验收 6） |
| R14 | **窄屏字号下限抬到 11px 后，`NewsGrid` 副卡胶囊文字溢出** | `NewsGrid.tsx:96-97`（`w-auto max-w-[92%]`，内层 `whitespace-nowrap`） | 已实测 `WEEKEND IN MOTION` 在 11px 下约 124px，可用宽 121px——**临界**。规避：胶囊内层由 `whitespace-nowrap` 改 `truncate`（`max-w-[92%]` 已在外层），或字号取 `max(11px,4.84cqw)` 时同时把 `px-[9cqw]` 降到 `px-[6cqw]`（多出 10px）。**必须实测 en 的四条真实文案** |
| R15 | **`CategoryTabs` 加 `scrollIntoView` 会在页面加载时把整页滚走** | `inline:"center"` 默认也会滚动纵向 | 必须显式 `block:"nearest"`；验收：在 `/collections/playful-life` 加载后 `window.scrollY === 0` |

---

## 5. 分区开发计划（并行开发；同一文件不出现在两个分区）

**并行约束**：每个分区**独占**其文件列表；跨分区共享的只有分区 A 定义的 6 个 CSS 类 + 1 个 hook，A 必须最先合入（其余分区只**引用**类名，不修改 `globals.css`）。

| 分区 | 名称 | 独占文件（一个文件只在此出现一次） | 依赖 | 建议顺序 |
| --- | --- | --- | --- | --- |
| **A** | **全局基础设施（关键路径，必须第一个合入）** | `src/app/globals.css`<br>`src/app/[locale]/layout.tsx`<br>`src/hooks/useScrollLock.ts`（新增）<br>`src/hooks/useScrollLock.test.ts`（新增） | — | **1** |
| **B** | **全局框架**（Header / 分类条 / 促销条 / 留资表单） | `src/components/layout/Header.tsx`<br>`src/components/layout/CategoryTabs.tsx`<br>`src/components/Marquee.tsx`<br>`src/components/newsletter-form.tsx`<br>（+ 各自同名 `.test.tsx`） | A | 2（可与 C/D/E 并行） |
| **C** | **首页**（含 NewsGrid / UpcomingCard / HeroCarousel / 名册 / content 数据） | `src/app/[locale]/page.tsx`<br>`src/components/home/NewsGrid.tsx`<br>`src/components/home/UpcomingCard.tsx`<br>`src/components/home/HeroCarousel.tsx`<br>`src/lib/content.ts`<br>（+ `NewsGrid.test.tsx` / `UpcomingCard.test.tsx` / `HeroCarousel.test.tsx`） | A | 2 |
| **D** | **商品卡**（一个文件吃掉 6 条审计 + 售罄呈现） | `src/components/product/ProductCard.tsx`<br>`src/components/product/ProductCard.test.tsx`<br>`src/lib/geo.ts`（若短文案需要 `regionBadgeShortLabel` 辅助函数）<br>`src/lib/geo.test.ts` | A | 2 |
| **E** | **PDP + 吸底购买条**（唯一 P0） | `src/app/[locale]/products/[code]/page.tsx`<br>`src/components/product/StickyBuyBar.tsx`（新增）<br>`src/components/product/StickyBuyBar.test.tsx`（新增）<br>`src/server/catalog/live.ts`（多图下发）<br>`src/server/catalog/live.test.ts` | A | 3（A 之后立刻开始，与 B/C/D 并行） |
| **F** | **购物袋 / 结算链路**（手机唯一结算面 + P0-3/P0-4） | `src/components/cart/CartDrawer.tsx`<br>`src/components/cart/useCheckoutRedirect.ts`<br>`src/components/cart/useCheckoutRedirect.test.ts`<br>`src/server/payments/shopify/provider.ts`<br>`src/server/payments/shopify/provider.test.ts`<br>`src/server/shopify/cart.ts`<br>`src/app/api/payments/checkout/route.ts`<br>`src/app/[locale]/cart/page.tsx`<br>`src/app/[locale]/checkout/page.tsx`<br>`src/app/[locale]/checkout/return/page.tsx`（新增）<br>`src/app/[locale]/checkout/success/page.tsx`（仅顺手对齐） | A | 3（依赖 E 的新增错误契约，但接口由本分区定义，可与 E 并行） |
| **G** | **bag-charm** | `src/app/[locale]/bag-charm/page.tsx`<br>`src/app/[locale]/bag-charm/TeaserProductGrid.tsx` | A | 3 |
| **H** | **内容页**（About / FAQ / 政策） | `src/app/[locale]/about/page.tsx`<br>`src/app/[locale]/faq/page.tsx`<br>`src/app/[locale]/policies/page.tsx`<br>`src/app/[locale]/policies/[handle]/page.tsx`<br>`src/app/[locale]/collections/page.tsx`<br>`src/app/[locale]/collections/[series]/page.tsx`<br>`src/app/[locale]/products/page.tsx`<br>`src/components/product/ProductGrid.tsx` | A | 3 |
| **I** | **验收脚本**（可与全部并行） | `scripts/audit-mobile.mjs`（新增）<br>`scripts/lib/cdp.mjs`（新增，零依赖 CDP 客户端） | 无（先写脚本，再跑出基线失败清单） | **1（与 A 同时）** |

**为什么不冲突（自检）**：

- `globals.css` 只属 A；B–H 通过**新增的类名**消费它（`.section-y` / `.tap-target` / `.hscroll` / `.safe-b`），有任何新类需求回到 A 提。
- `ProductCard.tsx` 只属 D；首页 `page.tsx`（C）与 `ProductGrid.tsx`（H）只是它的调用方，通过 props 使用，不改文件。
- `UpcomingCard.tsx` **同时**被首页（C）与 About（产品侧提到）使用——文件归 **C 独占**；H 若需要 About 侧的构图差异，通过 `UpcomingCard` 的 props（如 `layout="narrow"`）表达，由 C 实现。**H 不得修改该文件**。
- `AddToCartButton.tsx` **不属任何分区**：现有 `className` prop 已够用（`max-md:hidden` / `h-12 flex-1`）。若 E 发现确需新增 prop，E 独占该文件，F 不得引用新 prop。
- `CartDrawer.tsx` 只属 F；E 的吸底条只调用 `useCart`（读 `CartProvider`），不改 F 的文件。
- `TeaserProductGrid.tsx`（quick-view 浮层）只属 G；它的 SKU 行与 PDP 缩略图共用"名称/按钮分行"的模式，但**各自实现**（不抽共享组件，避免跨分区耦合）。
- `layout.tsx` 的 `viewport` 导出只属 A；B 的 Header 写 `--header-h` 属于 `Header.tsx` 内部，不碰 layout。

---

## 6. 验收清单（可验证；"可以了"的定义）

**总判据**：375×812 从首页/列表 → 选款 → 加购 → 改数量 → 结算 → 到达 Shopify 付款页，全程不需要缩放页面、不需要横向滚动、每次点按都有 ≥44px 命中区且状态变化可见；袋子里不会出现已买过的商品；任何失败都能看到"是哪个商品/哪一步出错"并能原地重试。

### 6.1 自动化（命令可跑）

```bash
pnpm typecheck                 # 类型
pnpm lint                      # ESLint
pnpm test                      # Vitest（含新增行为测试）
node scripts/audit-mobile.mjs --base http://127.0.0.1:3000   # 移动端尺寸断言（本单的验收证据）
```

**CDP 脚本设计**（`scripts/audit-mobile.mjs` + `scripts/lib/cdp.mjs`，**零依赖**：Node 24 自带 `WebSocket`，直接连 `--remote-debugging-port`）：
路由固定 `home / products / collections/princess-lady / PDP / cart / checkout / bag-charm / faq / policies/returns / about`；视口 `320×812`、`375×812`、`390×812`；输出每条断言的 **PASS/FAIL + 实测值**，FAIL 非零退出。

| # | 断言 | 具体形式 |
| --- | --- | --- |
| 1 | **零横向溢出** | 320 / 375 宽下全部路由 `document.documentElement.scrollWidth === clientWidth`（涵盖 #44 与新增吸底条） |
| 2 | **点击目标 · 购买路径** | 遍历 `a,button,summary,input[type=radio],label` 的 `getBoundingClientRect()`：**购买路径（PDP / 抽屉 / `/cart` / `/checkout`）上 0 个元素 < 44×44** |
| 3 | **点击目标 · 全站** | 全站 0 个可点元素 < 24×24；**白名单不得包含任何购买路径元素** |
| 4 | **可读下限** | 遍历所有 `font-size < 11px` 且有可见文本的元素：**购买路径必须为空**（价格、商品名、CTA、徽章、规格、标签）；正文类 < 12px 也应为空 |
| 5 | **图片与 alt** | `img[alt=""]` 只允许装饰图；`ProductCard` 名称链接有可访问名 |
| 6 | **左边缘一致性** | 首页 / 列表 / PDP / 抽屉 中 h1、logo、tab 条的 `left` 全部为 16（375×812） |

### 6.2 行为断言（Vitest + Testing Library，随代码提交）

| # | 断言 | 覆盖风险 |
| --- | --- | --- |
| B1 | **吸底条存在且可吸附**：PDP 渲染 `[data-testid="pdp-buybar"]`；`getComputedStyle` 的 `position === "sticky"`（**断言 `!== "fixed"`**）；在售 / 售罄 / 预告三态都有条，售罄态按钮 `disabled` | P0-1 / R2 |
| B2 | **抽屉关闭路径**：`✕` ≥44×44；点遮罩调 `close`；抽屉打开时 `documentElement` 的 `overflow === "hidden"`；关闭后还原 | P0-2 / #37 |
| B3 | **售罄错误文案**：`useCheckoutRedirect` 收到 400 + `{items:[{code, reason:"unavailable_items"}]}` → **不调用 `router.push("/checkout")`**，把 `blocked` 暴露给调用方；`CartDrawer` 渲染指名商品的文案；**全站任何位置不渲染 `invalid_items` / `checkout_failed` 原始码** | P0-3 |
| B4 | **袋子清空**：`/checkout/return` 挂载后 `lines.length === 0`；`CartButton` 角标不显示已购数量 | P0-4 |
| B5 | **`.tap-target` 生效**：被应用的链接 `min-height ≥ 44px`（jsdom 用 `getComputedStyle` 兜底断言 class 存在 + 类名不出现裸 `py-3 -my-3`） | #1/#23/#43/#47/#50/#51/#52 |
| B6 | **短徽章**：375 视口下 `ProductCard` 渲染 `US ONLY`（不含 `AVAILABLE IN`）；`sm` 视口渲染完整句；两段文本不重复进可访问性树 | #4/#18/#27 / R7 |
| B7 | **商品名不截断**：`ProductCard` 名称元素无 `truncate`，含 `line-clamp-2`；`tap-target--quiet` 存在 | #5/#19/#24/#31 |
| B8 | **`NewsGrid` 副卡字号**：`text-[max(11px,4.84cqw)]` 类存在；en 四条文案在 375px 卡宽下不溢出（`scrollWidth <= clientWidth`，jsdom 用固定宽度桩） | #3 / R14 |
| B9 | **`UpcomingCard` 字号下限**：三处 clamp 下限为 11/24/12 | #7/#48/#49 |
| B10 | **reduced-motion 下 Marquee 文案完整**：`matchMedia('(prefers-reduced-motion: reduce)')` ↓ 容器含 `whitespace-normal`，第二份内容 hidden | #13 |
| B11 | **数据校验**：同一商品不得同时置 `featured` 与 `badge` | #27 潜在冲突 |
| B12 | **代码级防回归**（grep 断言，放进 `pnpm test`）：页面根容器不再出现 `/max-w-\dx?l\s+px-\d/`；不出现裸 `h-8 w-8`（按钮位）；不出现 `text-[9px]` / `text-[10px]`；不出现无下限的 `text-[\d.]+cqw` | §1 规范表 |

### 6.3 真机与桌面回归（人工，录屏留档）

| # | 项 | 通过标准 |
| --- | --- | --- |
| M1 | **真机 iPhone Safari 17+ 与一台 Android Chrome** 各跑一遍完整流程（加购 → 改数量 → Checkout） | 全程可完成；**newsletter 聚焦不触发整页缩放**（表单 `text-sm` → iOS 需 ≥16px，这一条属 P1-7，本轮一并改 `newsletter-form.tsx:54` 为 `text-base md:text-sm`）；吸底条在工具栏展开时不遮挡 |
| M2 | **抽屉在真机上可退出** | (a) 左侧暴露 ≥40px 遮罩，真实 touch 后 `[role=dialog][data-open]` 变 `false`；(b) ✕ ≥44×44；(c) 打开期间在 header/footer 区域拖拽，背景页 `scrollY` 不变；(d) footer 计算 `padding-bottom >= 24px + env(safe-area-inset-bottom)`；(e) 抽屉高度 `100dvh`，Checkout 按钮下沿距视口底 ≥ 24px |
| M3 | **不跳动** | 手机 Lighthouse CLS ≤ 0.1（home / PDP / products）；**Header 高度在 promo 轮播的每一条文案下完全相同**（不再每 4.5s 跳 15px）；`/products` 滚动 600px 后 `CategoryTabs` 首个 tab 顶边 ≥ header 底边 + 8px，且 `aria-current="page"` 的 tab 完整落在 [16, 359] 内 |
| M4 | **信任信息**（P1-8） | 抽屉里在点 Checkout 之前，不离开袋子即可看到三项：商品件数或小计 / 运费（或运费政策链接）/ 退货政策链接。全站唯一运费披露目前只在轮播 promo 语里（`$15 USD` 平邮） |
| M5 | **价格 / 币种一致**（P1-10，**必须人工核一次**） | 用 geo 头模拟 US / HK / GB，逐项断言 PDP 价、卡片价、抽屉行价、抽屉小计、Shopify 结算页行价与币种**字符串一致**；并人工记录三个地区的实际运费，确认与 promo 文案一致。不一致就改文案 |
| M6 | **桌面截图 diff** | 1440×900 各路由与现基线 diff，**允许的差异仅限本单声明的改动**（吸底条 `md:hidden`、移动端字号不泄漏到 `sm` 以上、`.container-site` 换掉 `max-w-7xl` 后的版心变化）。改 `page.tsx:76/119/187` 三个 image-backed section 后附 375px 底图水印对比 |
| M7 | **`/bag-charm` 与 `/about` 复核**（#44 修完） | `/bag-charm` `documentElement.scrollWidth === 375`；`/about` 起源区左右留白均为 24px；注入 `.reveal{transform:none!important}` 后 scrollWidth 不变（证明位移已不是溢出源） |

### 6.4 交付形态（按仓库纪律）

- **一个 OpenSpec change**（`openspec/changes/<change-id>/`）：`proposal.md`（Why / What Changes / Capabilities / Impact）+ `tasks.md` + `design.md`（放 §1 规范表与 §5 分区），以及 `specs/<capability>/spec.md` 的 delta。`pnpm exec openspec change validate <change-id>` 必须过。
- 行为变更（B1–B4、B11）走 TDD：Red → Green → Refactor；纯样式/间距归 `skip_specs: true`。
- `pnpm test / typecheck / lint` 全绿；移动端尺寸断言固化在 `scripts/audit-mobile.mjs`，作为本单的**验收证据**（贴 320/375/390 三档输出）。
- **两处既有 spec 需同步修订**（设计侧提出，随本单一起改文档）：
  | spec 原文 | 修订为 | 理由 |
  | --- | --- | --- |
  | `redesign-02-visual.md §4.4` 徽章 `text-[10px]` | **`text-[11px]`** | 11px 是站内既有下限（`.kicker`） |
  | `redesign-02-visual.md §4.7` 步进器 `w-10 h-10` | **`h-11 w-11`** | 与 `02-ux-spec.md §5.2`"触控目标 ≥44×44"自相矛盾 |

---

## 7. 一页速查（给并行开发者）

```
先读：§0 三条前置事实（尤其 F1 / F5）+ §1 规范表
必用：.section-y  .tap-target(--quiet)  .hscroll  .safe-b  useScrollLock
禁止：fixed 吸底（用 sticky） / 裸 py-3 -my-3 / max-w-*l + px-* 组合
      无下限的 text-[*cqw] / text-[9px] / text-[10px] / 按钮 h-8 w-8
断点：改动只写在 max-* 或无前缀；md:/lg: 必须保持现状
验收：pnpm test + node scripts/audit-mobile.mjs（320/375/390）
```
