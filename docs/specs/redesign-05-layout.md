# PLAYCORE 凭空幻想 — 布局深化重设计规格 v5（网格密度 / 分类落地页 / 页尾）

> 文档编号：`redesign-05-layout.md` · 归属：网站设计专家
> **承接** `docs/specs/redesign-02-visual.md`（配色/字体/token 已定，本文只深化**布局与质感**，不重复 token）
> 参考站：**dogguo.com**（主抄对象）
> 工程约束：Next.js 15 + Tailwind CSS v4 + next-intl；商品图仅 `public/assets/products/p01.png ~ p29.jpg`（3:4 白底）
> 本文是**设计规格**，不含实现代码；所有 Tailwind class 为可直接落地的规格描述。

---

## 0. 现状诊断（三个用户问题的根因）

| 用户问题 | 现状根因（实证自 `src/`） | 本规格对策 |
| --- | --- | --- |
| ① 需要「分类 → 分类产品列表」的落地质感 | `collections/[series]/page.tsx` 只有裸 `H1 + tagline + ProductGrid`，无页头大图、无叙事引导 | §2 分类落地页版式 |
| ② 核心产品没质感大图、太紧凑小家子气 | `ProductGrid.tsx` 桌面压到 `xl:grid-cols-4`；`ProductCard.tsx` 外框 `p-2`（8px）留白过窄、信息区 `pt-3` 挤 | §1 网格密度重设计 |
| ③ 页尾没突出公司名 | `Footer.tsx` 品牌名仅 `text-2xl`，淹没在 3 列导航里 | §3 页尾大字公司名 |

**关键事实（决定网格密度）**：`src/lib/catalog/products.ts` 共 **29 个产品、9 个系列**，其中 8 个系列只有 **1–4 个产品**，仅 `signature` 有 11 个（含 8 个「待揭晓」）。**4 列网格在 1–3 个产品的系列页上既稀疏又挤小**——这是「小家子气」的直接来源。

---

## 1. 商品网格密度重设计（核心：去 4 列、加大图、加留白）

### 1.1 栅格决策（一锤定音）

**彻底放弃 `xl:grid-cols-4`。桌面只允许 2 列或 3 列，按上下文二选一：**

| 场景 | 断点 | 列数 | 理由 |
| --- | --- | --- | --- |
| **目录页** `products/page.tsx`（29 个全量） | `lg` | **3 列** | 量大，3 列在密度与大气间平衡 |
| **系列落地页** `collections/[series]`（1–4 个） | `lg` | **2 列** | 量小，2 列让单品图近 580px，呈「画册大图」 |
| **首页精选** `DISCOVER THE LATEST`（8 个） | `lg` | **3 列** | 与目录一致 |
| **移动端**（所有场景） | `< sm` | **2 列** | 保持电商浏览效率；系列页可升级见 §1.3 |

**统一栅格 class（ProductGrid 组件新增 `density` prop：`"catalog"` 默认 3 列 / `"series"` 2 列）：**

```text
/* density="catalog"（3 列） */
grid grid-cols-2 gap-x-4 gap-y-10
     sm:gap-x-6
     lg:grid-cols-3 lg:gap-x-8
     xl:gap-x-12

/* density="series"（2 列大图） */
grid grid-cols-2 gap-x-4 gap-y-12
     sm:gap-x-8
     lg:grid-cols-2 lg:gap-x-12
     xl:gap-x-16
```

> 关键改动：`gap-y` 从 `gap-4/6` 提到 **`gap-y-10/12`**——纵向呼吸感是「不挤」的一半来源，图片卡与文字卡之间必须有比横向更大的纵向间距，才像杂志版面而非商品表格。

### 1.2 卡片尺寸规格（白底图如何「显大、有质感」）

容器 `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`，内容宽 ≈ **1216px**（1280 − 64 内边距）。换算到 3:4 图片的**实际渲染尺寸**：

| 密度 | 卡宽（约） | 3:4 图高（约） | 观感 |
| --- | --- | --- | --- |
| 3 列（`xl:gap-x-12`） | ~373px | ~497px | 大气商品橱窗 |
| 2 列（`xl:gap-x-16`） | ~576px | ~768px | **画册级大图**（系列页主推） |

**卡片结构 v2（`ProductCard`，替换现有 `p-2` 紧凑版）：**

