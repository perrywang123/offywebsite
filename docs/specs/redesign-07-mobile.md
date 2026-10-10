# PLAYCORE 凭空幻想 — 移动端适配规格 v7（375×812 基线）

> 文档编号：`redesign-07-mobile.md` · 归属：设计负责人（品牌独立站）
> **承接** `redesign-02-visual.md`（token / 字阶 / CTA / 徽章 / 选择器）、`redesign-05-layout.md`（栅格密度）、`redesign-06-motion.md`（svh）、`02-ux-spec.md §5.2`（移动端优先响应式）
> **输入**：手机端 375×812 适配审计 56 条
> **作用域**：本文**只决定 < 1024px 的取值**。桌面（≥1024px）版式一律保持现状——凡本文与现状不同处，都是"窄屏新增下限"，不是"重做版式"。
> 本文是设计规格（决定"应该长什么样"），落地实现走 `AGENTS.md` 的 spec-first + TDD。

---

## 0. 五条根规则

后面每一条具体取值都能回溯到这五条。凡与本规格冲突的写法，按本规格改。

| #      | 规则                   | 一句话                                                                                                                                                                                                            |
| ------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1** | **单一版心**           | 全站左右安全边距只有一个来源：`.container-site`（375px = **16px**）。页面根节点不允许再写 `mx-auto max-w-* px-*`。                                                                                                |
| **R2** | **单一字阶下限**       | 窄屏字号只允许落在 7 档上（48 / 36 / 30 / 24 / 16 / 14 / 11–12）。全部 `clamp()` 的**下限**就是窄屏字号；全部 `cqw/vw` 字号**必须带下限**。任何文本 < 11px 一律视为缺陷。                                         |
| **R3** | **命中区与视觉解耦**   | 可点目标 ≥ **44×44px**（`min-h-11`）。视觉行高可以只有 16px，命中区不能。段落内联链接可用 WCAG 2.5.8 AA 的 24×24 下限。                                                                                           |
| **R4** | **hover 不是唯一通路** | 任何只靠 `hover:` / `title` 表达的信息、状态或反馈，必须在 `(hover: none)` 下有等价通路（常显文字 / `active:` / 常显描边）。                                                                                      |
| **R5** | **不引入新体系**       | 只用既有 token（`.container-site` / `.kicker` / `.lede` / `.link-line` / `.focus-ring` / `--tracking-*` / `--radius-*` / `--ease-editorial`）+ Tailwind 默认 4px 间距基。**不新增字号、间距、颜色、圆角、缓动**。 |

---

## 1. 移动端基线（375×812）

### 1.1 版心与左右安全边距 = **16px**

```
.container-site   /* globals.css:152-159，现状不动 */
  width: calc(100% - 2rem);   /* 375px → 内容 343px（91.5%），左右各 16px */
  max-width: 2800px;
  @media (min-width: 768px) { width: 92%; }
```

**结论：16px，不是 20 / 24px。** 三个理由：

1. **它是既有的、且是多数派**：Header / Footer / 首页全部 section / FAQ / 政策 / bag-charm 已在用；`globals.css:150` 的注释已明确它是"替代旧 max-w-7xl"的站点主容器。
2. **16px 是内容宽度的上限保护**：375px 下 343px 是**唯一还能放下 2 列商品卡**的边距（每卡 163.5px）。加到 20px → 每卡 159.5px，会同时恶化 4 条截断类问题；加到 24px → 155.5px，商品名可用宽度掉到 95px。
3. **20/24px 在 375px 屏上不构成"更高级的留白"**，只是把内容挤瘦：editorial 的呼吸感来自**块与块之间**（§1.2），不是来自把内容缩窄。

**落地（这是"改一层"而不是"逐页改"）**——共 9 个文件、13 处容器：

| 文件:行                                           | 现状                                            | 改成                                                            |
| ------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `products/page.tsx:32`                            | `mx-auto max-w-7xl px-6 py-12 lg:px-8`          | `container-site section-y`                                      |
| `collections/page.tsx:46`                         | 同上                                            | `container-site section-y`                                      |
| `collections/[series]/page.tsx:53`（hero 文案层） | `mx-auto w-full max-w-7xl px-6 pb-14 lg:px-8`   | `container-site relative z-10 w-full pb-8 md:pb-14`             |
| `collections/[series]/page.tsx:65`                | `mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-8` | `container-site section-y`                                      |
| `products/[code]/page.tsx:79`                     | `mx-auto max-w-7xl px-6 py-12 lg:px-8`          | `container-site py-6 md:py-12`                                  |
| `about/page.tsx:33,44,72,89`                      | `mx-auto max-w-7xl px-6 py-20 … lg:px-8`        | `container-site section-y`（去掉 text-center 之外的所有容器类） |
| `checkout/page.tsx:149`                           | `mx-auto max-w-5xl px-6 py-12 lg:px-8`          | `container-site section-y` + 表单外层 `mx-auto max-w-5xl`       |
| `checkout/success/page.tsx:46`                    | `mx-auto max-w-2xl px-6 py-24`                  | `container-site py-12 md:py-24` + 内层 `mx-auto max-w-2xl`      |
| `cart/page.tsx:32,39`                             | `mx-auto max-w-5xl px-6 py-12 lg:px-8`          | `container-site section-y` + 内层 `mx-auto max-w-5xl`           |

> **区分两件事**：**版心（gutter）** 全站唯一 = `.container-site`；**阅读宽度上限**（`max-w-5xl` 表单、`max-w-[68ch]` 政策正文、`max-w-3xl` hero 标题）是内容层约束，允许保留，但必须写在 `.container-site` **内层**，不能再自带 `px-*`。

