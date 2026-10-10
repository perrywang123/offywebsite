# PLAYCORE 凭空幻想 — 视觉与布局重设计规格 v2（dogguo editorial 向）

> 文档编号：`redesign-02-visual.md` · 归属：网站设计专家
> **替代** `docs/specs/03-visual-spec.md`（本文件是它的重做版，旧文件归档不删除）
> 参考站：**dogguo.com**（主抄对象） · littlebeast.co（叙事语气辅助）
> 工程约束：Next.js 15 + Tailwind CSS v4（`@theme` 语义 token）+ 系统字体栈（无 next/font/google）+ 中英双语（next-intl）
> 硬约束：**只使用 `public/assets/products/p01.png ~ p29.jpg`（3:4 白底产品图）**，**禁用 `public/assets/ins/`**；缺失的宣传/hero 图一律用占位块。

---

## 0. dogguo.com 调研结论（本次重做的对齐基准）

调研来源：[Limely 案例页](https://www.limely.co.uk/inspiration/project/dogguo.com)、[Thingtesting 产品页](https://thingtesting.com/brands/dogguo#1)、[dogguo.com 首页](https://dogguo.com/)（抓取 HTML + Typekit 字体 + Shopify theme CSS 实测）。关键实证数据如下：

| 维度 | dogguo.com 实测结论 |
| --- | --- |
| **整体风格** | 「premium 宠物用品」的 **editorial 杂志式**独立站：大图叙事、大量留白、`Shop the look` 情绪/场景卖货、克制不炫技。平台 Shopify。 |
| **配色** | 暖中性底：主题 CSS 定义 `--color-light: #f7f2ef`（暖奶油/米白，全站主底）；品牌暖棕 `#784415`（页内 inline 直接出现，作标题/强调块）；黑 `#000`（正文/结构）；纯白 `#fff`（卡面）；点缀绿 `#65a754`。另在首页出现「TREND: LIGHT BLUE & BROWN TONES」——**浅蓝 + 棕** 是其趋势色组合。 |
| **字体** | **Sofia Pro**（Adobe Typekit kit `vsp7yhd`）——干净的几何人文无衬线（不是衬线、不是粗黑），fallback `Open Sans`。它的「杂志感」来自**排版节奏与留白**，而非衬线字体。 |
| **布局/栅格** | 全宽（full-bleed）hero + 内容容器居中；区块用「分类 tile + 商品 feed + 场景叙事」三段推进；`TREND:`、`NEW:` 这类**全大写加宽字距的 editorial kicker**贯穿全站。 |
| **商品展示** | 白底产品图「浮」在奶油底上；商品卡信息极简（名称 + 价格两行封顶）；分类用 tile 卡片（COLLARS / LEASHES / DOG BEDS…）；`Shop the look` 把商品按「造型/场景」组织。 |
| **首页 hero** | 透明导航叠加在大图/大色块上（滚动后导航变实底），hero 是一句**campaign 标题**（`NEW: THE WALK EDIT`）压在全幅生活方式图上，配单一 CTA。 |
| **品牌叙事区** | 用 `Discover the latest`、`Shop your category`、`Shop the look`、`€5 discount on your first order`（newsletter 激励）等**编辑式小标题**串联情绪与卖货。 |
| **电商细节** | 顶部公告条（免邮门槛）、预测搜索、语言/地区选择、购物袋抽屉、`Cart (0)`、社媒（Instagram/TikTok）图标、Swiper 轮播。 |

**一句话对齐方向**：把 dogguo 的「暖奶油底 + 暖棕强调 + 黑字 + 大量留白 + 大图叙事 + 全大写 kicker」这套 editorial 质感，套到 PLAYCORE 的「黑肤色小精灵把情绪穿在身上」品牌上；**削弱**现站的「Arial Black 街头波普 / 高饱和贴纸」倾向，**保留**品牌暖黑 + 奶油作为骨血。

---

## 1. 设计方向（三句话）

1. **杂志，不贴纸**：从「街头波普贴纸」转向「editorial 时尚杂志」——暖奶油当纸、暖棕当墨、大标题当版面、产品图当内页插页。
2. **把情绪当编辑专题**：每个系列/每个 Offy 都是一期「编辑专题」——用 `NEW:` / `TREND:` / `EDIT 01` 这类 kicker 组织，而不是「促销/徽章」组织。
3. **有质感、有呼吸**：大面积留白、细线分隔、柔和暖阴影、克制的点缀色（暖棕为主、浅蓝/叶绿为辅），杜绝 PPT 式堆砌与高饱和撞色。

---

## 2. 设计 Token（直接替换 `src/app/globals.css`）

### 2.1 完整 `globals.css`（可整段粘贴）

```css
@import "tailwindcss";

@theme {
  /* ============ 中性色：暖奶油底 + 暖黑墨（对齐 dogguo #f7f2ef / #000） ============ */
  --color-cream: #f7f2ef;        /* 全站主底（dogguo --color-light 同值） */
  --color-cream-deep: #efe7df;   /* 交替 section 浅底 */
  --color-cream-line: #e8ded3;   /* 细线/分隔（比 sand 更轻） */
  --color-sand: #d9cbbb;         /* 描边 / 禁用底 */
  --color-paper: #ffffff;        /* 卡面 / 商品白底 / 弹层 */

  --color-ink: #1d1915;          /* 主文字/标题/主按钮（暖近黑，替代纯黑大面积） */
  --color-ink-soft: #554c43;     /* 次级文字（暖灰棕） */
  --color-ink-muted: #8d8175;    /* 弱文字/说明/占位 */

  /* ============ 品牌暖棕（对齐 dogguo #784415） ============ */
  --color-brown-700: #5b3411;    /* 深棕：hover / 结构强调 */
  --color-brown-600: #784415;    /* 品牌主棕：标题强调 / 色块 / kicker */
  --color-brown-500: #9a6a3a;    /* 浅棕：链接 hover / 次级强调 */
  --color-brown-100: #ecdfd0;    /* 棕浅底：徽章 / 标签底 */

  /* ============ 克制点缀（替代旧 pop-* 高饱和） ============ */
  --color-accent: #b65a37;       /* 陶土橙：唯一「行动」色（加购/结账/促销） */
  --color-accent-deep: #9a4629;  /* 陶土橙 hover */
  --color-sky: #a7c4d1;          /* 浅蓝（dogguo 趋势色）：氛围/信息/中性强调 */
  --color-sky-deep: #6d95a8;     /* 深蓝灰：链接/选中态 */
  --color-leaf: #65a754;         /* 叶绿（dogguo 同值）：库存/环保系列 */
  --color-butter: #e6c98a;       /* 奶油黄：极少量高亮/引号点缀 */

  /* ============ 语义色（暖化处理） ============ */
  --color-success: #4c8a4a;  --color-success-bg: #eaf3e6;
  --color-error: #b3402f;    --color-error-bg: #f8e9e4;
  --color-warning: #a87f2e;  --color-warning-bg: #f5ecd8;
  --color-info: #5b7f9a;     --color-info-bg: #e8eff3;

  /* ============ 字体（系统几何无衬线，映射 dogguo 的 Sofia Pro） ============ */
  --font-display: "Avenir Next", "Futura", "Century Gothic", "ITC Avant Garde Gothic",
                  "SF Pro Display", "Segoe UI", "PingFang SC", "Hiragino Sans GB",
                  "Microsoft YaHei", sans-serif;
  --font-sans: -apple-system, "SF Pro Text", "Segoe UI", "Helvetica Neue",
               "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

  /* ============ 圆角（soft editorial） ============ */
  --radius-soft: 0.75rem;    /* 12px：缩略图/徽章/输入 */
  --radius-card: 1.25rem;    /* 20px：商品卡/框架卡 */
  --radius-block: 1.75rem;   /* 28px：大色块/叙事容器 */

  /* ============ 阴影（柔和暖影） ============ */
  --shadow-soft: 0 1px 0 rgba(29, 25, 21, 0.04);
  --shadow-card: 0 1px 2px rgba(29, 25, 21, 0.04), 0 8px 24px rgba(29, 25, 21, 0.05);
  --shadow-card-hover: 0 2px 6px rgba(29, 25, 21, 0.05), 0 16px 40px rgba(29, 25, 21, 0.10);

  /* ============ 缓动 ============ */
  --ease-editorial: cubic-bezier(0.16, 1, 0.3, 1);
}

:root {
  --background: #f7f2ef;
  --foreground: #1d1915;
}

html { scroll-behavior: smooth; }

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* ============ editorial 工具类（Tailwind v4 @layer components） ============ */
@layer components {
  /* 全大写 editorial kicker：`NEW:` / `TREND:` / `EDIT 01` —— dogguo 的杂志化标签 */
  .kicker {
    font-family: var(--font-display);
    font-size: 0.6875rem;         /* 11px */
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--color-brown-600);
  }
  .kicker--on-dark { color: var(--color-butter); }

  /* 导语（lede）：大号、轻字重、宽松行高的编辑式导语 */
  .lede {
    font-size: 1.25rem;
    line-height: 1.6;
    font-weight: 400;
    color: var(--color-ink-soft);
  }

  /* 细线分隔 */
  .hairline { border-color: var(--color-cream-line); }

  /* 下划线链接（editorial 式，替代纯 underline 贴纸感） */
  .link-line {
    position: relative;
    display: inline-block;
    color: var(--color-ink);
  }
  .link-line::after {
    content: "";
    position: absolute;
    left: 0; bottom: -2px;
    height: 1px; width: 100%;
    background: var(--color-brown-600);
    transform: scaleX(1);
    transform-origin: left;
    transition: transform 300ms var(--ease-editorial);
  }
  .link-line:hover::after { transform: scaleX(0); }

  /* 媒体占位块：所有缺失 hero/宣传图的位置统一放它（详见 §5） */
  .media-placeholder {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background-color: var(--color-cream-deep);
    background-image:
      radial-gradient(var(--color-sand) 1px, transparent 1px);
    background-size: 18px 18px;
    color: var(--color-ink-muted);
  }
  .media-placeholder::after {
    content: attr(data-label);
    font-family: var(--font-display);
    font-size: 0.75rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-align: center;
    padding: 0 1rem;
  }
}

/* 数字等宽，价格显示用 */
.tabular-nums { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 2.2 旧 token → 新 token 对照表（实现时全局替换）

| 旧（globals.css 现值） | 新（本 spec） | 说明 |
| --- | --- | --- |
| `ink-900` | `ink` | 主文字/主按钮 |
| `ink-700` | `ink-soft` | 次级文字 |
| `ink-500` | `ink-muted` | 弱文字 |
| `cocoa-600` | `brown-600` | 品牌主棕 |
| `cocoa-400` | `brown-500` | 浅棕 |
| `cream-50` | `cream` | 主底 |
| `cream-100` | `cream-deep` | 浅底/交替 section |
| `sand-200` | `sand` | 描边/禁用 |
| `paper` | `paper` | 不变 |
| `pop-coral` | `accent` | 行动色（降饱和） |
| `pop-yellow` | `butter` | 高亮（降饱和） |
| `pop-blue` | `sky-deep` | 链接/信息 |
| `pop-pink` | `brown-100` | 可爱强调并入暖棕 |
| `pop-green` | `leaf` | 库存/环保 |
| `success / error / warning` | 同名新值 | 暖化 |

### 2.3 字阶与排版规则（相对旧 spec 的关键改动）

| 层级 | 建议类 | 字重（**改变点**） | 用途 |
| --- | --- | --- | --- |
| Campaign 主标 | `text-5xl md:text-7xl lg:text-8xl` | **`font-semibold`（600）英文 / `font-bold`（700）中文** | 首页 hero 大标题。**放弃 `font-black` Arial Black 的街头厚重感** |
| Section 标题 | `text-3xl md:text-5xl` | `font-semibold` | 各 section |
| 页面 H1 | `text-4xl md:text-5xl` | `font-semibold` | 目录/详情/系列/故事 |
| 商品名 | `text-base` | `font-medium` | 商品卡 |
| 价格 | `text-base md:text-lg` | `font-medium` + `tabular-nums` | 商品卡/详情 |
| kicker | `.kicker`（见上） | `600` + `0.22em` + uppercase | `NEW:` / `TREND:` / `EDIT 01` / 系列编号 |
| 正文 | `text-base` | `400` / 行高 `1.75` | 段落 |
| 辅助 | `text-sm` | `400` | 导航/说明/表单 |

**排版硬规则：**
1. 中文标题字重**不超 `700`**；英文标题**默认 `600`**，只有 campaign 主标可用 `700`。杜绝 `font-black`。
2. 标题 `tracking-tight`（`-0.02em` 英文 / `-0.01em` 中文）；正文 `tracking-normal`。
3. 所有「编辑式分类/专题」统一走 `.kicker`，不散落 `uppercase tracking-*` 手写。
4. 中英混排之间文案层留 0.5 字宽空格；价格符号上标小一号。

---

## 3. 页面级布局规格

> 通用容器：`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`；纵向节奏 `py-16 md:py-24`；网格 gap `gap-4 md:gap-6`。

### 3.0 全局框架（Header / Footer / 公告条）

**公告条（Announcement bar）**（新增，dogguo 电商细节）：
- 全宽 `bg-brown-600 text-cream`，`h-9`，`text-xs` 居中，一行文案 + 可点链接。
- 文案示例：`全场满 $99 免运费 · Free shipping over $99`（复用 `common` 的 i18n，新增 key）。

**Header（透明 → 实底，关键改动）**：
- 首页 hero 之上**透明**（`bg-transparent`，图标/字用 `text-ink` 或 `text-cream` 视 hero 底色而定）；滚动后或非首页**实底** `bg-cream/85 backdrop-blur border-b border-cream-line`。
- 结构：左 **`PLAYCORE`（logo 字，`font-display font-semibold tracking-tight`）**，中导航（`HOME / SHOP / SERIES / OUR STORY`，`text-sm uppercase tracking-[0.14em]`），右（语言切换 + 搜索 + 购物袋 `Cart (n)`）。
- 品牌名以 **PLAYCORE 凭空幻想** 为主（logo 区显示 `PLAYCORE`，中文名可作 tooltip/副标），放弃现站「Offy」作 logo 短名（IP 名降级为 hero 副标/故事层）。

**Footer（暖黑 → 改为「editorial 纸墨」底）**：
- 改为 `bg-ink text-cream`（保留暖黑）但排版更杂志：上区 4 列（品牌/叙事一句话 + 导航 + 客服/联系 + newsletter），列间距大、用 `cream-line/20` 细线分隔。
- 品牌区大号 `PLAYCORE` + 中英 slogan 两行；导航用 `uppercase tracking-[0.14em] text-xs`。
- 底部细条：`© 2026 PLAYCORE · 让想象落地，让陪伴发生` + 社媒图标 + 语言。

### 3.1 首页（`src/app/[locale]/page.tsx`）——逐区块重排

```
[0] 公告条（全宽）
[1] HERO（editorial campaign，全宽，替代现 2 列 ins 图版）
[2] 精选商品 feed「DISCOVER THE LATEST」（替代现 Featured）
[3] 分类 tile「SHOP YOUR CATEGORY」（替代现 Series 色块）
[4] 品牌叙事「STORY」（暖黑全宽大字块，保留但换字体）
[5] 情绪专题「SHOP THE MOOD」（新增，替代现 ins Lookbook）
[6] Newsletter 激励条（替代现圆角卡）
```

**[1] Hero 区块（本次最核心改动）**：

```
桌面（full-bleed，min-h-[88vh] 网格，左文右图 7/5）：
┌──────────────────────────────────────────────────────┐
│  .kicker「PLAYCORETOYS · EST. 2026」                   │
│  H1 大标题（2 行）："Wear Your / Mood"                │
│        （中文："把情绪 / 穿在身上"，font-semibold 超大）│
│  lede 导语 1 句                                        │
│  CTA 行：[Shop All Looks 主胶囊] [Our Story 下划线链接] │
│  图区右侧：1 张主产品图（3:4 白底，大）+ 2 张错位小图  │
└──────────────────────────────────────────────────────┘
```

- 结构：`grid lg:grid-cols-[7fr_5fr] items-center gap-10`，hero 底为 `bg-cream`（或极浅 `bg-cream-deep`），**不用纯色大面积撞色**。
- 右侧图区是**「产品图拼贴」**：主图 `aspect-[3/4] rounded-card shadow-card overflow-hidden`，两张小图绝对定位错位叠放（`translate` 偏移 + 不同尺寸），营造「杂志内页插页」而非「商品橱窗」。**未来替换点**：整块图区外包一个 `data-slot="hero-image"` 的容器，将来换成一张全幅 lifestyle 图即可（见 §5）。
- 移动端：单列，标题在上、产品拼贴在下方。

**[2]「DISCOVER THE LATEST」商品 feed**：
- section 头：左侧 `.kicker`「DISCOVER THE LATEST」+ `H2`「New In / 新品」，右侧 `.link-line`「View All →」。
- 内容：`ProductGrid`（8 个精选，`grid-cols-2 lg:grid-cols-4`），卡样式见 §4.2。

**[3]「SHOP YOUR CATEGORY」分类 tile**：
- 6 tile（`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`），每 tile = **产品图底 + 覆盖渐隐 + 底部 caps 标签**，替代现站纯色块 tile。
- tile 结构：`aspect-[3/4]` 产品图（`object-cover`）铺满 + 底部 `bg-gradient-to-t from-ink/45 to-transparent` + 白字 `uppercase tracking-[0.14em] text-xs` 系列名 + `0n` 编号。hover：图 `scale-105`。
- 若某系列无主推图，则用 `media-placeholder`（见 §5）垫底，文字照常。

**[4]「STORY」品牌叙事块**（保留暖黑全宽，换字体与节奏）：
- `bg-ink text-cream py-24 md:py-32` 居中，`.kicker--on-dark`「OUR STORY」+ `text-3xl md:text-5xl font-semibold` 主句 + 暖棕/奶油黄引号 `「你挑选的不只是一只玩偶，而是与你共鸣的她」` + `link-line` 白字「Read the story」。

**[5]「SHOP THE MOOD」情绪专题**（新增，dogguo `Shop the look` 的本地化）：
- 横向 `overflow-x-auto` 或 `grid md:grid-cols-3`，每张「mood 卡」= 系列标题（caps）+ 1 张产品图 + 一句情绪文案 + `Shop this mood →`。
- 用「情绪」而非「系列」命名专题：`SPORTY / OUTDOOR / ELEGANT / PLAYFUL`，把「穿搭=情绪」的品牌点打出来。

**[6] Newsletter 激励条**：
- 全宽 `bg-brown-100`（浅棕）或 `bg-cream-deep`，左右两栏：左 `H2`「Join the Offy circle」+ 副文案；右 `NewsletterForm`（输入 + 主按钮并排，`rounded-full`）。

### 3.2 商店目录（`products/page.tsx`）

```
[1] 页头：.kicker「CATALOG」+ H1「All Looks / 全部形象」+ lede 一句
[2] 筛选条：caps 胶囊（All / 各系列），选中 = 实底 ink，未选 = 描边 paper（保留现逻辑，改 caps 与圆角）
[3] ProductGrid（全量，4 列）
```

- 保留现「`?series=`」筛选逻辑不动，只改样式：筛选胶囊 `rounded-full` → `rounded-full border border-sand px-4 py-2 text-xs uppercase tracking-[0.12em]`。
- 顶部加一条「`29 LOOKS · 3:4 白底产品图 · EST. 2026`」之类的 kicker 计数行（editorial 细节）。

### 3.3 商品详情（`products/[code]/page.tsx`）

```
桌面（grid-cols-1 lg:grid-cols-[6fr_5fr] gap-12）：
┌──────────────────────────────────────────────┐
│ 图区（sticky top-24）       │ 信息区           │
│  - 主图 3:4（bg-paper 大卡）│  - kicker: 系列名 │
│  - 形象选择器（横排缩略）    │  - H1 商品名      │
│                             │  - 价格（大）     │
│                             │  - 情绪标签 chips │
│                             │  - 尺寸表（细线） │
│                             │  - 加购 CTA（主） │
│                             │  - 收藏/分享（次）│
└──────────────────────────────────────────────┘
```

- **图区**：主图 `aspect-[3/4] rounded-card bg-paper overflow-hidden`，用 `object-contain`（避免裁掉玩偶主体；白底图在 `bg-paper` 上无缝）。`sticky top-24` 让图随滚不动（桌面）。
- **信息区**：顶部 `.kicker` 显示系列英文名；`H1` 用 `text-3xl md:text-4xl font-semibold`（不再 `font-black`）；价格 `text-2xl md:text-3xl font-medium tabular-nums`。
- **情绪标签**：由 `bg-cream-deep` chips 改为**描边文字**（`border border-sand text-ink-soft rounded-full px-3 py-1 text-xs`），更轻、更杂志。
- **尺寸表**：由 5 宫格色块改为**细线表格**（`divide-y divide-cream-line`，每行 label 左 / value 右），更 editorial。
- **形象选择器**：见 §4.5（圆头像 → 方/圆角 3:4 小卡）。
- 移动端 CTA 吸底：`sticky bottom-0 bg-cream/90 backdrop-blur border-t border-cream-line p-4`，内放主 CTA。

### 3.4 系列页（`collections/page.tsx` + `collections/[series]/page.tsx`）

**系列列表页**：
```
[1] 页头：.kicker「SERIES」+ H1 + lede
[2] 系列卡网格（grid sm:grid-cols-2 lg:grid-cols-3）：
    每卡 = 大图（3:4 产品图 / 占位）+ 覆盖底部标题条（系列名 caps + "n looks"）
```

- 用「图 + 覆盖标题」替代现「纯白卡 + 文字 + 下划线」；hover 图放大 + 阴影。

**系列详情页**：
```
[1] 页头：.kicker「SERIES 0n」+ H1 系列名 + tagline（lede）
[2] 系列「编辑导语」区块（可选）：一句系列情绪文案居中大字
[3] ProductGrid（该系列全部产品）
```

### 3.5 购物车（`cart/page.tsx`）与抽屉（`CartDrawer`）

- 页面：`max-w-5xl`，左列表右摘要（保留骨架）。行项：3:4 缩略 `w-16 aspect-[3/4] rounded-soft bg-paper` + 名称 + 单价 + 数量步进 + 删除（删除改 `.link-line` 文字，不用 `underline`）。
- 抽屉：改为 `bg-cream`（暖底，替代纯白），header 用 `cream-line` 分隔；空态用产品图占位 + 「Find an Offy that resonates with you」；CTA 用 `bg-accent`（行动色）。
- 摘要/合计用 `tabular-nums`，总额 `font-medium text-lg`。

### 3.6 结算（`checkout/page.tsx`）

- `max-w-5xl`，左表单右摘要（保留骨架）。表单卡 `rounded-card bg-paper p-6`，输入 `h-12 rounded-soft border border-sand bg-paper px-4 focus:border-brown-600 focus:ring-2 focus:ring-brown-100`。
- 提交按钮 `bg-accent text-cream`（**改 `text-paper` → `text-cream`**，暖字更协调），hover `bg-accent-deep`。
- 底部信任文案 `text-xs text-ink-muted`：「Test mode · USD · Stripe Checkout」。

### 3.7 品牌故事（`about/page.tsx`）—— 重排为 editorial 叙事页

```
[1] 全宽 hero：.kicker「OUR STORY」+ H1 大 slogan（2 行）+ lede（替代现纯文字标题）
[2] 图文交替段 A（Story）：图区 = 产品图拼贴/占位（3:4）+ 右文 `about.storyParagraphs`
    （**数组**，不再是 storyP1/P2/P3；文案见 `docs/our-story-source.md`）
[3] ~~团队块：bg-ink 全宽，JIE / 桃子 两张「编辑名片」卡~~ **已按文案表整块删除**
[4] ~~零售网络：细线列表：上海 TX 淮海 / 杭州 in77 / 曼谷 Warehouse30_6~~ **已按文案表整块删除**
[5] 未来 IP：改为复用首页的 `UpcomingCard`（标题取 `home.comingTitle`），
    插画来自 `后续计划.psd` 的智能对象；~~PSYCHE~~ 已定名 **Butterfly Sprite**
[6] 定制合作 CTA：居中大字 + link-line
```

- 团队/未来 IP/零售全部改掉 `bg-paper` 白卡堆叠，用「细线 + caps 标签 + 图占位」的杂志化处理，避免 PPT 感。

---

## 4. 组件视觉规范

### 4.1 导航（Header / 语言 / 搜索 / 购物袋）

- Logo：`PLAYCORE`（`font-display font-semibold text-lg tracking-tight`）。
- 导航项：`text-xs uppercase tracking-[0.14em] text-ink-soft hover:text-ink` + `link-line` 下划线动效。
- 语言切换：`text-xs uppercase tracking-[0.12em]` 胶囊描边。
- 购物袋：`Cart (n)` 文字 + 图标；角标 `bg-accent text-cream rounded-full h-4 min-w-4 text-[10px]`（替代珊瑚粗标）。

### 4.2 商品卡（`ProductCard`）——「画廊插页」式

```
┌───────────────────────┐
│  bg-paper 外框 p-2     │
│  ┌─────────────────┐  │
│  │ 产品图 3:4       │  │ ← 白底图内嵌，四周 8px cream 留边 =「打印插页」
│  │ (object-cover)   │  │
│  └─────────────────┘  │
│  （可选左上角徽章）     │
│ 名称（text-base）       │
│ 价格（medium）          │
└───────────────────────┘
```

- 外框 `rounded-card bg-paper p-2 shadow-soft`，内图 `rounded-[calc(var(--radius-card)-8px)] overflow-hidden aspect-[3/4] object-cover`，**白底图四周留 8px 边**——这是「有质感」的关键：白底产品图不再是死白大块，而是奶油底上的「内页印版」。
- hover：内图 `scale-[1.03]`（`300ms var(--ease-editorial)`）+ 外框 `shadow-card-hover`。
- 信息区：`pt-3`，名称 `text-base font-medium truncate`，价格 `text-sm font-medium text-ink-soft`（弱化价格、强化情绪，更 editorial）。
- 徽章只在 `featured` 时显示，样式改为 `bg-brown-100 text-brown-700 text-[10px] uppercase tracking-[0.14em] rounded-full px-2 py-0.5`（**放弃珊瑚「POP」贴纸**）。

### 4.3 按钮（`Button` / CTA）

| 变体 | 底 | 文字 | hover |
| --- | --- | --- | --- |
| 主（Primary） | `bg-ink` | `text-cream` | `bg-brown-700` |
| 行动（Accent，仅加购/结账） | `bg-accent` | `text-cream` | `bg-accent-deep` |
| 次级（Secondary） | `bg-transparent` | `text-ink` | `border-ink`（描边由 sand 变 ink） |
| 文字/下划线 | 透明 | `text-ink` + `.link-line` | 下划线收回 |

- 高度统一 `h-12 px-6 rounded-full text-sm font-medium`；hover 只做颜色/描边变化 + `translate-y-[-1px]`，**不做立体硬阴影贴纸**。
- 文案「Add to Bag / 加入购物袋」（保留现 key 值语义，可改字面）。

### 4.4 徽章（`Badge`）——「caps 标签」化

- 外观：`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]`。
- 配色（**克制，同屏不超 2 色**）：
  - 新/促销 → `bg-accent text-cream`
  - 限量/联名 → `bg-ink text-butter`
  - 环保再生 → `bg-leaf text-cream`
  - 系列/通用 → `bg-brown-100 text-brown-700`（描边式也可：`border border-sand text-ink-soft`）
- 取消 `pop-pink` / `pop-blue` 徽章，信息一律走棕/描边。

### 4.5 形象选择器（`ColorwayPicker`）——「挑一个她」

- 由**圆头像**改为**圆角 3:4 小卡**：`flex gap-2.5`，单项 `w-14 aspect-[3/4] rounded-soft overflow-hidden border`。
- 状态：默认 `border-sand`，选中 `border-brown-600 ring-2 ring-brown-100`，hover `border-brown-500`。
- 图 `object-cover`（3:4 白底图整张显示，比圆裁更能看到完整穿搭）；`title` 显示形象名。
- 选中切换大图：`200ms` 交叉淡入（`opacity` 过渡）。

### 4.6 Hero（复用 §3.1）与品牌叙事区块

- **Hero**：`min-h-[88vh]`，左文右产品拼贴；标题 `font-display font-semibold`；`.kicker` 打头；CTA 行「主胶囊 + 下划线链接」。
- **叙事区**：暖黑全宽 + `.kicker--on-dark` + 大字 + 黄油引号；或奶油底 + 超大居中引语 + 细线收尾。两种交替，形成节奏。

### 4.7 表单 / 步进器

- 输入：`h-12 rounded-soft border border-sand bg-paper px-4 text-base`；focus `border-brown-600 ring-2 ring-brown-100 outline-none`。
- 错误：`border-error` + 下方 `text-sm text-error`。
- 数量步进：`rounded-full border border-sand`，± 按钮 `w-10 h-10 text-ink-soft hover:text-ink`。

---

## 5. 图片处理规范（只用产品图 + 占位策略）

> 可用素材：`public/assets/products/p01.png ~ p29.jpg`（1080–1122 × 1448–1454，**3:4 白底产品图**）。**禁用 `public/assets/ins/`**。

### 5.1 产品图如何摆才「有质感」

1. **画廊插页法（商品卡/网格）**：白底产品图嵌在 `bg-paper` 卡内、四周留 **8px** 边（§4.2），让白底图变成奶油底上的「内页印版」，而非死白大块。这是对齐 dogguo「白图浮于奶油底」的核心手法。
2. **大图不裁主体（详情页）**：详情主图用 `object-contain` + `bg-paper`，完整保留玩偶轮廓；网格/拼贴用 `object-cover` 保证整齐。
3. **错位拼贴（hero/叙事）**：1 大 + 2 小产品图，用 `absolute` + `translate` + 不同 `rounded` 做不对称错位，制造杂志内页感（不并排对齐）。
4. **系列/分类 tile**：产品图 `object-cover` 铺满 + 底部渐隐遮罩 + caps 标签；图缺失时用占位块。
5. **情绪专题卡**：单张产品图 + 短情绪文案，图与文 7/3 或上下堆叠，克制。

### 5.2 缺失 hero/宣传图 —— 占位策略（硬约束下的标准答案）

**规则：任何需要 lifestyle/hero 图的位置，统一用以下三选一，且标记 `data-slot` 便于后续替换。**

| 方案 | 做法 | 适用 |
| --- | --- | --- |
| A. 纯色块 + 大字 | `bg-cream-deep`（或 `bg-brown-100` / `bg-ink`）+ 超大标题 + `.kicker` | 全宽 hero、叙事收尾 CTA |
| B. 产品图拼贴 | 1 大 + 2 小错位产品图（§5.1-3） | hero 图区、系列页头、故事页 |
| C. `media-placeholder` 组件 | 圆点纹理底 + 居中大写 `data-label` 文案 | 任何「未来替换成 lifestyle 图」的空位 |

- 每个占位容器加 `data-slot="hero-image"` / `data-slot="story-image"` 之类的标记，并在文件内注释「TODO: 替换为 lifestyle 图」。替换时只动这个容器，不动文字排版。
- `media-placeholder` 的 `data-label` 文案示例：`HERO IMAGE — TBD` / `LIFESTYLE — REPLACE ME` / `COMING SOON`。
- **不得**用 `/assets/ins/` 图临时垫底（违反硬约束）；若必须有一张「看起来像宣传图」的图，用**产品图 + 渐隐遮罩 + 大字标题**合成。

### 5.3 通用规则

1. 所有 `<Image>` 用 `next/image` + `sizes`；`loading="lazy"`（首屏 hero 除外）；占位背景色用 `cream-deep` 防白闪。
2. 不改色相、不加滤镜、不强行抠图，保真 Offy 形象。
3. 文件命名已映射到编码（`p01.png → PCOF1-F0` 等，见 `src/lib/catalog/products.ts`），后续「图↔编码」修正只改这一处。
4. 图片比例：商品 3:4；tile 3:4；拼贴 3:4 为主、可混 1:1 裁切局部；不做 16:9 拉伸。

---

## 6. 现站视觉评分（100 分制）与改进清单

### 6.1 评分

| 维度 | 得分 | 评语 |
| --- | --- | --- |
| 色彩与调性 | 14 / 20 | 暖黑+奶油底是对的骨血，但 `pop-coral/yellow/pink` 高饱和贴纸感过重，偏离 dogguo 的克制 editorial。 |
| 字体与排版 | 8 / 20 | **最大短板**：全站 `font-black` + Arial Black 街头风，与 dogguo 的 Sofia Pro 轻字重杂志感相反；缺全大写 kicker 体系。 |
| 布局与栅格 | 13 / 20 | 有「hero/featured/series/story/lookbook」骨架，但节奏偏「模板+PPT 色块」，缺 editorial 叙事节奏与 `Shop the look` 式情绪卖货。 |
| 图片与叙事 | 7 / 20 | **硬伤**：首页 hero、lookbook、about 直接引用 `/assets/ins/`（违反硬约束）；缺 hero/宣传图占位策略。 |
| 组件与动效 | 16 / 20 | 组件齐全（Button/Badge/Card/Drawer/Picker），动效克制可取；细节偏贴纸（硬阴影、POP 角标、圆头像选择器）。 |
| **总分** | **58 / 100** | 骨架可用、执行及格，但「质感/气质」与 dogguo 目标差距主要在**字体、配色克制度、ins 图违规、叙事结构**四处。 |

### 6.2 P0（必须先做，一票否决）

1. **换字体气质**：全站去除 `font-black` 与 Arial Black 视觉，改 `font-display` 为 Avenir Next/Futura 几何无衬线 + `font-semibold`（§2.3）；新增 `.kicker` editorial 标签体系。
2. **清空 `/assets/ins/` 引用**：`page.tsx`（hero + lookbook）与 `about/page.tsx` 三处 ins 图全部改为产品图拼贴 / 色块占位（§5.2）。这是硬约束，不可妥协。
3. **重做首页 Hero**：从「2 列 + ins 图」改为全宽 editorial campaign hero（左文右产品拼贴 + 透明 Header + 公告条）。
4. **替换 `globals.css` token**：按 §2.1 全量替换 + §2.2 对照表全局改名；`pop-*` 降饱和为 `accent/sky/leaf/butter`。

### 6.3 P1（随后做，显著提质）

5. **商品卡「画廊插页」化**：白底图四周 8px 留边 + 弱化价格、强化情绪（§4.2）。
6. **首页增 `Shop the Mood` 情绪专题 + 分类 tile 改图底**：替代现 ins lookbook 与纯色块 series（§3.1）。
7. **详情页形象选择器改 3:4 小卡**（替代圆头像）；情绪标签改描边、尺寸表改细线（§3.3）。
8. **按钮/徽章去贴纸**：删硬阴影贴纸、POP 角标，改 caps 标签与克制行动色（§4.3/4.4）。
9. **Footer/about 杂志化**：细线 + caps 标签 + 图占位，去白卡堆叠（§3.0/3.7）。
10. **动效统一**：过渡统一 `300ms var(--ease-editorial)`，位移只做 `translate-y-1` 级小漂移，`prefers-reduced-motion` 降级。

---

## 附：落地提示（给 Web/实现专家）

1. 先改 `globals.css`（§2.1），再跑一次 `pnpm build` 找 `bg-ink-900` 等旧 token 报错，按 §2.2 逐一替换。
2. 新增共享组件：`MediaPlaceholder`（`.media-placeholder` 的 React 封装）、`Kicker`、`LinkLine`、`ColorwayPicker`（3:4 卡版）。
3. 首页 hero / 叙事区先按「方案 B：产品图拼贴」实现，留 `data-slot` 注释，等 lifestyle 图到位后只换容器。
4. 文案新增 i18n key：公告条、`SHOP THE MOOD`、`DISCOVER THE LATEST`、`SHOP YOUR CATEGORY`、各 mood 名；旧 key（featured/lookbook）可保留映射或删除。
5. 参照 dogguo 复刻细节清单：透明 Header（滚动变色）、全大写 kicker、`Shop the look/mood`、newsletter 激励条、`Cart (n)` 角标、Swiper 可选轮播（移动端 hero 拼贴）。