```text
┌───────────────────────────────┐
│ 外框 bg-paper rounded-card     │
│  p-3 md:p-4（12→16px 画框边）  │
│  ┌─────────────────────────┐  │
│  │ 内图容器 aspect-[3/4]     │  │ ← 白底图撑满，hairline 内描边
│  │ ring-1 ring-cream-line    │  │   圈出「印版出血位」
│  │ object-cover              │  │
│  └─────────────────────────┘  │
│  （可选 featured 徽章，左上）   │
│  名称 pt-4 md:pt-5（两行内）   │
│  价格 mt-1（ink-soft）         │
└───────────────────────────────┘
```

落地的 Tailwind（卡片外框）：

```text
/* 外框：白卡浮于奶油底 */
group relative block rounded-card bg-paper p-3 md:p-4
       shadow-soft transition-shadow duration-500 ease-editorial
       group-hover:shadow-card-hover

/* 内图容器：白底图 + hairline 内描边 =「印版」边界 */
relative aspect-[3/4] overflow-hidden rounded-[calc(var(--radius-card)-8px)]
       bg-cream-deep ring-1 ring-inset ring-cream-line
```

**让白底产品图「显大、有质感」的 5 条硬手法：**

1. **大图占比**：图:文 高度比 ≈ **88:12**。文字区只占 `pt-4 md:pt-5` + 名称一行 + 价格一行，其余全给图。名称**不 `truncate` 挤成一行**——允许 `line-clamp-2` 换行，留足呼吸，拒绝「表格感」。
2. **画框边（mat）**：外框 padding `p-2` → **`p-3 md:p-4`**。8px→16px 的白边把白底图变成「压在纸上的画框」，而不是「贴死的商品块」。
3. **hairline 内描边**：`ring-1 ring-inset ring-cream-line` 让「白图 vs 白卡」有可感知边界，复刻印刷品的出血位，这是 dogguo「白图浮于奶油底」的精确化。
4. **奶油底透出**：卡片之间 `gap-x-8~16`，让页面 `bg-cream` 从缝隙透出，形成「白卡浮在暖奶油纸」的层次——**绝不能把间隙压小**。
5. **信息区字阶升级**：名称 `text-base md:text-lg font-medium`（弱系列页 2 列可 `md:text-xl`），价格 `text-sm md:text-base text-ink-soft tabular-nums`。名称与价格之间 `mt-1 md:mt-1.5`。

### 1.3 hover（轻微、有质感，不弹跳）

```text
/* 内图：只放大 1.02，不再 1.03/1.05 */
object-cover transition-transform duration-500 ease-editorial
group-hover:scale-[1.02]

/* 外框：抬影 + 轻微上浮 ≤ 2px */
transition-[box-shadow,transform] duration-500 ease-editorial
group-hover:shadow-card-hover group-hover:-translate-y-1

/* 可选：hover 浮现「View Look →」下划线小字（替代硬 CTA 贴片） */
名称 hover 时价格变 accent（`group-hover:text-accent`）
```

- 硬约束：位移只用 `-translate-y-1`（4px）级；缩放 ≤ `1.02`；过渡统一 `500ms var(--ease-editorial)`；`prefers-reduced-motion` 全量降级（现有 `globals.css` 已覆盖）。
- **不**做硬阴影立体、不弹 `scale-1.35`、不出现「Add to Bag」大按钮盖图。

### 1.4 移动端 2 列（保持，但留白同步加大）

- 移动端保持 `grid-cols-2`，但 `gap-x-4 gap-y-10`（纵向间距同步放大），卡内 `p-3`。
- **可选增强（系列页）**：系列页移动端可退化为 **1 列**（`grid-cols-1`），让单品图占满 ~92vw，呈「详情级大图」，比 2 列更 editorial。若选 1 列，`sizes` 同步改 `100vw`。

### 1.5 实现提示（`next/image` `sizes` 必须同步改）

| density | `sizes` 值 |
| --- | --- |
| `catalog`（3 列） | `(max-width: 768px) 50vw, 33vw` |
| `series`（2 列） | `(max-width: 768px) 50vw, 50vw`（或 1 列时 `100vw`） |

现卡 `sizes="(max-width:768px) 50vw, 25vw"` 是 4 列时代的残值，会喂给 2/3 列过小的图，放大后发虚——**必须随栅格一起改**，否则「大图」变「糊图」。

---