**防回归**：新增一条 Vitest 断言（`src/lib/polish.test.ts` 之类）：

```ts
// 页面根容器不得再出现自带 padding 的 max-w-* 组合
expect(src).not.toMatch(/max-w-\dx?l\s+px-\d/);
```

---

### 1.2 纵向节奏 = **48 / 80 / 112px**

以 Tailwind 默认 4px 基数表达（三个值都是既有步进，今天已分别出现在不同页面）：

| 位置                                   | 375px  | ≥768px | ≥1024px | 类                                   |
| -------------------------------------- | ------ | ------ | ------- | ------------------------------------ |
| **section / 页面壳 padding-y**         | **48** | 80     | 112     | `py-12 md:py-20 lg:py-28`            |
| 相邻 section 交界（两份 padding 相加） | **96** | 160    | 224     | —                                    |
| 区块内主间距（标题 ↔ 内容）            | **24** | 40     | 40      | `mb-6 md:mb-10`                      |
| 同一 section 内的子块间距              | **40** | 64     | 64      | `mt-10 md:mt-16`                     |
| 页头之后首块                           | **32** | 64     | 64      | `pt-8 md:pt-16`                      |
| 商品网格纵向行距                       | **40** | 40     | 40      | `gap-y-10`（redesign-05 §1.1，不动） |

- **首页收益**：5 处 section 交界从 5×160 = **800px 降到 480px**（省 320px ≈ 0.4 屏）；这正是审计里"整屏不承载内容的留白"的来源。
- **现状 5 套值收敛成 1 套**：`py-12`（购物袋/结算/列表/PDP/bag-charm）、`py-16 md:py-20`（FAQ/政策）、`py-20`（About）、`py-20 md:py-28`（首页）、`py-24`（成功页）→ 全部 `py-12 md:py-20 lg:py-28`。
- **实现方式**：新增 component class，让"节奏"只有一个可改点（与 `.kicker` / `.lede` 同级，R5）：

```css
/* globals.css @layer components —— 全站唯一的 section 纵向间距来源 */
.section-y {
  padding-block: 3rem;
} /* 48 */
@media (min-width: 768px) {
  .section-y {
    padding-block: 5rem;
  }
} /* 80 */
@media (min-width: 1024px) {
  .section-y {
    padding-block: 7rem;
  }
} /* 112 */
```

- **需目视复核的例外**：首页"最新资讯 / 按类别选购 / 新品抢先看"三个 section 带 `object-contain object-top` 的满幅底图，`padding` 同时决定底图缩放。改完必须附 375px 截图对比底图水印位置，**不允许**为了留白把水印压到标题上。
- **页头重复让位**：`bag-charm/page.tsx:29` 的 `pt-[calc(var(--header-h)+2.5rem)]` 删掉，改 `pt-12 md:pt-16`——Header 是 `sticky`（占文档流），不是 `fixed`，不该再补一次高度。

---

### 1.3 字号阶梯（375px）

**全部取值直接来自 `redesign-02-visual.md §2.3` 的既有字阶表**，没有新造一档。审计里 20/22/24/26/30 的混乱，收敛为**一个** section 字号。

| 层级                                                                      | 375px      | 类                                 | 出处                                 |
| ------------------------------------------------------------------------- | ---------- | ---------------------------------- | ------------------------------------ |
| Campaign 主标（首页 hero）                                                | 36→96 流式 | `text-4xl md:text-6xl lg:text-8xl` | 现状（图片驱动，**不动**）           |
| **封面 H1**（About、系列落地页 hero）                                     | **48**     | `text-5xl md:text-7xl`             | 现状即此值（**不缩**，见 §3）        |
| **页面 H1**（PDP 名、列表页、购物车、结算、成功页、FAQ、政策、bag-charm） | **36**     | `text-4xl md:text-5xl`             | `redesign-02 §2.3`"页面 H1"原文      |
| **Section H2**（所有区块标题）                                            | **30**     | `text-3xl md:text-5xl`             | `redesign-02 §2.3`"Section 标题"原文 |
| 小节 H3（如"最新造型曝光"）                                               | **24**     | `text-2xl md:text-3xl`             | 现状即 24                            |
| 正文 / 表单 / 商品名                                                      | **16**     | `text-base`（行高 1.7；政策 1.75） | `redesign-02 §2.3`"正文"原文         |
| 辅助：价格、导航、说明                                                    | **14**     | `text-sm`                          | `redesign-02 §2.3`"辅助"原文         |
| caps 标签 / 徽章 / kicker（非交互）                                       | **11**     | `.kicker`（`0.6875rem`）           | 既有 token `globals.css:163`         |
| 交互式 caps（tab、小 CTA 文字）                                           | **12**     | `text-xs`                          | Tailwind 默认档                      |
| **绝对下限**                                                              | **11px**   | —                                  | 无例外                               |

**两条机械规则（这次 12 条字号类问题的总解）**

1. **`clamp()` 的下限 = 上表这一档的值。** 现状是每个标题按各自 PSD 比例单独挑下限，才会出现同一页 20/22/24/26/30。逐条替换：

