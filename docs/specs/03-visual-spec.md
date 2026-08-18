# Offy 视觉设计系统（Visual Spec）

> 文档编号：`03-visual-spec.md` · 归属：美术设计专家
> 输入：`docs/brand-brief.md`、`resources/ins/`（23 张）、`resources/产品修图/`（29 张）
> 参考站：[casetify.cn](https://www.casetify.cn/iphone-cases/iphone-17-pro-max-cases)（主风格）、[dogguo.com](https://dogguo.com/)（品牌宣传）、[littlebeast.co](https://littlebeast.co/)（品牌宣传）
> 工程约束：Next.js 15 + Tailwind CSS v4（`@theme` 语义 token）+ 系统字体栈（无 next/font/google）+ 中英双语（next-intl）。

---

## 0. 品牌视觉关键词与调性

**一句话调性概括：**
> 一只有街头脾气的黑肤色小精灵，把「情绪穿在身上」——用暖奶油底托住黑棕主色，再用波普高饱和撞色当句号，既潮又软、既亲民又有个性。

**视觉关键词（按权重排序）：**

| 关键词 | 落地方式 |
| --- | --- |
| 街头 / 潮流 | 大面积暖黑 + 粗壮几何标题（Display 字重）+ 贴纸式徽章 + 高对比撞色 |
| 波普（Pop） | 红橙 / 黄 / 蓝三原色点缀，纯色块底 + 加粗描边感的「贴纸/印章」元素 |
| 可爱 / 玩偶 | 大圆角（16–24px）、奶油底、圆点/胶囊按钮、柔和暖阴影 |
| 情绪 / 穿搭叙事 | 品牌页用「大图叙事 + 情绪化排版」，把产品当「造型化身」而非商品陈列 |
| 温暖 / 陪伴 | 暖奶油背景替代纯白，暖棕替代冷灰，阴影带棕调 |

**调性护栏（一票否决项）：**
1. 不用冷灰（`#94a3b8` 系）做中性色——所有中性色必须带暖棕倾向。
2. 不用纯黑 `#000000` 做大面积背景——用暖黑 `#201B16`。
3. 点缀色是「调料」不是「主菜」——单屏内高饱和色使用面积不超过 ~10%，其余交给黑/白/奶油。

---

## 1. 色彩系统

### 1.1 语义 Token（Tailwind v4 `@theme` 直出）

```css
@theme {
  /* —— 中性色：暖黑 / 奶油 / 暖棕（替代冷灰） —— */
  --color-ink-900: #201b16;   /* 主文字 / 标题 / 主按钮 / 页脚底 */
  --color-ink-700: #4a4037;   /* 次级文字 */
  --color-ink-500: #7a6e60;   /* 弱文字 / 说明 / 占位 */
  --color-cocoa-600: #6b4b33; /* 暖棕：品牌深色块 / hover / 次级按钮 */
  --color-cocoa-400: #9a7b5f; /* 暖棕浅阶：描边强调 */
  --color-cream-50:  #faf5ec; /* 页面主背景（暖奶油，替代纯白） */
  --color-cream-100: #f3eada; /* 卡片浅底 / 交替 section */
  --color-sand-200:  #e4d6be; /* 描边 / 分隔 / 禁用底 */
  --color-paper:     #ffffff; /* 纯白：产品白底卡 / 输入框 / 弹层 */

  /* —— 波普点缀色（高饱和，克制使用） —— */
  --color-pop-coral: #ff4d2e; /* 主 CTA 点缀 / 促销 / 收藏 / 关键高亮 */
  --color-pop-yellow:#ffc531; /* 徽章 / 优惠 / 高亮 */
  --color-pop-blue:  #3d6bff; /* 链接 / 信息 / 选中态 */
  --color-pop-pink:  #ff7aa2; /* 可爱强调 / 女性化系列 */
  --color-pop-green: #2ec56b; /* 库存 / 环保再生系列标签 */

  /* —— 语义色 —— */
  --color-success: #1f9d55;   --color-success-bg: #e4f6ea;
  --color-error:   #e5484d;   --color-error-bg:   #fdebec;
  --color-warning: #f5a623;   --color-warning-bg: #fef1dd;
  --color-info:    #3d6bff;   --color-info-bg:    #e8eefe;
}
```

> 实现提示：把现有 `src/app/globals.css` 里的占位 `--color-brand-*`（indigo）整体替换为上表 token；
> 组件一律用语义 token（`text-ink-900`、`bg-cream-50`），禁止散落硬编码 hex。

### 1.2 角色分配（在哪里用什么）

| 角色 | Token | 用途 |
| --- | --- | --- |
| 主色（深） | `ink-900` | 标题、正文、主按钮底、header/页脚、价格 |
| 主色（品牌） | `cocoa-600` | 次级按钮底、hover、品牌大色块、banner 底 |
| 背景 | `cream-50` | 全站默认背景 |
| 浅底 | `cream-100` / `sand-200` | 卡片、section 交替、描边 |
| 纯白 | `paper` | 商品白底卡、购物车抽屉、输入框 |
| 点缀（主） | `pop-coral` | 唯一「行动」色：加购、结账、促销价、收藏 |
| 点缀（次） | `pop-yellow` / `pop-blue` / `pop-pink` / `pop-green` | 徽章、标签、系列分类、氛围 |
| 语义 | `success` / `error` / `warning` / `info` | 表单校验、库存、提示条 |

**配色比例建议（60 / 30 / 10）：**
- 60% 奶油 + 白（背景 / 卡面）
- 30% 暖黑 + 暖棕（文字 / 色块 / 结构）
- 10% 波普点缀（按钮 / 徽章 / 高亮）

**对比度红线（WCAG AA）：**
- 正文必须 `ink-900` 或 `ink-700` 打在 `cream-50` / `paper` 上；`ink-500` 只用于 ≥14px 的弱说明。
- 白字按钮底必须 `ink-900` / `cocoa-600` / `pop-coral`；`pop-yellow` 上只用黑字。

---

## 2. 字体系统

### 2.1 字体栈（纯系统栈，无 next/font/google）

```css
@theme {
  --font-display: "Arial Black", "Avenir Next", "Helvetica Neue", "SF Pro Display",
                  "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-sans: -apple-system, "SF Pro Text", "Segoe UI", Roboto,
               "Helvetica Neue", "PingFang SC", "Hiragino Sans GB",
               "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
```

**规则：**
- **英文 / 数字**优先命中 `Arial Black`（粗壮、无衬线、自带街头波普感），打不中则落到 `PingFang SC`。
- **中文标题**用 `PingFang SC` / `Microsoft YaHei` 的加粗档（`font-weight: 700–900`），不追求宋体衬线。
- **标题字重**用 `700`（中文）与 `900`（英文 Display）双档；中文过重会糊，正文用 `400/500`。
- 全部字号走 Tailwind 默认阶梯（`text-*`），不自定义 px 级字阶，保证响应式一致。

### 2.2 字阶表（Tailwind v4 直接映射）

| 层级 | Tailwind 类 | px / rem | 字重 | 行高 | 用途 |
| --- | --- | --- | --- | --- | --- |
| Display XL | `text-7xl` ~ `text-8xl` | 72–96px | 900 (EN) / 700 (CN) | 1.0 | 品牌 hero、lookbook 大标语 |
| Display | `text-5xl` ~ `text-6xl` | 48–60px | 900 / 700 | 1.05 | 首页 hero、宣传页章节标题 |
| H1 | `text-4xl` | 36px | 800 / 700 | 1.1 | 页面标题 |
| H2 | `text-3xl` | 30px | 700 | 1.15 | section 标题 |
| H3 | `text-2xl` | 24px | 700 | 1.2 | 卡片区标题 / 商品名（大） |
| H4 / 价格 | `text-xl` | 20px | 700 | 1.3 | 卡片标题 / 价格标签 |
| 强调正文 | `text-lg` | 18px | 500 | 1.6 | 导语、卡片副标题 |
| 正文 | `text-base` | 16px | 400 | 1.75 | 段落（中文行高放宽） |
| 辅助 | `text-sm` | 14px | 400 | 1.6 | 说明、导航、表单标签 |
| 徽章 / 脚注 | `text-xs` | 12px | 600 | 1.4 | 徽章、SKU、脚注、法律文本 |

**中英混排排版规则：**
- 标题 `letter-spacing`：英文 `-0.02em`（收紧）、中文 `-0.01em`；大字号中文可 `0` 避免粘连。
- 中英文之间自动留 `0.5` 字宽空格（文案层保证，不在 CSS 做）。
- 价格一律 `font-display` + `tabular-nums`（数字等宽），符号 `¥/$` 用小一号上标。

---

## 3. 布局与栅格

### 3.1 全局容器与间距

- 内容容器：`max-w-7xl`（1280px），两侧 `px-4 sm:px-6 lg:px-8`。
- 栅格间距：网格 `gap-4`（16px），section 纵向 `py-16 md:py-24`。
- 断点沿用 Tailwind 默认（`sm 640 / md 768 / lg 1024 / xl 1280`），不做自定义断点。

### 3.2 商品网格（Casetify 式「选款」核心）

- **卡片比例**：统一 `aspect-[3/4]`，图片 `object-cover` 铺满。
- **列数响应式**：`grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`（手机 2 列、桌面 4 列）。
- **卡片结构（自上而下）**：图（3:4）→ 商品名（H4，单行省略）→ 价格行（价格 `text-xl` 粗 + 促销价对比）→ 系列徽章（可选角标叠加在图左上）。
- **信息密度**：与 Casetify 一致，商品网格内不堆文案——图是主角，名称 + 价格两行封顶。

### 3.3 商品详情页

```
桌面（lg 以上，两列 5/7）：
┌─────────────────────────────────────────────┐
│  图区（3:4 大图 + 底部缩略图条）  │  信息区  │
│                                 │  - 系列徽章│
│                                 │  - 商品名(H1)│
│                                 │  - 价格(大字)│
│                                 │  - 穿搭/情绪文案│
│                                 │  - 形象选择器(见 5.5)│
│                                 │  - 数量 + 加入购物车(主 CTA)│
│                                 │  - 收藏/分享(次要)│
└─────────────────────────────────────────────┘
```
- 移动端：单列，图在上、信息在下，CTA 吸底固定（`sticky bottom-0`）。
- 左图右信息桌面 `grid-cols-1 lg:grid-cols-[7fr_5fr]`；图区白底 `bg-paper`、四周 `rounded-2xl`。

### 3.4 品牌宣传页（dogguo / littlebeast 式「大图叙事」）

**版式骨架（一屏一情绪，交替推进）：**

1. **全幅 Hero**：`h-[80vh]` 大图铺满（ins 图）+ 叠加超大 Display 标语（错位、局部描边色块），主 CTA 贴纸按钮。
2. **图文交替段**：`grid-cols-1 md:grid-cols-2`，一侧 3:4 全幅大图，一侧情绪化文案（大标题 + 短句 + 弱化说明），图片与文案「不对称错位」（图片 `md:translate-y-8` 之类）制造街头杂志感。
3. **Lookbook 拼贴网格**：`grid-cols-2 md:grid-cols-3` 不等高 `masonry`（CSS `columns-2 md:columns-3`），ins 图 3:4 混排，插入 1–2 个纯色块/引语卡打破节奏。
4. **收尾 CTA**：暖黑全宽色块 + 白色大标题 + 珊瑚主按钮。

**情绪化排版要点：**
- 大标题可与图片**叠压**（`-mt-10` 覆盖），文字局部用 `pop-*` 色或白色描边感（`text-stroke` 仅做增强，不作依赖）。
- 引语（如「你挑选的不只是一只玩偶，而是与你共鸣的她」）用 `text-3xl md:text-5xl` + `font-display` 居中大排，作为独立「屏幕」。
- 中文 slogan「让想象落地，让陪伴发生」拆成两行 + 色块高亮关键词。

---

## 4. 组件样式规范

> 统一设计变量：圆角三档 `rounded-lg 8px / rounded-xl 12px / rounded-2xl 16px / rounded-3xl 24px`；
> 阴影统一暖棕调；过渡统一 `200ms ease-out`（见 §7）。

### 4.1 按钮（Button）

| 变体 | 底 | 文字 | 描边 | 圆角 | hover | 高度/内边距 |
| --- | --- | --- | --- | --- | --- | --- |
| 主（Primary） | `bg-ink-900` | `text-paper` | 无 | `rounded-full` | `bg-cocoa-600` + `translate-y-[-1px]` | `h-12 px-6` |
| 强调（Accent） | `bg-pop-coral` | `text-paper` | 无 | `rounded-full` | 加深 `#e63d20` | `h-12 px-6` |
| 次级（Secondary） | `bg-paper` | `text-ink-900` | `border border-sand-200` | `rounded-full` | `border-ink-900` | `h-12 px-6` |
| 幽灵 / 文字 | 透明 | `text-ink-900` | 无 | `rounded-full` | `bg-cream-100` | `h-10 px-4` |
| 禁用 | `bg-sand-200` | `text-ink-500` | 无 | `rounded-full` | 无 | 同上 |

- 全站按钮用**胶囊**（`rounded-full`）呼应「贴纸/印章」街头感；贴纸式 CTA 可再叠 `shadow-[0_8px_0_#201b16]` 硬阴影制造立体贴纸效果（仅 hero）。
- 阴影：常态 `shadow-sm`，hover `shadow-md`；主 CTA hover 加 `shadow-lg`。

### 4.2 卡片（Card）

- 商品卡：`rounded-2xl overflow-hidden bg-paper`，图片区 `aspect-[3/4]`，图 hover 放大（见 §7）。
- 阴影：常态 `shadow-[0_4px_16px_rgba(32,27,22,0.06)]`，hover `shadow-[0_12px_32px_rgba(32,27,22,0.12)]`。
- 内容区 `p-4`，标题/价格贴左，徽章贴左上角图内（绝对定位）。

### 4.3 徽章（Badge）

- 外观：`rounded-full px-2.5 py-0.5 text-xs font-semibold`，实心或描边两式。
- 配色规则（波普三原色轮换，同屏不超 3 色）：
  - 新/促销 → `bg-pop-coral text-paper`
  - 限量/联名 → `bg-ink-900 text-pop-yellow`
  - 环保再生系列 → `bg-pop-green text-paper`
  - 系列通用 → `bg-pop-yellow text-ink-900`
  - 中性信息 → `bg-cream-100 text-ink-700`

### 4.4 价格标签

- 现价：`font-display text-xl md:text-2xl font-bold text-ink-900 tabular-nums`。
- 促销对比价：现价 `text-pop-coral` + 原价 `text-ink-500 line-through text-sm`。
- 货币符号上标小一号；「¥」紧跟数字无空格，「$」前无空格（按语言）。
- 折扣可加珊瑚徽章「-20%」。

### 4.5 形象选择器（Colorway / 形象切换，详情页核心）

- **容器**：横向 `flex gap-3`，每项是一个**圆形形象缩略**。
- **单项**：`w-12 h-12 rounded-full overflow-hidden border-2`；默认 `border-sand-200`，选中 `border-ink-900` + 外圈 `ring-2 ring-pop-coral ring-offset-2 ring-offset-paper`；hover `border-cocoa-400`。
- 缩略图内是形象头像裁切（`object-cover`），下方或 `title` 显示形象名。
- 选中态同步更新左侧大图（图片切换带 `200ms` 淡入，见 §7）。

### 4.6 购物车抽屉（Cart Drawer）

- **容器**：右侧滑入，`fixed right-0 top-0 h-full w-full max-w-md bg-paper`，`rounded-l-2xl`，`shadow-2xl`。
- **结构**：header（标题 + 关闭）→ 商品列表（`divide-y divide-sand-200`）→ footer（合计 + 去结账主按钮，`bg-cream-50 border-t`）。
- **行项**：`flex gap-4 p-4`，左 3:4 缩略 `w-16 aspect-[3/4] rounded-lg`，右 名称 + 形象 + 数量步进 + 小计 + 删除。
- **遮罩**：`bg-ink-900/40 backdrop-blur-sm`，点击关闭。
- **空态**：居中 Offy 形象 + 「购物袋还空着」+ 逛商品按钮。

### 4.7 表单（输入 / 选择）

- 输入框：`h-12 rounded-xl border border-sand-200 bg-paper px-4`，focus `border-ink-900 ring-2 ring-cream-100`。
- 错误态：`border-error` + 下方 `text-sm text-error` 提示（配 `--color-error-bg` 提示条）。
- 数量步进器：`flex items-center rounded-full border border-sand-200`，内 ± 按钮 `w-10 h-10`。

---

## 5. 图片处理规范

| 场景 | 比例 | 处理 | 圆角 |
| --- | --- | --- | --- |
| 产品图（商品卡 / 详情） | **3:4**（约 1080×1440） | 白/浅底保持原样，`object-cover` 居中裁切 | 卡片 `rounded-2xl` |
| ins / lookbook 品牌图 | **3:4**（2551×3437） | 全幅 `object-cover`，不裁成方形 | `rounded-2xl` 或全出血无圆角 |
| Hero / 封面 | 16:9 或全屏 `80vh` | 大图 `object-cover object-center`，可叠加 `bg-ink-900/30` 渐变保证文字可读 | 无（全出血） |
| 形象缩略（选择器） | 1:1 方形裁切 | `object-cover` 聚焦面部/头部 | `rounded-full` |
| 缩略图条 | 3:4 小图 | `w-16 aspect-[3/4]` | `rounded-lg` |

**通用规则：**
1. 所有 `<Image>` 用 `next/image` + `sizes` 提示；素材由 `resources/` 拷贝进 `public/` 引用（勿外链）。
2. 产品图保持白底不强行抠图；白底图放在 `bg-paper` 卡上，与 `cream-50` 页面底形成「白卡浮于奶油底」的层次。
3. 图片统一加 `loading="lazy"`（首屏 hero 除外），占位色用 `cream-100` 避免白闪。
4. 可选增强：hover 时产品图轻微放大 + 渐变遮罩（见 §7），但**不得**改色相/加滤镜，保真 Offy 形象。
5. 文件命名建议映射到编码（如 `PCOF1-F0-bagcharm.jpg`），便于「产品图 ↔ 编码」后期修正（见 brief §9）。

---

## 6. 动效基调（克制）

**原则：动效服务于「选款 → 加购」的顺滑与品牌可爱感，不炫技、不打断。**

| 交互 | 参数 | 实现 |
| --- | --- | --- |
| 全局过渡基准 | `200ms ease-out` | `transition-all duration-200 ease-out` |
| 卡片 hover | 图 `scale-105` + 阴影加深 | `group-hover:scale-105` |
| 按钮 hover | `translate-y-[-1px]` + 阴影 | 见 §4.1 |
| 徽章 / 链接 hover | 色阶加深或下划线滑入 | `transition-colors` |
| 抽屉滑入 | `translate-x-full → 0`，`280ms cubic-bezier(0.16,1,0.3,1)` | 进场；关闭反向 |
| 遮罩淡入 | `opacity 200ms` | 与抽屉同步 |
| 形象切换 | 大图 `200ms` 交叉淡入 | `opacity` 过渡 |
| 页面滚动入场 | 淡入上移 `translate-y-4 → 0`，`300ms`，`prefers-reduced-motion` 关闭 | 首屏与关键 section |

**硬约束：**
- 尊重 `prefers-reduced-motion`：全部位移动效降级为淡入或不执行。
- 不做自动轮播自动播放；如需 hero 轮播，给手动指示器与暂停。
- 所有动效只作用于 `transform` / `opacity`（合成层友好），避免 layout/box-shadow 动画卡顿。

---

## 7. 落地清单（供 Web 专家/实现参考）

1. `src/app/globals.css`：替换 `--color-brand-*` 为 §1.1 的完整 token，并新增 `--font-display`。
2. `src/app/layout.tsx`：`body` 改为 `font-sans bg-cream-50 text-ink-900 antialiased`。
3. 抽 4 个原子设计 token 常量（若有共享层）：`radius` / `shadow` / `duration` / `easing`（`rounded-full`、`200ms ease-out`）。
4. 通用 `Card`、`Button`、`Badge`、`Price`、`CartDrawer`、`ColorwayPicker` 组件先按本 spec 建，再进入页面。
5. 品牌宣传页复用 §3.4 骨架，ins 图 3:4 全幅为主、产品图 3:4 白底为辅，二者不混用同一卡片样式。
6. 双语文案下：英文标题用 `Arial Black` 粗壮风，中文标题用 `PingFang SC` 加粗，字号阶梯一致。

---

## 附：参考站设计语言摘录（用于对齐）

- **casetify.cn**：白底极简 + 大图商品陈列 + 强黑 CTA + 高密度「选款」网格；用户从「选型号 → 选款 → 加购结账」一气呵成，是我们的**商品交互主参考**（主风格）。
- **dogguo.com**（[Limely 案例](https://www.limely.co.uk/inspiration/project/dogguo.com)）：editorial 杂志式大图叙事、暖中性底、插画点缀、情绪化排版——品牌宣传页参考。
- **littlebeast.co**（[3 人团队宠物时尚案例](https://www.cifnews.com/article/188292)）：以「故事/情绪」为卖点的生活方式叙事，软色 + 高级大片，用于强化 Offy「情绪穿搭」的品牌叙事语气。

> 三者合成一句话方向：**用 Casetify 的极简高效商品流 + dogguo/littlebeast 的编辑式情绪叙事，套上 Offy 的黑棕暖奶油底 + 波普撞色。**