## 2. 分类落地页版式（`collections/[series]`）

### 2.1 目标

把「裸 H1 + 网格」升级为**「页头大图 → 系列名 → 编辑导语 → 产品列表」**四段落地页。核心新增：**页头大图（hero）**。

### 2.2 页头版式（推荐方案 A：左文右大图拼贴，占位友好）

```
桌面 lg（grid-cols-[5fr_7fr]，items-center，gap-10~16）：
┌─────────────────────────────────────────────────────────────┐
│  左 5/12                     │  右 7/12                        │
│  .kicker「SERIES 0n · n LOOKS」│  ┌───────────────┐             │
│  H1 系列名（text-5xl）         │  │ 主推产品大图   │ ← 1 大图     │
│  tagline（lede，1-2 句）       │  │ aspect-[3/4]  │   rounded-block│
│  面包屑：All Series → 系列名   │  │ bg-paper      │   shadow-card │
│                              │  └───────────────┘             │
│                              │  + 1~2 张小图错位叠放（可选）    │
└─────────────────────────────────────────────────────────────┘
```

**落地 Tailwind（页头容器）：**

```text
<header class="grid gap-10 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
  <div>  <!-- 左：文字 -->
    <nav class="mb-6 text-xs uppercase tracking-[0.14em] text-ink-muted">
      <Link href="/collections" class="hover:text-ink">All Series</Link>
      <span class="mx-2 text-sand">/</span>
      <span class="text-ink-soft">{系列名}</span>
    </nav>
    <p class="kicker mb-3">Series {String(n).padStart(2,"0")} · {count} Looks</p>
    <h1 class="font-display text-4xl font-semibold tracking-tight md:text-5xl">{系列名}</h1>
    <p class="lede mt-4 max-w-md">{tagline}</p>
  </div>
  <div class="relative">  <!-- 右：主图拼贴 -->
    <div class="relative aspect-[3/4] overflow-hidden rounded-block bg-paper shadow-card">
      <Image fill sizes="(max-width:1024px) 100vw, 50vw" class="object-cover" ... />
    </div>
    <!-- 可选 1~2 张小图：absolute -left-6 bottom-8 w-24 md:w-32 错位叠放 -->
  </div>
</header>
```

- **主推图**：取 `getProductsBySeries(slug)[0].images[0]`（系列首图），`aspect-[3/4]`、`object-cover`、`rounded-block bg-paper shadow-card`。
- **错位小图**（系列 ≥3 个产品时）：第 2/3 张图用 `absolute -left-6 bottom-8 w-24 md:w-32 aspect-[3/4] rounded-soft shadow-card rotate-[-2deg]` 之类错位叠放，营造「杂志内页插页」，**不并排对齐**。
- **移动端**：单列，文字在上、大图在下（自然堆叠顺序）。

### 2.3 页头备选（方案 B：full-bleed 大图，供 lifestyle 图到位后启用）

```text
<header class="relative min-h-[60vh] overflow-hidden">
  <!-- 图：产品图 object-cover + 渐隐，或 media-placeholder 垫底 -->
  <div data-slot="series-hero" class="absolute inset-0 bg-cream-deep ..." />  <!-- TODO: 换 lifestyle 图 -->
  <div class="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />
  <div class="relative mx-auto max-w-7xl px-6 py-28 lg:px-8">
    <p class="kicker kicker--on-dark">SERIES 0n · n LOOKS</p>
    <h1 class="mt-3 font-display text-5xl md:text-7xl font-semibold text-cream">{系列名}</h1>
  </div>
</header>
```

- 用 `media-placeholder`（`globals.css` 已有）或「产品图 + 渐隐遮罩 + 白字」垫底，`data-slot="series-hero"` 标记，将来换 lifestyle 图只动容器。
- **结论**：本轮落地用**方案 A**（白底产品图拼贴，占位友好、不违规），方案 B 作为 TODO 注释保留。

### 2.4 系列编辑导语（可选，第 2 段）

```
<section class="border-y border-cream-line py-12 md:py-16 text-center">
  <p class="mx-auto max-w-2xl font-display text-2xl md:text-3xl font-medium tracking-tight text-ink">
    {系列情绪一句}（例：「每一只，都替你把情绪穿在身上。」）
  </p>
</section>
```

- 一句居中大字 + 上下细线，承接「穿搭=情绪」品牌点。无文案时可省略。