| 位置                                                                          | 现状                                            | 改成                                                    |
| ----------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| `page.tsx:82` 资讯 h2                                                         | `clamp(20px,2.49vw,54px)`                       | `clamp(30px,2.49vw,54px)`                               |
| `page.tsx:121` 分类 h2                                                        | `clamp(30px,2.6vw,60px)`                        | 不变（已是 30）                                         |
| `page.tsx:126` 最新造型 h3                                                    | `text-2xl md:text-3xl`                          | 不变（24）                                              |
| `page.tsx:202` Stay tuned                                                     | `clamp(11px,1.11vw,24px)`                       | `clamp(12px,1.11vw,24px)`（交互式 caps）                |
| `page.tsx:205` teaser h2                                                      | `clamp(22px,3.14vw,68px)`                       | `clamp(30px,3.14vw,68px)`                               |
| `page.tsx:226` teaser h3                                                      | `clamp(20px,3.91vw,84px)`                       | `clamp(30px,3.91vw,84px)`                               |
| `page.tsx:229` teaser note                                                    | `clamp(11px,1.99vw,42px)`                       | `clamp(14px,1.99vw,42px)`（句读文本）                   |
| `page.tsx:236` 胶囊 CTA 高                                                    | `h-[clamp(38px,6.31vw,124px)]`                  | `h-[clamp(44px,6.31vw,124px)]`（R3）                    |
| `page.tsx:251` 联名 h2                                                        | `clamp(26px,2.4vw,48px)`                        | `clamp(30px,2.4vw,48px)`                                |
| `page.tsx:273` 订阅 h2                                                        | `clamp(24px,2vw,40px)`                          | `clamp(30px,2vw,40px)`                                  |
| `page.tsx:285` 后续计划 h2                                                    | `clamp(26px,2.53vw,81px)`                       | `clamp(30px,2.53vw,81px)`                               |
| `page.tsx:85` Browse all                                                      | `clamp(11px,1.11vw,24px)`                       | `clamp(12px,1.11vw,24px)`                               |
| `faq/page.tsx:31`、`policies/page.tsx:54`、`policies/[handle]/page.tsx:63` H1 | `clamp(1.75rem,…)`（28）                        | `text-4xl md:text-5xl`（36）                            |
| `bag-charm/page.tsx:31` H1                                                    | `clamp(30px,4.2vw,60px)` + **`font-extrabold`** | `clamp(30px,4.2vw,48px)` + **`font-semibold`**          |
| `faq/page.tsx:70` 答案正文                                                    | `text-[0.9375rem]`（15）                        | `text-base`（16）                                       |
| `about/page.tsx:63` 12 段正文                                                 | `.lede`（20）                                   | `text-base leading-relaxed`（`.lede` 只留给 hero 副标） |

2. **`cqw` / `vw` 字号必须带下限**（现状一整类"窄屏线性缩水到 7.9px"的根因）：

| 位置                                 | 现状                                       | 改成                                        | 375px 实得                         |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------- | ---------------------------------- |
| `NewsGrid.tsx:96` 副卡胶囊           | `text-[4.84cqw]`                           | `text-[max(11px,4.84cqw)]`                  | 163.5px 卡 → **11px**（原 7.91px） |
| `NewsGrid.tsx:66` 主卡大标           | `text-[9.59cqw]`                           | `text-[max(30px,9.59cqw)]`                  | 343px 卡 → 32.9px（不变）          |
| `NewsGrid.tsx:63/88` 徽章/CTA        | `4.77cqw` / `4.65cqw`                      | `text-[max(11px,…cqw)]`                     | ≥11px                              |
| `UpcomingCard.tsx:59` IN DEVELOPMENT | `clamp(9px,2.40cqw,35px)` + `min-h-[18px]` | `clamp(11px,2.40cqw,35px)` + `min-h-[20px]` | **11px**                           |
| `UpcomingCard.tsx:67` 标语           | `clamp(10px,2.15cqw,31px)`                 | `clamp(12px,2.15cqw,31px)`                  | **12px**（caps 层）                |
| `UpcomingCard.tsx:64` 名字           | `clamp(20px,6.21cqw,90px)`                 | `clamp(24px,6.21cqw,90px)`                  | **24px**                           |
| `ProductCard.tsx:63` New in 徽章     | `text-[10px]`                              | `text-[11px]`                               | **11px**（见 §4 的 spec 修订）     |
| `ProductCard.tsx:72` 区域徽章        | `text-[9px]`                               | `text-[11px]` + 短文案（§2 RC-5）           | **11px**                           |

> **主卡大标题溢出（审计 #10）用"改文字框"而不是"缩字"解决**：`NewsGrid.tsx:62` 的 `px-[14%]` 在 375px 下把文字框压到 247px，而 32.89px 的「ROMANTICIZING」需要 257.7px —— 与其缩字号（会伤品牌大标），不如把窄屏左右边距收到 8%：文字框 → 288px，标题不必断成三行，字号一分不减。落法：`px-[8%] sm:px-[14%] pt-[6.6%]`。

> **判断依据是排版层级，不是语义**：全大写 + 字距 = caps 层（≥11px，交互式 ≥12px）；句读文本 = 说明/正文层（≥14px）。

---

### 1.4 栅格：手机端列数与间距

| 场景                         | 375px 列数                  | 间距        | 类                                                                      |
| ---------------------------- | --------------------------- | ----------- | ----------------------------------------------------------------------- |
| **商品网格（全站所有场景）** | **2 列**                    | x 16 / y 40 | `grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:gap-x-8`               |
| PDP 同系列商品               | **2 列**（现状 3 列 ✗）     | x 16 / y 40 | 同上 + `md:grid-cols-6`                                                 |
| 资讯副卡 2×2                 | 2 列                        | 16          | `grid grid-cols-2 gap-4`（不动）                                        |
| 后续计划卡                   | 1 列                        | 24          | `grid grid-cols-1 gap-6 md:grid-cols-2`（不动）                         |
| **名册圆头像**               | **4 列**（现状 6 列 ✗）     | 12          | `grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-3 lg:grid-cols-12`        |
| **联名 14 形象**             | **4 列**（现状 7 列位图 ✗） | 16          | `grid grid-cols-4 gap-4 sm:grid-cols-7`（或 `<picture>` 换 4×4 竖版图） |
| PDP 同系列缩略图             | 横滑（不换行）              | 10          | `.hscroll` + `gap-2.5`（§1.7）                                          |

