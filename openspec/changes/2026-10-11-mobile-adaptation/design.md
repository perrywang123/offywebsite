# Design — 移动端适配(< 1024px)

## 作用域

**只改 < 1024px;≥ 1024px 一律不变。** 落地手段统一为"base 改手机 + `lg:` 恢复原值"
(而不是反过来),这样桌面端的计算结果是**逐字保留**的,而不是"看起来差不多"。

三处**显式声明**的桌面差异(其余一律禁止):

| 差异 | 位置 | 为什么无法规避 |
| --- | --- | --- |
| `.container-site` 取代 `max-w-7xl` 后的版心变化 | 9 个页面根容器 | 方案要的是"全站唯一版心来源";两者在 1440px 下左边缘 104 → 57.6px,是这次的对齐目标本身(M6 已声明) |
| `ProductCard` 徽章 `text-[10px]` → `text-[11px]` | 新品/区域徽章 | 11px 是站内既有下限(`.kicker`),10px 属可读性缺陷,不是布局选择(§6.4 已同步修订 spec) |
| 购物袋抽屉/购物袋页的步进器与关闭按钮窄屏 44px | `CartDrawer` / `/cart` | `02-ux-spec §5.2` 的 44×44 与 `redesign-02 §4.7` 的 `w-10 h-10` 自相矛盾,本单按前者;`lg:` 已恢复原尺寸 |

## 1. 统一规范表(< 1024px)

| 项 | 375px | ≥768px (`md`) | ≥1024px (`lg`) | 实现类 | 在哪一层 |
| --- | --- | --- | --- | --- | --- |
| 版心 / 左右边距 | 16px(内容 343px) | 8%(92%) | 8% | `.container-site` | `globals.css` |
| section 纵向节奏 | 48 | 80 | 112(改动前的页面用 `lg:py-*` 恢复) | `.section-y` | `globals.css` |
| 区块内主间距 | 24 | 40 | 40 | `mb-6 md:mb-10` | 页面 |
| 同一 section 子块间距 | 40 | 64 | 64 | `mt-10 sm:mt-16` | 页面 |
| 封面 H1(About / 系列 hero) | 48(**不缩**) | 72 | 72 | `text-5xl md:text-7xl` | 页面 |
| 页面 H1(PDP/列表/购物袋/结算/FAQ/政策/bag-charm) | 36 | 48 | 48 | `text-4xl md:text-5xl` | 页面 |
| section H2 | 下限 30 | 30→48 流式 | 48 | `clamp(30px, …, …)` / `text-3xl md:text-5xl` | 页面 |
| 小节 H3 | 24 | 30 | 30 | `text-2xl md:text-3xl` | 页面 |
| 正文 / 表单 / 商品名 | 16 | 16 | 16 | `text-base` | 页面 |
| 辅助(价格/导航/说明) | 14 | 14 | 14 | `text-sm` | 页面 |
| caps 标签 / 徽章(非交互) | 11 | 11 | 11 | `.kicker`(既有 token) | `globals.css` |
| 交互式 caps | 12 | 12 | 12 | `text-xs` | 页面 |
| **绝对下限** | **11px(无例外)** | 11 | 11 | — | 源码断言(`mobile-rules.test.ts`) |
| 商品网格 | 2 列 / x 16 / y 40 | x 24 | x 24(改动前) | `grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6` | 组件 |
| 名册圆头像 | 4 列 / gap 12 | 8 列 | 12 列 | `grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-12` | 页面 |
| PDP 同系列缩略图 | 横滑 | 同 | 同 | `.hscroll mt-4 gap-2.5 pb-2` | `globals.css` + PDP |
| 点击目标:独立控件 | ≥44×44 | 同 | 改动前尺寸(`lg:` 恢复) | `h-11 w-11` / `min-h-11` | 组件 |
| 点击目标:行内文字链 | 高度 ≥44,宽度随文字 | 同 | 改动前 | `.tap-target` | `globals.css` |
| 视觉行高不能动的行内链 | 同上 | 同 | 同 | `.tap-target--quiet` | `globals.css` |
| 段落内联链接 | 24×24(WCAG 2.5.8) | 同 | 同 | 无需改动 | — |
| 相邻目标间距 | ≥8 | 同 | 同 | 名册 `gap-3` / tab `gap-6` | — |
| 浮层高度 | `100dvh`(不支持时 `h-full`) | 同 | 同 | `supports-[height:100dvh]:h-dvh` | 组件 |
| 浮层底部安全区 | `calc(1rem + env(safe-area-inset-bottom))` | 同 | 同 | `.safe-b` / `.safe-t` | `globals.css` |
| 横滑容器 | 吸附 + 两端渐隐 + 隐藏滚动条 | 同 | 吸附 + 隐藏滚动条(**不加渐隐**) | `.hscroll` | `globals.css` |