### 2.5 产品列表（第 3 段）

```text
<section class="mt-16 md:mt-24">
  <div class="mb-8 flex items-end justify-between">
    <p class="kicker">{count} Looks</p>
    <Link href="/collections" class="link-line text-xs uppercase tracking-[0.14em]">All Series →</Link>
  </div>
  <ProductGrid products={products} locale={locale} density="series" />
</section>
```

- 系列产品列表用 **`density="series"`（2 列大图）**，与「页头大图」形成「大图开场 → 大图延续」的一致节奏。
- 仅 1 个产品的系列（如 `bag-charm`）：2 列网格会空一列——此时该卡片**占满一行**（`col-span-2`）或干脆 1 列，配合页头大图，呈现「单品专题」感。

### 2.6 落地页完整节奏

```
[1] 面包屑（All Series / 系列名）
[2] 页头大图（左文右图拼贴，方案 A）
[3] 系列编辑导语（可选，细线夹居中大字）
[4] 产品列表（2 列大图 ProductGrid density="series"）
[5] 返回全部系列（link-line）
```

---

## 3. 页尾大字公司名（`Footer` 重排）

### 3.1 目标

公司名「**PLAYCORE**」从 `text-2xl` 升为**页尾视觉主角**，复刻 dogguo 的「尾页大字品牌名」editorial 收束。

### 3.2 版式

```
┌────────────────────────────────────────────────────────┐
│ bg-ink text-cream                                       │
│  [0] 上区（大字品牌名，全宽左对齐或居中）                 │
│      PLAYCORE  ← text-6xl→9xl / 10rem，font-display 600 │
│      .kicker--on-dark「IMAGINE WITH LOVE · CREATE WITH   │
│       COMPANION」 + 中文名「凭空幻想」+ 中文 slogan       │
│  [1] 中区（4 列：导航 / 商店系列 / 客服联系 / newsletter） │
│      列间 cream-line/20 细线，caps 列头                   │
│  [2] 底细条（© 2026 · 社媒 · 语言 · 支付/信任文案）       │
└────────────────────────────────────────────────────────┘
```

**落地 Tailwind：**

```text
/* 上区大字品牌名 */
<div class="border-b border-cream/10 pb-12 md:pb-16">
  <p class="font-display text-6xl font-semibold tracking-tight text-cream
            md:text-8xl lg:text-[9rem] lg:leading-none">
    PLAYCORE
  </p>
  <p class="kicker kicker--on-dark mt-6">Imagine with Love · Create with Companion</p>
  <p class="mt-3 text-sm text-cream/60">凭空幻想 PLAY CORETOYS · 让想象落地，让陪伴发生</p>
</div>

/* 中区 4 列 */
<div class="grid gap-10 py-12 md:grid-cols-4 md:gap-8">
  <div>  <!-- 品牌叙事一句 -->
    <p class="max-w-xs text-sm leading-relaxed text-cream/70">{tagline}</p>
  </div>
  <nav> <!-- Menu：HOME / SHOP / ABOUT -->
    <p class="kicker kicker--on-dark mb-4">Menu</p>
    ... text-xs uppercase tracking-[0.14em] text-cream/70
  </nav>
  <nav> <!-- 系列导航：9 系列 caps -->
    <p class="kicker kicker--on-dark mb-4">Collections</p>
    ... text-xs uppercase tracking-[0.14em] text-cream/70
  </nav>
  <div> <!-- 客服 / newsletter -->
    <p class="kicker kicker--on-dark mb-4">Contact</p>
    hello@playcoretoys.com + NewsletterForm（紧凑）
  </div>
</div>

/* 底细条 */
<div class="border-t border-cream/10 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-cream/50">
  <span>© {year} PLAYCORE 凭空幻想 · {rights}</span>
  <span>社媒图标（Instagram / TikTok）</span>
  <span>语言切换</span>
</div>
```

- **大字品牌名**：`text-6xl md:text-8xl lg:text-[9rem] lg:leading-none`，`font-display font-semibold tracking-tight`。9rem ≈ 144px，是 editorial 尾页的「签名」尺度；中文名与 slogan 紧跟其下做副标，不抢主角。
- **系列导航列（新增）**：把 9 个系列以 caps 列进 footer，呼应「分类」心智（配合 §2），列头用 `.kicker--on-dark`。
- **中英混排**：文案层保留 0.5 字宽空格（`redesign-02 §2.3` 排版规则）。
- 品牌名的具体字级/字重与文案由**品牌专家**最终确认，本文只定**布局层级与占位尺度**。