- **2 列是规范，不是取舍**：`docs/specs/redesign-05-layout.md:34` 明确"移动端（所有场景）| < sm | 2 列"，`02-ux-spec.md §5.2` 同。PDP 相关商品用 3 列（每格 98.3px）是全站唯一的违例。
- **名册 4 列的理由**：6 列在 343px 下单元 43.83px，既卡在 44px 门槛下（差 0.17px），也放不下标签；4 列 + `gap-3` = 单元 **76.75px**，圆仍被 `max-w-16`(64px) 封顶，剩余空间正好放一行 11px 商品名。
- **联名 14 形象**：这是一张 2858×1060 的**已排版位图**（7×2），窄屏 `w-full` 把每格压到 49px。**首选** `<picture>` 给 <640px 一张 4×4 竖版图（保持"阵容一字排开"的构图语义，每格从 49px → 73.75px）；**次选**才拆成 14 张独立 PNG 走真栅格。不要为了省事直接缩小整图。

---

### 1.5 点击目标：**44×44** 与两个例外

| 类型                                                    | 最小尺寸                   | 实现                                                 |
| ------------------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| 独立控件（按钮、胶囊 CTA、图标按钮、缩略图、圆头像）    | **44×44**                  | `h-11 w-11` / `min-h-11` / `h-12`（主 CTA）          |
| 行内文字链（Browse all / 面包屑 / 返回 / Remove / tab） | **高度 ≥44，宽度随文字**   | `inline-flex min-h-11 items-center`                  |
| 需要"视觉行高不动"的行内链接                            | 同上                       | `py-3 -my-3`（上下各 12px 再抵消，20px 行盒 → 44px） |
| 段落内的内联链接（政策正文 `<p>` 里）                   | **24×24**（WCAG 2.5.8 AA） | 无需改动                                             |
| 相邻目标间距                                            | **≥8px**                   | 名册 `gap-3`(12)、tab `gap-6`(24) ✓                  |

**提升为 component class（R3 + R5，与 `.link-line` 同级）**：

```css
/* globals.css @layer components */
.tap-target {
  /* 行内文字链的通用命中盒：视觉不变、命中区 → 44px */
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
}
.tap-target--quiet {
  /* 视觉行高必须保持原样时（面包屑、Remove、返回） */
  padding-block: 0.75rem;
  margin-block: -0.75rem;
}
```

**逐条落地**（审计里 14 条命中区问题共用这一招）

| 位置                                              | 现状                | 改成                                                                                                                 |
| ------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `page.tsx:85/129/257` 三处 `link-line` CTA        | 15.4 / 19.1px 高    | `tap-target`（`inline-flex min-h-11 items-center`）                                                                  |
| `page.tsx:236` 查看详情胶囊                       | `h-[clamp(38px,…)]` | `h-[clamp(44px,…)]`                                                                                                  |
| PDP 面包屑 `page.tsx:81/83`                       | ~32×20              | `tap-target tap-target--quiet`                                                                                       |
| `CategoryTabs.tsx:30/43` tab                      | 16.0px 高           | `tap-target`（或伪元素 `after:absolute after:-inset-y-3.5`）                                                         |
| `ProductCard.tsx:89` 商品名链接                   | 20px 高             | `tap-target--quiet`（**注意**：先按 §2 RC-5 改成两行布局）                                                           |
| `CartDrawer.tsx:65` 关闭                          | 32×32               | `h-11 w-11`                                                                                                          |
| `CartDrawer.tsx:108/110` 步进 −/+                 | 32×32               | `h-11 w-11`，`−`/`+` 间 `gap-1`                                                                                      |
| `CartDrawer.tsx:112` Remove                       | 45×16               | `inline-flex h-11 items-center px-2`                                                                                 |
| `cart/page.tsx:74/76/78`                          | 36×36 / 45×16       | 同上（与抽屉统一，**不要**两个组件两套值）                                                                           |
| `TeaserProductGrid.tsx:238` View →                | 49.5×20             | `tap-target`                                                                                                         |
| `TeaserProductGrid.tsx:197` 浮窗关闭              | 32×32               | `h-11 w-11`                                                                                                          |
| `faq/page.tsx:56-59` summary                      | 单行时 28px         | 把 `py-4` 从 `<details>` 移到 `<summary>`（单行 → 52px，视觉不变）                                                   |
| `faq:82` / `policies:84` / `[handle]:93` 返回链接 | 118×17              | `tap-target`                                                                                                         |
| `[handle]:115-129` 邮箱 / Instagram               | 227×24 / 58×24      | `tap-target`                                                                                                         |
| `checkout/page.tsx:166` 空态链接                  | 141×20              | 换成与购物车一致的空态 pill：`inline-flex h-12 items-center rounded-full bg-ink px-6 text-sm font-medium text-cream` |

**同时补触屏反馈（R4）**：`globals.css` 的 `.link-line` 只有 `:hover`，触屏永不触发：

```css
.link-line:active::after {
  transform: scaleX(0);
} /* 触屏点按也有下划线收回的反馈 */
```

---

### 1.6 浮层 / 视口 / 安全区