### 两条机械规则(取代逐条拍脑袋)

1. **所有 `clamp()` 的下限 = 上表对应档位的值。** 审计里 20/22/24/26/30 的混乱收敛为
   一个 section 字号下限 30;页面 H1 统一 36;"About 48 vs FAQ 28 差 71%"用**把 FAQ 抬到
   36** 解决,不是把 About 压到 28。
2. **所有 `cqw` / `vw` 字号必须带下限。** 写法 `text-[max(11px,4.84cqw)]` 或
   `text-[clamp(11px,…,20px)]`,治"窄屏线性缩水到 7.91px"那一整类。

### 为什么横滑的"两端渐隐"只在 <1024px

`.hscroll` 的 `mask-image` 是静态的:即使内容没有溢出,首尾 12px 也会被淡化。
分类 tab 条在桌面端并不溢出,加上遮罩就是一次可见的桌面变化,所以渐隐写进
`@media (max-width: 1023.98px)`。吸附与隐藏滚动条保留在全部断点(只有真的横滑时才有感知)。

## 2. 在哪一层实现(核心结构决定)

**七件事加到 `globals.css` / layout,剩下才是页面级工作**:边距、节奏、字阶下限、
命中区、安全区、横滑、CSS 规则。56 条里 39 条(70%)由这一层一次性覆盖。

| 统一层 | 落点 | 覆盖的审计条目 |
| --- | --- | --- |
| `globals.css` 新增 6 个类 | `.section-y` / `.tap-target(--quiet)` / `.hscroll` / `.safe-b(--t)` | 1,2,12,13,15,20,23,25,26,30,31,33,34,39,43,46,47,50,51,52,53 |
| `globals.css` 2 处规则修复 | `.reveal[data-variant]:not(.is-in)`(含窄屏纵向位移)、`.link-line:active` | 44;26/23 的触屏反馈 |
| `layout.tsx` 新增 `viewport` | `viewportFit: "cover"` | 21,36,32,53 |
| `useScrollLock`(三个浮层共用) | `html { overflow: hidden }` | 37,53 |
| Header 写回真实 `--header-h` | `ResizeObserver` | 29 |
| 9 个页面根容器换 `.container-site` + `.section-y` | 逐页一句替换 | 22,28,38,56,30,39,40,46 |

**`.tap-target--quiet` 的取值推导**:`padding-block: 0.875rem` + `margin-block: -0.875rem`
自相抵消,所以对任何 ≥16px 行盒的元素**布局零位移**;同时 16 + 28 = 44px 恰好达标。
用 `.75rem` 时 `text-xs`(16px 行盒)只有 40px,达不到 44px —— 这是本单唯一一处
偏离方案原文的数值,原因是方案原值无法满足它自己的验收标准。

## 3. 两个 P0 的技术选型

### 3.1 吸底购买条:为什么只能是 `sticky`

`src/app/[locale]/template.tsx` 把整页子元素包在 `.animate-page-enter` 里,而
`--animate-page-enter: page-enter 0.3s var(--ease-inout) both` 的终态是
`transform: translateY(0)`。"终态是 0"不等于"没有 transform":只要不是 `none`,
该元素就成为后代 `fixed` 元素的 containing block —— 用 `fixed` 的吸底条会被钉在
**页面内容**的底部而不是视口底部。所以:

- 用 `position: sticky; bottom: 0`;
- 挂在**页面内容最后一个流内子元素**上(sticky 的语义是"自然位置在视口下方时上提贴住视口底",
  所以它整页滚动期间一直贴底,滚到页尾落回原位);
- 祖先链上不得出现 `overflow-hidden` / `overflow:auto`(会让 sticky 失效);
- `md:hidden` 保证桌面端根本不存在这个元素。

对照:`bag-charm` 的 quick-view 浮层之所以能用 `fixed inset-0`,是因为它通过
**Portal 挂到 document.body**,已经跳出了这层 transform 子树。

### 3.2 售罄 = 结算死路:4xx 与 5xx 必须分开处理

原来的失败处理只有一条路:"回退到 `/checkout`"。但这两类失败的性质完全不同:

- **4xx** = 服务端明确说"这些商品买不了"(售罄/下架/没有可结算变体)。跳去兜底结算页
  只会让顾客在另一个页面再失败一次 → **不跳转**,在原地指名商品 + 让顾客移除后重试;
- **网络错误 / 5xx / 200 但缺 redirect** = 这一层打不开 → 仍然回退 `/checkout`
  (PayPal / Stripe 的回跳地址也指向它)。

所以 `useCheckoutRedirect` 的返回类型增加了 `blocked: CheckoutBlockedItem[] | null`,
`/cart` 与 `CartDrawer` 两个调用点都必须处理它(R12:只改一个会出现"提示了但不跳转"的死界面)。
`provider.createCheckout` 相应地把原来的 `invalid_items` 一分为二
(`unknown_items` / `unavailable_items`)并逐件附 `{code, reason}`。
**界面上永远不出现原始错误码。**

### 3.3 P0-4(买完清空袋子):为什么不是 webhook

Shopify 托管结算页不会把顾客送回站外地址,`CartInput` 也没有 `returnUrl` 字段
(已用本店 Storefront 探针实测:`attributes: [AttributeInput!]` 存在,`returnUrl` 不存在)。
因此:

1. 把回跳地址写进 cart `attributes`(商家/后台据此配置订单完成后的回跳),
2. 新增 `/checkout/return` 挂 `<ClearCartOnSuccess />`(行为可测:挂载后袋子行数 = 0),
3. **不做**"回到站上就清空"的 localStorage 猜测 —— 它无法区分"已付款"与"放弃了结算",
   会把未付款顾客的袋子一起清掉,比原缺陷更糟;
4. 完整的订单 webhook 落库仍属 future milestone(方案 E12)。

## 4. 分区与文件边界

方案里的 9 个分区(A–I)文件清单互斥,共享的只有 A 定义的 6 个 CSS 类 + 1 个 hook。
实际执行时按"每改一处先跑测试"的节奏逐区推进,分区边界仅有一处偏差需要记录:
**方案把 `cartCreate` 写在 `src/server/shopify/cart.ts`,该文件在仓库里不存在** ——
真正的落点是 `src/server/payments/shopify/client.ts`(与 `provider.ts` 同目录、
同属结算分区)。

## 5. 验收

- **自动化**:`scripts/audit-mobile.mjs`(零依赖 CDP,10 路由 × 320/375/390)。
  命中区不是量 `getBoundingClientRect()`,而是从元素中心用 `elementFromPoint`
  向四周探测到不再命中为止 —— 这样伪元素撑出来的命中区(hero 指示条)与"被浮层盖住的部分"
  都能被正确计入。
- **源码级**:`src/mobile-rules.test.ts` 守住 5 类回归(9/10px 字号、无下限 `cqw`、
  裸 `py-3 -my-3`、`max-w-*l` + `px-*`、裸 `h-8 w-8`)。
- **行为**:Vitest + Testing Library,随代码提交。
- **人工**:真机 iPhone Safari + Android Chrome 各跑一遍完整购买流程;桌面 1440×900
  截图 diff 只允许出现上文"三处显式声明的差异"。