---

## 4. 现站布局评分（100 分制）与 P0 清单

### 4.1 评分（只评「布局与质感」，不含配色/字体/token，那已由 redesign-02 评过）

| 维度 | 得分 | 评语 |
| --- | --- | --- |
| 商品网格密度 | 8 / 20 | `xl:grid-cols-4` 在 1–4 个产品的系列页上稀疏又挤小；`gap-4/6` 无呼吸，是「小家子气」主因。 |
| 商品卡质感 | 10 / 20 | `p-2` 画框边过窄、信息区 `pt-3` 挤、`truncate` 一行、`scale-1.03` 偏跳；白图无 hairline 边界，质感平。 |
| 分类落地页 | 7 / 20 | 仅裸 `H1 + tagline + grid`，缺页头大图与叙事引导，与「分类 tile → 落地页」的期待落差大。 |
| 页尾品牌名 | 10 / 20 | 品牌名 `text-2xl` 淹没在 3 列里，无「尾页签名」的收束力；缺系列导航列。 |
| 留白与节奏 | 11 / 20 | 有 `py-12/16` 大段节奏，但网格内部间距不足，纵向呼吸感弱。 |
| **总分（布局维度）** | **46 / 100** | 骨架正确、结构齐全，但**密度过紧、图不够大、缺落地页 hero、页尾无品牌收束**四点拖垮质感。 |

> 与 redesign-02 的 58/100（整体）不冲突：本文只对**布局单维**打 46 分，两者相加不重复。

### 4.2 P0（必须先做，一票否决）

1. **去 4 列**：`ProductGrid` 删除 `xl:grid-cols-4`，改 `density="catalog"`（3 列）/`"series"`（2 列），`gap-y` 提到 `10~12`（§1.1）。
2. **商品卡加留白 + 大图**：`p-2`→`p-3 md:p-4`，信息区 `pt-4 md:pt-5`，名称允许 `line-clamp-2`，图加 `ring-1 ring-cream-line` hairline，hover `scale-[1.02]`（§1.2/1.3）。
3. **`sizes` 随栅格改**：`25vw`→`33vw`（3 列）/`50vw`（2 列），否则大图发糊（§1.5）。
4. **分类落地页加页头大图**：`collections/[series]` 采用方案 A「左文右大图拼贴」，不再裸 H1+grid（§2.2）。
5. **页尾大字品牌名**：`PLAYCORE` 升为 `text-6xl→9rem` 尾页签名 + 4 列（含系列导航列）重排（§3.2）。

### 4.3 P1（随后做，显著提质）

6. 系列页「编辑导语」细线夹居中大字（§2.4）；1 个产品的系列卡片 `col-span-2`（§2.5）。
7. 页头错位小图（系列 ≥3 个产品时，1 大 + 2 小）（§2.2）。
8. 卡片 hover 浮现「View Look →」下划线小字，替代未来可能的硬 CTA 盖图（§1.3）。
9. 移动端系列页可选 1 列大图（§1.4），需同步 `sizes=100vw`。
10. `data-slot="series-hero"` 预留 lifestyle 图替换点，方案 B 作为 TODO（§2.3）。

---

## 附：落地提示（给 Web/实现专家）

1. `ProductGrid` 增 `density?: "catalog" | "series"` prop（默认 `catalog`），只影响 grid 与 `sizes`，`ProductCard` 逻辑不动。
2. `ProductCard` 改外框 padding、hairline 描边、`line-clamp-2`、hover `scale-[1.02]`；`sizes` 按 density 传入。
3. `collections/[series]/page.tsx` 加页头大图（方案 A）+ 可选导语，`ProductGrid` 传 `density="series"`。
4. `Footer.tsx` 加「大字品牌名上区 + 系列导航列 + 底细条三区」，保留现有 i18n key 语义，新增 `footer.collections` 等 key。
5. 全部改动后跑 `pnpm build` 验证 `grid-cols-4` 旧引用清除、`sizes` 无残留 `25vw`。

（本规格为设计稿，实现时遵循 AGENTS.md 的 spec-first + TDD；纯布局/样式改动可走 `skip_specs` 文档类流程。）