| 项         | 规定                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 视口       | `[locale]/layout.tsx` 补 `export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" }`（现状无 `viewport-fit=cover`，`env(safe-area-*)` 恒为 0）                                                                                                          |
| 高度       | 全屏浮层用 **`h-dvh`**（`h-full` 兜底），叙事 section 用 `min-h-svh`（`redesign-06 §3` 原文）                                                                                                                                                                                                    |
| 底部安全区 | `.safe-b { padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }`；顶部 `.safe-t`                                                                                                                                                                                                          |
| 滚动锁     | 抽 `useScrollLock(open)`（`html { overflow: hidden }`），`CartDrawer` / `MobileNav` / quick view **三处共用**（现状三处都没有）                                                                                                                                                                  |
| 滚动链     | 浮层内滚动区 `overscroll-contain`                                                                                                                                                                                                                                                                |
| 移动端形态 | 按 `02-ux-spec.md §5.2`：购物袋在 <640px 改**底部全屏 sheet**（`fixed inset-x-0 bottom-0 max-h-[90dvh] rounded-t-block`）。这一条同时解决"遮罩不可点 / 全宽 / 安全区"三个问题；若本轮不做，退而求其次：`w-[88%] max-w-md` + `h-dvh` + `.safe-b`（对齐同仓 `MobileNav.tsx:60/68` 的既有正确参数） |

---

### 1.7 横滑容器（`.hscroll`）

审计里三类横滑（Marquee / PDP 缩略图 / 分类 tab）共用同一个缺失：**没有吸附、没有滚动提示、没隐藏滚动条**。既有 `.no-scrollbar` 只解决第三项。

```css
/* globals.css @layer components —— 所有横向滚动容器统一用它 */
.hscroll {
  display: flex;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* 两端 12px 渐隐 = "还能滑"的可视提示 */
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 12px,
    #000 calc(100% - 12px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 12px,
    #000 calc(100% - 12px),
    transparent 100%
  );
}
.hscroll::-webkit-scrollbar {
  display: none;
}
.hscroll > * {
  flex: none;
  scroll-snap-align: start;
}
```

| 位置                             | 落地                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CategoryTabs.tsx:26`            | `no-scrollbar container-site flex … py-4` → `hscroll container-site …`（`py-4` 移到链接的 `tap-target` 上）；并对 `[aria-current="page"]` 项做一次 `scrollIntoView({ inline: "center" })`                                                                    |
| PDP 缩略图 `[code]/page.tsx:106` | `hscroll mt-3 gap-2.5 pb-2`                                                                                                                                                                                                                                  |
| `Marquee.tsx`                    | 保留滚动；**补 reduced-motion 回退**：容器加 `motion-reduce:whitespace-normal motion-reduce:text-center`，内层加 `motion-reduce:block`，第二份内容加 `motion-reduce:hidden`——系统"减弱动态效果"下变成一条静态多行促销块，文案全部可读（现状 88% 永久不可达） |

---

### 1.8 新增的 4 个 component class（与 `.kicker` / `.lede` / `.link-line` 同级）

| class                     | 用途                         | 解决                                |
| ------------------------- | ---------------------------- | ----------------------------------- |
| `.section-y`              | 全站纵向节奏唯一来源         | 首页 800px 空留白、9 个页面 5 套 py |
| `.tap-target` / `--quiet` | 命中区 → 44px                | 14 条命中区问题                     |
| `.hscroll`                | 横滑吸附 + 提示 + 隐藏滚动条 | 3 条横滑问题                        |
| `.safe-b` / `.safe-t`     | iOS 安全区                   | 4 条浮层底部被吃问题                |

外加两处**规则修复**（写在 `globals.css`，不在页面里）：

```css
/* 修复 1：variant 位移与 .is-in 同特异性(0,3,0)且更靠后，导致"已揭示"终态被永久覆盖 */
.js .reveal[data-variant="left"]:not(.is-in) {
  transform: translateX(-24px);
}
.js .reveal[data-variant="right"]:not(.is-in) {
  transform: translateX(24px);
}
/* 修完自检：/bag-charm 的 documentElement.scrollWidth 必须 == 375 */

/* 修复 2：触屏没有 hover（见 §1.5） */
.link-line:active::after {
  transform: scaleX(0);
}
```

---

## 2. 56 条 → 13 个根因：在哪一层统一解决

**结论：56 条 → 13 个根因**（每条只归一个"主根因"，条数合计正好 56）。其中 **7 个根因落在 `globals.css` / layout 层，一次性覆盖 39 条（70%）**；剩下 6 个根因只需要动 **3 个组件 + 3 个页面**。

| 根因                                     | 条数 | 审计编号                                             | 统一解决层                                      | 一次性动作                                                                                   |
| ---------------------------------------- | ---- | ---------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **RC-1 版心/内边距无单一来源**           | 4    | 22, 28, 38, 56                                       | `globals.css` + 9 个页面换 class                | `.container-site` 成为唯一边距来源 + CI 断言                                                 |
| **RC-2 纵向节奏与定位常量各自为政**      | 6    | 12, 29, 30, 39, 40, 46                               | `globals.css` + Header                          | `.section-y`；Header 用 `ResizeObserver` 把真实高度写回 `--header-h`；promo 条固定 2 行高    |
| **RC-3 窄屏字阶无下限**                  | 7    | 3, 7, 10, 11, 49, 54, 55                             | `globals.css` 规则 + 逐处 clamp 下限            | 下限统一 30/24/11–12（§1.3）                                                                 |
| **RC-4 命中区 == 文字行盒**              | 14   | 1, 2, 20, 23, 26, 31, 33, 34, 43, 47, 50, 51, 52, 53 | `globals.css` + 组件                            | `.tap-target` / `h-11 w-11`（§1.5）                                                          |
| **RC-5 卡片信息架构在 155–163px 下塌陷** | 9    | 4, 5, 6, 17, 18, 19, 24, 27, 41                      | **3 个组件**（ProductCard / 名册 / PDP 缩略图） | 见下方专项                                                                                   |
| **RC-6 横滑无吸附/无提示**               | 3    | 13, 15, 25                                           | `globals.css`                                   | `.hscroll`（§1.7）                                                                           |
| **RC-7 浮层用 vh、无安全区、无滚动锁**   | 4    | 21, 32, 36, 37                                       | layout `viewport` + `globals.css` + 3 个浮层    | `viewport-fit=cover` + `h-dvh` + `.safe-b` + `useScrollLock`                                 |
| **RC-8 位图/构图在窄屏不可重排**         | 3    | 8, 45, 48                                            | 素材层 + 组件比例                               | `<picture>` 4×4 联名图；bag-charm 竖图 `h-[46vh] object-cover`；UpcomingCard <640 改右图左文 |
| **RC-9 移动端列数违例**                  | 2    | 9, 16                                                | 组件                                            | 名册 6→4 列；PDP 相关商品 3→2 列                                                             |
| **RC-10 CSS 终态被同特异性规则覆盖**     | 1    | 44                                                   | `globals.css`                                   | `:not(.is-in)`                                                                               |
| **RC-11 移动端缺失关键 UI**              | 1    | 14                                                   | PDP 页面                                        | 吸底购买条（**唯一 P0**）                                                                    |
| **RC-12 移动端信息顺序颠倒**             | 1    | 35                                                   | checkout 页面                                   | 摘要 `order-first lg:order-none`                                                             |
| **RC-13 表单缺移动端能力**               | 1    | 42                                                   | checkout 页面                                   | `autoComplete` / `inputMode`                                                                 |

### RC-5 专项：一个组件里 9 条问题，改 3 处

**`ProductCard.tsx`（覆盖 4, 5, 18, 19, 24, 27）**

```text
信息行（:88）  现状 flex items-baseline justify-between gap-3 pt-3
              → flex flex-col items-start gap-1 pt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3
商品名（:90）  truncate text-sm            → line-clamp-2 text-sm leading-snug（redesign-05 §1.2 本来就要求 line-clamp-2）
名称链接（:89）—                           → tap-target--quiet（命中区 44px）
区域徽章（:72）text-[9px] + 全长文案       → 窄屏短文案 {flag} {cc} ONLY（≈45px，单行）+ text-[11px] + max-w-[calc(100%-1rem)] truncate
New in（:63）  text-[10px]                → text-[11px]
```

- **为什么不是"把价格缩到 text-xs"**：价格是决策信息，不该为名称让路；名称换行是杂志版面的正常做法（redesign-05 §1.2 硬手法 1 明确"名称不 truncate 挤成一行"）。
- **两处徽章同屏的潜在冲突**（`featured` + `badge` 同时存在时会重叠 56×19px）：文案缩短后 `New in`（左上）与 `🇺🇸 US ONLY`（右上）在 163.5px 卡宽下不再相交；仍建议加一条数据校验。

**名册圆头像（覆盖 6, 9）**

```tsx
<div className="grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-3 lg:grid-cols-12">
  <Link className="flex flex-col items-center gap-1.5" …>
    <span className="relative block aspect-square w-full max-w-16 overflow-hidden rounded-full border border-sand bg-cream-deep">
      …
    </span>
    <span className="w-full truncate text-center text-[11px] leading-tight text-ink-soft">{name}</span>
  </Link>
</div>
```

**PDP 同系列缩略图（覆盖 15, 17）**

```tsx
<div className="hscroll mt-3 gap-2.5 pb-2">
  <Link className="relative h-20 w-14 shrink-0 overflow-hidden rounded-soft border border-sand
                   aria-[current=page]:border-brown-600 aria-[current=page]:ring-2 aria-[current=page]:ring-brown-100
                   hover:border-brown-500 active:border-brown-600">
    <Image … />
  </Link>
</div>
```

- 状态矩阵直接照抄 `redesign-02 §4.5`（默认 `border-sand` / 选中 `border-brown-600 ring-2 ring-brown-100` / hover `border-brown-500`）——**规范早就定义了选中态，只是页面没实现**，补上即同时解决"触屏无反馈"。
- 名称从 `title` 属性改为常显：缩略图下方 `w-14 truncate text-center text-[11px] leading-tight text-ink-soft`（PDP 已有 `mt-2 truncate text-xs` 的相关商品写法，保持同构）。

### RC-11 专项：PDP 吸底购买条（唯一 P0）

按 `redesign-02-visual.md:334` 与 `02-ux-spec.md §5.2` 的原文落地，只在 <768px 出现：

```tsx
<div className="container-site sticky bottom-0 z-30 mt-6 md:hidden">
  <div className="safe-b border-cream-line bg-cream/90 flex items-center justify-between gap-4 border-t pt-3 backdrop-blur">
    <span className="text-base font-medium tabular-nums">{price}</span>
    <AddToCartButton className="h-12 flex-1" />
  </div>
</div>
```

配套（让首屏能看见标题，不必滚 1.3 屏）：

| 位置     | 现状                   | 改成                                       |
| -------- | ---------------------- | ------------------------------------------ |
| 页面根   | `px-6 py-12`           | `container-site py-6 md:py-12`             |
| 两栏网格 | `gap-12`               | `gap-6 md:gap-12`                          |
| 画廊卡   | `p-2` + `aspect-[3/4]` | `p-2` + **`aspect-[4/5] md:aspect-[3/4]`** |
| 缩略图条 | `mt-4`                 | `mt-3`                                     |
| 相关商品 | `mt-20`                | `mt-10 md:mt-20`                           |

改后 375px 首屏：header 108 + 24 + 面包屑 20 + 24 + 画廊 424.75 + 12 + 缩略图 80 + 8 ≈ **h1 顶边 ~700px**（现状 807px），标题进入首屏；购买路径则由吸底条从第 0 秒起常驻。

---

## 3. 不为适配牺牲的 7 件事

**取舍原则：窄屏压缩"结构留白"与"信息密度"，不压缩"画面留白"与"版面角色"。**

| #   | 保留                                                                    | 边界                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **封面大字（About / 系列 hero H1 = 48px）**                             | 375px 下全站只有这 2 处是 48px，且**不缩**。审计 #54 的"About 48 vs FAQ 28 差 71%"用**把 FAQ 抬到 36** 解决，不是把 About 压到 28——**救小字，不砍大字**。改完是 48 : 36 = 一档之差。 |
| 2   | **首页 hero 大图与轮播**                                                | 保持 `w-full` + 等比高度（`宽/1.789`），不为了露出下一屏而裁切或压缩 hero。                                                                                                          |
| 3   | **`.container-site` 的 16px 与满幅底图**                                | 不加宽边距、不给满幅 section 加容器。editorial 的"纸感"来自整幅画面，不是内缩。                                                                                                      |
| 4   | **图的画框边与比例**（`p-2/p-3` 白边、3:4 / 4:5、PDP `object-contain`） | 宁可让文字换行/加行，也不缩图给文字腾位置。图:文高度比 88:12（redesign-05 §1.2）保持。                                                                                               |
| 5   | **editorial caps 与字距系统**                                           | `.kicker`、`uppercase`、`--tracking-*` 的运行时切换全部不动；不为了"手机上更清楚"改成小写或去掉字距。                                                                                |
| 6   | **克制的配色**                                                          | 区域限定徽章的红 `#c8102e` 是 PSD 里唯一的红，保留红底——只把**文案缩短**（`🇺🇸 US ONLY`），不换颜色、不改描边式。同屏不超过 2 色（redesign-02 §4.4）。                                |
| 7   | **动效节奏**                                                            | `Reveal` 的 0.7s / `--ease-editorial` / `prefers-reduced-motion` 全量降级策略不动；本次只修"终态被覆盖"的 bug。                                                                      |

**明确允许牺牲的（并说明代价可接受）**

| 牺牲                      | 代价                          | 换来                                   |
| ------------------------- | ----------------------------- | -------------------------------------- |
| 名册 6 列 → 4 列          | 一屏少看 2 列（12 个 → 8 个） | 标签可见（不再盲点）+ 命中区过 44px    |
| 联名 7×2 → 4×4            | 横幅变两排，一行装不下 14 个  | 每个形象从 49px → 73.75px（大 50%）    |
| 商品卡名称单行 → 两行     | 卡片信息区高 20px             | 22/33 个长名可读；不再"SWAN QUEE…"     |
| PDP 相关商品 3 列 → 2 列  | 一屏少 1 列                   | 与目录页一致，名称从 14 字符 → 22 字符 |
| section 交界 160px → 96px | 页间"呼吸"变紧凑              | 省 320px ≈ 0.4 屏，首屏不再全是空白    |

**关于"结构留白 vs 画面留白"的具体分界**：`gap-y-10`（40px，卡与卡）、`gap-x-4`（16px）、卡片 `p-2/p-3`、图与文之间的 `pt-3/pt-4` —— **全部不动**；`py-20`（80px，section 与 section）与 `mt-16`（64px，块与块）—— **窄屏收缩到 48 / 40**。

---

## 4. 与现有设计语言的一致性

### 4.1 每个取值都能指到既有 token

| 本规格取值                                             | 既有来源                                                                                               | 位置                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 16px / 343px 版心                                      | `.container-site { width: calc(100% - 2rem) }`                                                         | `globals.css:152-156`                      |
| 48 / 80 / 112                                          | Tailwind 默认 4px 基（= `py-12` / `py-20` / `py-28`，三个值今天都已在使用）                            | —                                          |
| 40 / 16 网格间距                                       | `gap-y-10 gap-x-4`                                                                                     | `redesign-05 §1.1`                         |
| 36px 页面 H1 / 30px section H2 / 16px 正文 / 14px 辅助 | `redesign-02 §2.3` 字阶表**原文**                                                                      | spec                                       |
| 48px 封面 H1                                           | `text-5xl md:text-7xl`（About / 系列页现状值）                                                         | 现状                                       |
| 11px 下限                                              | `.kicker { font-size: 0.6875rem }`                                                                     | `globals.css:163`                          |
| 12px 交互 caps                                         | `text-xs`                                                                                              | Tailwind                                   |
| 24px 小节                                              | `text-2xl`                                                                                             | Tailwind                                   |
| 44px 命中区                                            | `min-h-11` = 2.75rem；"触控目标 ≥ 44×44px"                                                             | `02-ux-spec.md §5.2`                       |
| `h-dvh` / `min-h-svh`                                  | "`min-h-svh` 优先，移动端地址栏收缩时高度稳定"                                                         | `redesign-06-motion.md:180`                |
| 吸底条类名                                             | `sticky bottom-0 bg-cream/90 backdrop-blur border-t border-cream-line p-4`                             | `redesign-02-visual.md:334`                |
| 缩略图状态矩阵                                         | 默认 `border-sand` / 选中 `border-brown-600 ring-2 ring-brown-100`                                     | `redesign-02-visual.md §4.5`               |
| 徽章外观                                               | `rounded-full px-2.5 py-0.5 … uppercase tracking-[0.14em]`                                             | `redesign-02-visual.md §4.4`               |
| tab / 导航 caps                                        | `text-xs uppercase tracking-[var(--tracking-14)]`                                                      | `globals.css:104-110` + `redesign-02 §3.0` |
| 圆角 / 阴影 / 缓动                                     | `--radius-card/soft/block`、`--shadow-*`、`--ease-editorial`                                           | `globals.css:48-61`                        |
| 空态 pill                                              | `inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-cream` | `CartDrawer.tsx:82` 现成写法               |

**明确不做**：不新增字号（不出现 `text-[13px]`、`text-[17px]`）、不新增间距（不出现 `py-[60px]`）、不新增颜色、不新增圆角/阴影/缓动、不引入 `@tailwindcss/typography` 之类的第二套排版体系。

### 4.2 需要修订既有 spec 的 2 处（请同步改文档）

| spec 原文                                               | 修订为                  | 理由                                                                                                         |
| ------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `redesign-02-visual.md §4.4` 徽章 `text-[10px]`         | **`text-[11px]`**       | 10px 是桌面卡（286px）尺度下的微调；11px 是站内既有下限（`.kicker`），也保证"New in"作为卡片唯一文字时仍可读 |
| `redesign-02-visual.md §4.7` 步进器 `w-10 h-10`（40px） | **`h-11 w-11`（44px）** | `02-ux-spec.md §5.2` 要求 ≥44×44；40px 是唯一自相矛盾处。购物袋抽屉与 `/cart` 统一按 44px                    |

### 4.3 顺带发现（不在 56 条内，但同一根因）

1. `bag-charm/page.tsx:31` 的 H1 用 **`font-extrabold`（800）**，与 `redesign-02 §2.3` 硬规则"中文标题不超 700、英文默认 600、杜绝 font-black"冲突 → 改 `font-semibold`。
2. 站内其实有**四套**页面容器：`max-w-7xl px-6`（products / collections / series / PDP / about）、`max-w-5xl px-6`（cart / checkout）、`max-w-2xl px-6`（success）、`.container-site`（header / footer / 首页 / FAQ / 政策 / bag-charm）。审计只点了前两套，实际应统一到第四套（阅读宽度上限留在内层）。
3. `MobileNav.tsx:60` 同样是 `h-full` 而非 `h-dvh`，也无 `safe-area` 与滚动锁 → 与购物袋抽屉一起按 §1.6 处理（它已经是"移动端抽屉的正确参数"参照，只差这三项）。

---

## 5. 验收（375×812）

| #   | 断言                                                       | 期望                                                                                                  |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 全站任意页面，左边缘出现过的 x 值                          | 只有 `16`（或内容自身的居中缩进）                                                                     |
| 2   | `document.querySelectorAll('a,button')` 逐个量 boundingBox | 独立控件 ≥44×44；行内链接高 ≥44；段落内联链接 ≥24                                                     |
| 3   | `getComputedStyle` 遍历所有可见文本节点                    | `font-size >= 11px`（交互 caps ≥12，正文 ≥14）                                                        |
| 4   | 商品网格                                                   | 375px 下 2 列，卡宽 163.5px（`.container-site` 内）                                                   |
| 5   | 相邻 section 交界                                          | 96px（不再是 160px）                                                                                  |
| 6   | `/bag-charm`                                               | `documentElement.scrollWidth === 375`（无横向溢出）                                                   |
| 7   | 购物袋抽屉（3 件商品）                                     | 遮罩可点关闭；关闭键 44×44；步进 44×44；footer 下沿 + `env(safe-area-inset-bottom)`                   |
| 8   | 抽屉/浮层打开时                                            | `document.documentElement` 计算 `overflow: hidden`；背后页面不滚                                      |
| 9   | PDP 首屏                                                   | h1 顶边 < 812px；吸底购买条在任意滚动位置可见且不遮 footer                                            |
| 10  | 系统"减弱动态效果"开启                                     | Marquee 文案完整可读（换行）；Reveal 内容全部可见无位移                                               |
| 11  | `prefers-reduced-motion: reduce` + `/about`、`/bag-charm`  | 无 24px 永久位移                                                                                      |
| 12  | CI 断言                                                    | 代码中不出现 `max-w-\dx?l px-`、`h-8 w-8`（按钮）、`text-[9px]`/`text-[10px]`、无下限的 `text-[*cqw]` |

---

## 6. 执行顺序（按"一处修多条"排序）

1. **globals.css 4 个 component class + 2 处规则修复**（RC-3/4/6/7/10 的机制层）——不动页面即可被后续引用。
2. **`[locale]/layout.tsx` 补 `viewport` 导出；Header 写回真实 `--header-h`；promo 条定高**（RC-2/7）。
3. **9 个页面的容器换成 `.container-site section-y`**（RC-1/2）。
4. **3 个组件专项：`ProductCard` / 名册 / PDP 缩略图**（RC-5/9）。
5. **PDP 吸底购买条 + 首屏留白压缩**（RC-11，唯一 P0）。
6. **购物袋（抽屉 + 页面）、结算、成功页**（RC-4/7/12/13）。
7. **内容页（FAQ / 政策 / About / bag-charm）**（RC-1/3/4/8）。
8. **素材：联名 4×4 竖版图**（RC-8，需设计出图，可与 1–7 并行）。

（本规格为设计稿；实现按 `AGENTS.md` 的 spec-first + TDD，纯布局/样式改动可走 `skip_specs` 文档类流程。）
