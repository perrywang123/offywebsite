# 老板 6 项优化 · 可执行实施方案

> 技术负责人合成稿。输入：老板 6 项诉求 + 五方专家评审（电商产品 / 美术设计 / 交互 / 研发 / 测试）。
> 本稿把所有分歧收敛成**可执行结论**，并给出**实测数据**（取色、接缝、命中区）与**验收断言**。
> 仓库基线：`aadf2a3`（工作区干净）。**本文件只做规划，不改任何业务代码。**

---

## 0. 结论速览

| # | 诉求 | 动作 | 定性 | 必须一起处理的事 |
|---|---|---|---|---|
| 1 | 头图隐藏 View Details + 左右箭头 | 用开关控制**不渲染**（逻辑保留，一行可恢复）；**同时把整屏链接从屏 1/2 扩展到全部 5 屏** | 箭头=纯减法；CTA=**必须补偿**，否则 60% 头图面积变死区 | 屏 3-5 整屏包 `<a>` ⟹ CTA 的 `<a>` **必须不在 DOM**（否则 `<a>` 嵌套非法） |
| 2 | 去掉滚动促销黑条 | 删 `page.tsx` 的 `<Marquee>`；删组件 + 单测 + keyframes | 纯减法（同文案在 Header sticky 条已常驻） | **保留 `common.promoMessages` 这个 i18n key**（Header 在读）；删 3 个未使用局部变量 |
| 3 | 删 NEW ARRIVALS | 删 `NewsGrid.tsx:67-69` 的 badge `<span>`；`badge` 改可选 | 纯减法 | **把释放的 `8.27cqw` 补回 h3 的 `mt`**，否则大标题上移 28–42px |
| 4 | PDP 删上面那排小图 | 删 `[code]/page.tsx:117-144` 的 siblings 横滑行 | **判定为「同系列其它商品」，功能零损失** | **`min-w-0` 必须保留**（自图集最多 10 张，比原来更宽） |
| 5 | 去底纹换取色纯色 | 删 3 处 `<Image>`；NEWS 段补 `bg-[#efefef]` | 纯减法 + 真实性能收益（少 3 个全幅 `/_next/image`） | 三张图底色**与现有 CSS 逐位相同**，不需要新增色值 |
| 6 | 页脚排版统一 | FAQ / CONTACT US 换成与 MENU 列**完全同一套类** | 纯减法，且是**回归已写下的 spec**（`brand-site:287`） | Legal & Policies 保持 `text-cream/50`，**不得再降到 /40**（会跌破 AA） |

**一句话**：6 项里只有诉求 1 的 CTA 是真实功能损失（用整屏链接补回），诉求 4 的位置价值有损失（建议后续补「看整个系列」文本入口，列为可选项）。其余 5 项是纯减法或回归既有 spec。

---

## 1. 诉求 5 的取色结果（**实测，非估算**）

### 1.1 采样方法（可一条命令复核）

工具：bundled Python —— `/Users/peiyuwang/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3`（Pillow 12.3.0 + numpy 2.3.5）。

图片：`public/assets/home/` 下 `ls` 确认存在三张底纹图（另有 `collab-ips.png` / `teaser-doll.png` / `upcoming-butterfly.png` / `upcoming-kitty.png` 与本次无关）：

```
news-bg.jpg      276022 B   3250x2786
category-bg.jpg  123463 B   3250x5848
upcoming-bg.jpg   61156 B   3251x2823
```

五个步骤，缺一不可：

1. **全图精确 RGB 直方图取众数**（24bit 键，不量化）→ 得到"文字外背景纯色"的候选与占比；
2. **2% 边缘环带逐通道中位数**（上/下/左/右四条带，各去掉最外 2px 的 JPEG 振铃）→ 这是**最终采用的取色口径**。中位数对残留文字像素不敏感（均值敏感）；
3. **四角 patch（宽 10% × 高 8%）中位数** → 交叉验证四角是否同色；
4. **渐变检测**：41 条全宽行中位数 + 41 条全高列中位数 + 6×6 分块中位数，看逐通道极差（=0 即无渐变）；
5. **命中占比**：与主色最大通道差 ≤0/2/4/8/16 的像素占比；再用 >4 的掩膜算非背景像素的 bbox、最深墨色、与主色的 WCAG 对比度。

**为什么取边缘带中位数而不是全图中间调 / 最浅色**：
- 不取全图中位数 —— 只要图里有一块大面积深色主体，全图中位数就会被拉偏（本次侥幸没偏，因为幽灵字只占 0.05–3.17%）；
- 不取"最浅像素" —— JPEG 高光会有 `#f4f4f4` 之类离群点；更危险的是"白水印压灰底"的素材会把 section 直接刷白；
- 边缘带中位数 + 三条校验判据（四角互差 ≤2/255、行/列中位数极差 = 0、±4 命中率 ≥95%）全过，才判定为"纯色平底，可直接当 CSS 值"。

### 1.2 实测结果

| 文件 | 尺寸 | **采样色（边缘带中位数）** | 众数 | 众数占比 | ≤±4 命中占比 | 四角 | 行/列中位数极差 | 6×6 分块极差 | 边缘带 std | 是否渐变 |
|---|---|---|---|---|---|---|---|---|---|---|
| `news-bg.jpg` | 3250×2786 | **`#efefef`** (239,239,239) | `#efefef` | **96.31%** | **96.83%** | 四角全 `#efefef` | 0 / 0 | [0,0,0] | 0.00 | **无** |
| `category-bg.jpg` | 3250×5848 | **`#f7f7f9`** (247,247,249) | `#f7f7f9` | **98.90%** | **99.00%** | 四角全 `#f7f7f9` | 0 / 0 | [0,0,0] | 0.00 | **无** |
| `upcoming-bg.jpg` | 3251×2823 | **`#f7f7f9`** (247,247,249) | `#f7f7f9` | **98.29%** | **98.45%**（≤±8 已 99.95%） | 四角全 `#f7f7f9` | 0 / 0 | [0,0,0] | 0.00 | **无** |

**幽灵字（=非背景内容）实测**

| 文件 | 非背景占比 | bbox（x%, y%） | 最深墨色 | 幽灵字与底色对比度 | 内容 |
|---|---|---|---|---|---|
| `news-bg.jpg` | 3.17% | x 16.7–83.3，y 5.0–13.6 | rgb(218,218,218) | **1.216 : 1** | `BROWSE CATEGORIES / THAT INTEREST YOU`（两行） |
| `category-bg.jpg` | 1.00% | x 33.2–66.7，y 2.1–10.0 | rgb(231,231,233) | **1.154 : 1** | `is.offy` 字标 |
| `upcoming-bg.jpg` | 1.55% | x 36.5–65.5，y 4.5–15.8 | rgb(236,236,238) | **1.103 : 1** | `STAY / TUNED.`（两行） |

三条判据全过：**三张都是纯色底 + 顶部一处幽灵字，零渐变 → 不存在"非纯色底需要替代方案"的情况。**

### 1.3 关键发现：老板要的取色值，CSS 里**已经是这个值**

| section | 采样色 | 当前实现 | 结论 |
|---|---|---|---|
| NEWS（`page.tsx:66`） | `#efefef` | **没有 bg 类**，靠 `body{background:var(--background)}`（`globals.css:121` = `#efefef`）透出 | 逐位相同。**要补显式 `bg-[#efefef]`** |
| SHOP BY CATEGORY（`page.tsx:111`） | `#f7f7f9` | 已写死 `bg-[#f7f7f9]` | 逐位相同，**不动** |
| UPCOMING（`page.tsx:206`） | `#f7f7f9` | 已写死 `bg-[#f7f7f9]` | 逐位相同，**不动** |

也就是说诉求 5 的 (b)「改成取色色值」在数学上**已经是现状**，真正要做的只有 (a) 移除三张 `<Image>`。
两处硬编码 `#f7f7f9` 是历史上为 `object-contain` 的留白补的底色，与采样值吻合，**反证取色口径正确**。

**必须显式写 `bg-[#efefef]` 的理由**（不是洁癖）：NEWS 段今天显示 `#efefef` 是**层叠副作用** —— `body` 上同时挂着 Tailwind 的 `bg-cream`(`#ffffff`) 和 `globals.css:174` 的**无层级** `body{background:var(--background)}`，今天靠"无层级声明压过 `@layer utilities`"显示为 `#efefef`。谁把那条规则挪进 `@layer base`，首页底色就整体变白。
**注意不要写 `bg-background`**：`--background` 定义在 `:root` 而非 `@theme`，Tailwind v4 不生成该工具类（已在 `.next/static/css` 验证不存在）。用 `bg-[#efefef]`，与同文件既有的 `bg-[#f7f7f9]` 写法一致。

### 1.4 建议固化的采样脚本（P5 一并提交）

```bash
# 复核命令（本方案的数据就是这条命令产出的）
/Users/peiyuwang/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 \
  scripts/sample-bg-color.py public/assets/home/news-bg.jpg
```

建议把本次的一次性脚本落盘为 `scripts/sample-bg-color.py`，输出「色值 + 命中占比 + bbox + 极差」，让任何人一条命令复核同一个数，而不是重跑一段聊天记录里的代码。

---

## 2. 逐项落点

### 诉求 1｜头图隐藏「查看详情」+ 左右箭头

**涉及文件**：`src/components/home/HeroCarousel.tsx`、`src/components/home/HeroCarousel.test.tsx`

**专家判断（必答）：隐藏后轮播还能用，自动轮播照常。**
- 自动轮播：`HeroCarousel.tsx:39-43` 的 `setInterval(..., intervalMs)`（`page.tsx:55` 未传参 → **默认 5000ms**）只依赖 `slides.length` 与 `intervalMs`，与箭头 / CTA **零耦合** → **隐藏后自动轮播照常**。
- 手动切换还剩两条：5 个 `role="tab"` 指示条（`:265-283`，真按钮、可点、可键盘聚焦、能直达任意屏）+ 触摸滑动（`:214-224`，`SWIPE_THRESHOLD = 40`）。
- 唯一降级：箭头是**桌面鼠标**最直观的切换入口，隐藏后桌面只剩"2.8px 视觉高度"的指示条 + 自动轮播，**可发现性下降**（功能不丢）。补 pointer 拖拽 / 暂停控件列为后续待办（见 §7 风险）。

**隐藏口径：用开关控制「不渲染」，不是加 `hidden` 类。** 三个理由：
1. 老板说"隐藏不是删除逻辑" —— 用一个显式开关常量即可满足，恢复只需改一行；
2. **技术上必须不渲染**：隐藏 CTA 后要给屏 3-5 补整屏 `<a>`，而 `<a>` 内套 `<a>` 是非法 HTML，SSR 输出的嵌套锚点会让浏览器解析器提前闭合外层 `<a>` → hydration mismatch。**两者只能取一**；
3. 加 `hidden` 类在 jsdom 里不生效（Tailwind CSS 不加载），`HeroCarousel.test.tsx` 的断言会**假绿** —— 测试继续断用户已看不见的 UI。用开关不渲染，断言才表达真实契约。

**具体改法**（新增文件顶部常量块）：

```tsx
/**
 * 老板 2026-10 诉求 1：头图隐藏「查看详情」胶囊与左右箭头。
 * 用开关而不是删代码——呈现层隐藏，逻辑保留，改回 true 即恢复。
 * 注意：CTA 关闭时，屏 3-5 会改走 wrapScreenLink 整屏包链接（否则这 3 屏
 * 将没有任何可点元素，重新引入历史上修过的 P1-1「头图点哪儿都没反应」）。
 * 因此 CTA 与整屏链接是互斥的：不能既保留 CTA 的 <a> 又给整屏包 <a>。
 */
const SHOW_HERO_DETAILS_CTA = false;
const SHOW_HERO_ARROWS = false;
```

| 元素 | 位置 | 改法 |
|---|---|---|
| 「查看详情」CTA | `:133-149`（`<Link href={s.href!} className="group absolute top-1/2 right-0 … rounded-full border-[1.5px] …"`） | 在 `renderSeriesOverlay` 里把整个 `<Link>` 用 `{SHOW_HERO_DETAILS_CTA && (…)}` 包住 |
| 左右箭头容器 | `:292-319`（`<div className="absolute top-[84.8%] right-[2.8%] flex gap-1 lg:top-[76.3%]">` + 两个 `<button aria-label={t("heroPrevSlide"/"heroNextSlide")}>`） | 整个容器用 `{SHOW_HERO_ARROWS && (…)}` 包住 |
| **屏 3-5 整屏链接** | `renderOverlay` `:174-203` | 重构为：先算出屏内容 `inner`（wordmark 分支 / series 分支），再统一 `return wrapScreenLink(s, inner)`。这样 5 屏全部整屏可点 |
| 指示条命中区 | `:277` `after:h-[calc(100%+2.5rem)]` | 箭头隐藏后不再有"向下扩会抢箭头命中区"的约束（`:262-264` 注释）。改为按开关取值：箭头关闭时 `after:h-[calc(100%+2.65rem)]`，把 375px 下的有效命中高度从 **≈43px 提到 ≈45px**，过 44px 门槛。**视觉尺寸一点不动**（仍 `h-[1.18%]`） |
| 注释 | `:45-50`、`:262-264`、`:284-291` | 同步改写：`wrapScreenLink` 的注释要从「屏 3-5 不包（内部已有自己的链接）」改成「全屏包；CTA 由开关控制，关闭时不渲染」 |

**恢复路径**：`SHOW_HERO_DETAILS_CTA = true` 时，`renderOverlay` 必须同时**不**给 series 屏包整屏链接（回到今天的结构），否则嵌套锚点。实现上用同一个常量做分支即可。

**i18n**：`home.heroDetailsCta` / `heroPrevSlide` / `heroNextSlide` 三个 key **保留**（开关翻回 true 时要用）。

**连带功能损失（须老板知悉）**：无。整屏链接补回后，5 屏全部可点，首页对 `/collections/*` 的内链从"CTA 3 条"变成"整屏 3 条"，SEO 内链数不减。

---

### 诉求 2｜去掉滚动促销黑条（Marquee）

**涉及文件**：`src/app/[locale]/page.tsx`、`src/components/Marquee.tsx`（删）、`src/components/Marquee.test.tsx`（删）、`src/app/globals.css`

**先确认靶子没打错 —— 站上有两条黑底促销条：**

| | 首页 Marquee（**要删的**） | Header 顶部 promo 条（**保留**） |
|---|---|---|
| 位置 | `page.tsx:59-61`（hero 下方，页内流内） | `Header.tsx:23` + `:63-71`（`sticky top-0 z-50`） |
| 形态 | **横向滚动**，多条促销语用 `— is.offy —` 拼接 | 单条**淡入淡出**轮播（`PROMO_ROTATE_MS = 4500`） |
| 文案来源 | `promoMessages.join("  —  is.offy  —  ")`（`page.tsx:26-27`） | **同一个** `common.promoMessages`（`t.raw`） |
| 判定依据 | 老板截图里的 `…OFFY）— IS.OFFY — $15 USD…` **分隔符只存在于 `page.tsx:27` 的 join 串**；且老板说的是"**滚动**"字幕 | 一次只显示一条，不可能出现分隔符 |

→ **靶子 = 首页 Marquee。Header 那条保留**（它是全站唯一载体，删了满赠/运费信息才是真净损失；且它参与 `--header-h` 的测量）。

**具体改法**（`page.tsx`）：
1. 删 `:15` 的 `import { Marquee } from "@/components/Marquee";`
2. 删 `:25-27` 的三个局部变量 `tCommon` / `promoMessages` / `promoLine`（否则 `pnpm lint` 因未使用变量报错）
3. 删 `:58-61` 的 `{/* 促销条 */}` 注释 + `<Marquee>…</Marquee>` JSX

**组件与动画的去留：删除。** `grep -rn "<Marquee" src/` 确认全站只有首页(`page.tsx:59`)一处使用 —— 保留一个无人引用的组件只会让下一个读者以为促销条还在。
- 删 `src/components/Marquee.tsx`、`src/components/Marquee.test.tsx`
- 删 `globals.css:76-84` 的 `--animate-marquee` 与 `@keyframes marquee`（Tailwind v4 不引用就不产出，但留着是死代码）
- **绝对不要删 `messages/{en,zh}.json` 里的 `common.promoMessages`** —— `Header.tsx:23` 用 `t.raw("promoMessages")` 取值，删 key 后 `:26` 的 `.length` 与 `:69` 的 `promoMessages[promoIndex]` 会退化成"取字符串的字符"，全站顶部条直接坏掉。
- 回滚路径：git 历史里有完整组件（`git show aadf2a3:src/components/Marquee.tsx`）。

**信息损失 = 0**：同一份 `promoMessages`（`messages/en.json:56-59`）在 Header sticky 条上**全站每页**轮播；头图屏 2 还有实时文字 `BUY ANY 3 OFFYs, GET A FREE BIG TOTE`。删掉的是首页的重复曝光。

---

### 诉求 3｜删掉 NEW ARRIVALS —— **先确认元素**

**截图里指的是哪个元素：确认是主卡顶部居中的那个 badge，不是别的。**

| 判据 | 证据 |
|---|---|
| 代码位置 | `NewsGrid.tsx:66-69`：`<div className="absolute inset-x-0 top-0 flex flex-col items-center px-[8%] pt-[6.6%] text-center sm:px-[14%]"><span className="text-ink text-[max(11px,4.77cqw)] leading-none … uppercase">{texts.badge}</span>` |
| 文案来源 | `page.tsx:96` `badge: t("newsBadge")` → `messages/en.json:95` = `"New Arrivals"`（zh = `"新品上市"`），CSS `uppercase` → 显示为 `NEW ARRIVALS` |
| 位置 | 在主卡大标题 `h3`（`:70-72`，`ROMANTICIZING EVERYDAY LIFE`）**之上**，与该 section 的唯一 badge ✓ |
| **不是**干扰项 | `ProductCard.tsx:32` 的 `badgeLabel` 文案是 **`New in`**，不是 `NEW ARRIVALS` → 与本诉求无关，**不要改** |
| **不是**干扰项 | `page.tsx:48` 的 `badge: visitorCountry` 是 `regionals` 的国家徽章（US/UK ONLY）→ 无关 |
| **不是**干扰项 | `page.tsx:82-84` 的段标题 `{newsKicker}·{newsTitle}`（= `News·The Latest from OFFY`）→ 保留 |

> 方位澄清：老板说"左上角"，但代码是**顶部居中**（`items-center text-center`），`docs/design/mobile/home.png` 里也是居中压在大标题上方。全页只有这一个 badge，指认唯一；"左上角"是方位描述不精确。

**定性：纯减法，而且删掉的是一句没有数据支撑的宣传语。** 主卡绑定 `newsFeature = { productCode: "warm-biscuit" }`（`src/lib/content.ts:31`），而 `warm-biscuit` 在本地目录里**不是 featured**（`featured` 只来自本地快照，`local?.featured ?? false`），站点自己的新品机制（`ProductCard` 的 `featured` → `New in` 角标）在这张卡上**永远不会触发**。删掉它降低误导风险。
转化路径零损失：整张卡可点（`NewsGrid.tsx:49-53` → `/products/warm-biscuit`）+ 底部黑色胶囊 CTA（`:75-77`）都保留。

**⚠️ 必须补间距，否则是视觉回归。** 主卡文字块是 flex column（无 margin 折叠）：
- badge 行高 = `text-[max(11px,4.77cqw)] leading-none` = 字号本身
- 大标题 `mt-[3.5cqw]`
- 删掉 badge 后标题上移 **`calc(max(11px,4.77cqw) + 3.5cqw)`**：375px（卡宽 343）≈ **28px**；1440px（卡宽 ≈510）≈ **42px**

**默认读法：把标题位置钉住**（老板只要求删一行字，没要求重排；PSD 里徽章 y6.6% / 标题 y12.9% 是有意的构图）。最小改动 —— 只改 h3 一个类：

```
- mt-[3.5cqw]
+ mt-[calc(max(11px,4.77cqw)+3.5cqw)]
```

（也可以用容器 `pt-[6.6%]` → 补等量，但 `%` padding 与 `cqw` 混用可读性差；改 `mt` 一行最优。）

**具体改法**（`NewsGrid.tsx`）：
1. `NewsGridTexts`（`:6-11`）：`badge: string` → `badge?: string`（**接口保留、不删字段**，避免调用点与测试的字面量同时大改）
2. 删 `:67-69` 的 `<span>{texts.badge}</span>`
3. `:70` 的 h3 `mt-[3.5cqw]` → `mt-[calc(max(11px,4.77cqw)+3.5cqw)]`
4. `:18-19` 的 PSD 注释（写着 "NEW ARRIVALS(img y6.6%)"）同步改写为"badge 已按老板要求移除，标题 y12.9% 位置由 mt 补偿钉住"

**i18n：保留 `home.newsBadge`（en/zh 两份都不动）。** 理由：`dictionaries.test.ts` 要求 en/zh key 集合完全一致；`ProductCard.tsx:21` 的注释把它当作同义文案登记处引用着；保留 = 零风险、跨分区零耦合。删 key 列为**可选的后续清理**（若要做，必须 en/zh 同删 + 同批删 `page.tsx:96` 的传参 + 改 `ProductCard.tsx:21` 的注释）。

---

### 诉求 4｜PDP 删上面那排小图 —— **关键判断：是「同系列其它商品」，不是「本商品多图切换」**

**判定依据（四条互相独立，全部指向同一结论）**

| # | 判据 | 证据 |
|---|---|---|
| 1 | **截图里每张小图下面有常显商品名** | `PREP S… / MADAM… / DIVA / MORI / LADY P… / GLOW` 来自 `[code]/page.tsx:138-140` 的 `<span className="text-ink-soft w-14 truncate text-center text-[11px]">`（56px 容器把 `LADY PEARL` 截成 `LADY P…`）。而 `ProductGallery` 的缩略图是 `<button>` + `<Image alt="">`，**物理上不渲染任何可见文字**，名字只存在于 `aria-label`（`ProductGallery.tsx:47-49`） |
| 2 | **DOM 语义不同** | siblings 排每项是 `<Link href={/products/${sibling.code}}>`（`:123-128`）→ 跳**别的商品**；`ProductGallery` 每项是 `<button onClick>`（`ProductGallery.tsx:40-52`）→ 切**同一件商品的不同图**（`:12-14` 注释明说"缩略图是按钮而不是链接"） |
| 3 | **名字集合唯一命中 playful-life 系列** | `PREP SCHOOL` / `MADAME WILD` / `DIVA` / `GLOW` / `MORI` / `LADY PEARL` 六款全部同属 `playful-life`；数量正好 = `slice(0, 6)` |
| 4 | **和下面那排是字面重复** | `siblings.slice(0, 6)` 在 `:122`（小图条）与 `:246`（More from this series 网格）出现**两次**，数据源同一个 `siblings`（`:78-80` = 同系列排除本商品）→ 同一批 6 款、同一批 href 渲染了两遍。这才是老板说的"重复" |

**结论：删 siblings 排，保留 `ProductGallery` 与 More 网格。删掉不损失任何主图切换能力**（实测该系列商品在 Shopify 有 2–4 张图，`ProductGallery` 由 `images.length > 1` 独立触发）。护栏：若判断反了去删 `ProductGallery`，它的 3 个单测会立刻红。

**具体改法**（`src/app/[locale]/products/[code]/page.tsx`）：
1. 删 `:117-144`（注释 + `{siblings.length > 0 && (<div className="hscroll mt-4 gap-2.5 pb-2">…</div>)}`）
2. **保留 `:106` 的 `min-w-0`** —— 这一条最容易漏。注释只说"两条横滑条 6×56px=386px"，但删掉 siblings 后剩下的自图集来自 Shopify `images(first: 10)`，**最多 10×56 + 9×10 = 650px**，比 386px **更宽**；没有 `min-w-0`，375px 下横向溢出（历史实测 `scrollWidth` 402）会复现。`ProductGallery.test.tsx` 也仍在断言 `.hscroll` 存在
3. 改 `:99-103` 的注释：把"那两条横滑条（自图集 / 同系列缩略图）"改成"自图集一条"，并说明 10 张图上界
4. `Image` import **保留**（`:249` 的 More 网格仍在用）
5. `ProductGallery.tsx` **不动**

**位置价值损失（记录在案）**：这排小图的位置是**决策点换款**（桌面在 `lg:sticky lg:top-24` 的图列里，与购买按钮同屏；移动端夹在主图和标题/价格之间）。删掉后换款入口只剩页面底部的 More 网格（要滚过描述、尺寸表、加购按钮）。
→ **可选补偿（建议做，成本一行）**：在标题/价格区（`:151-167`）附近加一行文本链 `View the whole series →`，指向 `/collections/${product.series}`。**默认不在本次范围内**（老板只说删，未要求补），列为待确认项。

**交付说明必须写清**：若该商品在 Shopify 有多张图，**主图正下方仍会有一条无文字的小图切换条**（`ProductGallery`）。那是本商品自己的图集，是**预期保留**的，不是漏删。如果老板的本意是"主图下面一条小图都不许有"，那是另一个需求（会牺牲主图切换能力），需单独确认。

---

### 诉求 5｜去底纹图 + 取色纯色背景

**先确认三张图分别对应哪个 section（与老板截图 5/6/7 逐一对上）**

| 截图 | section | 底纹内容 | 图片引用 | section 现有 bg |
|---|---|---|---|---|
| 截图 5 | NEWS（`page.tsx:66`） | `BROWSE CATEGORIES / THAT INTEREST YOU` 浅灰幽灵字 | `:67-73` | **无**（靠 body `#efefef`） |
| 截图 6 | SHOP BY CATEGORY（`:111`） | 巨大的 `is.offy` 字标幽灵图 | `:112-118` | `bg-[#f7f7f9]` |
| 截图 7 | UPCOMING RELEASES（`:206`） | `STAY / TUNED.` 幽灵字 | `:207-213` | `bg-[#f7f7f9]` |

**取色值（实测，见 §1.2）**：`#efefef` / `#f7f7f9` / `#f7f7f9`。

**具体改法**（全部在 `page.tsx`）：
1. NEWS 段：删 `:67-73` 的 `<Image src="/assets/home/news-bg.jpg" … object-contain object-top />`；给 `:66` 的 `<section className="relative overflow-hidden">` **补 `bg-[#efefef]`**；改 `:63-65` 的注释
2. SHOP BY CATEGORY 段：删 `:112-118` 的 `<Image src="/assets/home/category-bg.jpg" … />`；`:111` 的 `bg-[#f7f7f9]` **保留不动**；改 `:106-110` 的注释
3. UPCOMING 段：删 `:207-213` 的 `<Image src="/assets/home/upcoming-bg.jpg" … />`；`:206` 的 `bg-[#f7f7f9]` **保留不动**；改 `:203-205` 的注释
4. UPCOMING 段 `:219` 的注释（"是底图 upcoming-bg.jpg 里烤好的水印，不重复渲染"）同步改写
5. **修正 `:63-65` 的过时注释**：它声称 NEWS 模块"顶部有一条柔和的过渡渐变带" —— **像素数据不支持**（41 条行中位数逐通道极差 = 0，全图唯一非底色内容就是 y5.0–13.6% 的幽灵字）。这条注释描述的正是老板现在要拆的东西，别照着它去找渐变
6. `Image` import **保留**（`:232`/`:247` 的 `teaser-doll.png` 等仍在用）

**布局影响：零。** 三处都是 `<Image fill>`（`position:absolute; inset:0`），不参与文档流，section 高度 = 内容 + `.section-y`。删掉零几何变化。
**但零视觉变化是错的**：`object-contain object-top` 让图按宽等比缩放、下方留白本来就露出 section 底色，所以**除幽灵字消失外画面颜色完全不变**。

**性能收益（真实）**：三张源图 276KB + 123KB + 61KB = **~460KB**，尺寸高达 3250×5848，且都带 `sizes="100vw"` → Next 会生成接近全宽的变体。首页一次性去掉 3 个全幅 `/_next/image` 请求，对移动端 LCP 是净收益（`news-bg` 就在首屏附近）。

**顺带解开的历史包袱**：`docs/specs/mobile-adaptation-plan.md:134/236/247/259/356` 把这三个 section 列为"padding 同时决定底图缩放"的耦合风险项，`:247` 更把"满幅底图"列入**明确保留、不为适配牺牲的 7 件事**。删掉底图后这类耦合整体消失 —— 这是本次改动最有价值的**隐性收益**，但同一份文档会立即过时，必须同步标注。

**资产处置：删文件。** `grep` 确认三张 jpg 全仓只被 `page.tsx` 三处引用（`docs/`、`scripts/`、`docs/image-inventory.md` 均无耦合，后者由 `scripts/sync-assets.mjs` 生成且只覆盖 products）。删掉后回滚路径是 git 历史。

---

### 诉求 6｜页脚排版统一

**⚠️ 先纠正一个前提（这是本项最关键的判断）：FAQ / CONTACT US 的「左边缘」其实已经和左边两列对齐了，不存在水平偏移。**

依据：`.tap-target--quiet`（`globals.css:276-279`）**只有 block 轴的** `padding-block: 0.875rem; margin-block: -0.875rem`，**没有任何横向 padding/margin**；`.tap-target, .tap-target--quiet`（`:270-275`）是 `display: inline-flex; align-items: center; min-height: 2.75rem`，也不含横向内边距。MENU / COLLECTIONS 的链接（`Footer.tsx:41-54`、`:58-64`）与 HELP 面板的两个链接（`:74-79`）用**同一个 `linkCls`**，都从各自 grid 列的左边缘起排，容器（`:35`）与 `<nav>`、内层 `<div>` 均无横向内边距。

屏幕上看到的"不对齐"是 **18px 半粗 display 字体 vs 12px 常规 sans 的光学错觉**（字号 18 vs 12、字重 600 vs 400、字体族 display vs sans、明度 cream vs cream/70，四项差异叠加），**不是盒模型偏移**。
→ 所以只要统一字号字重，**左边缘对齐自动满足**；**绝对不要**加 `-ml-*` 之类的对齐 hack —— 那会真的把文字推歪。

**这是「回归 spec」，不是「偏离设计」**：`openspec/specs/brand-site/spec.md:287-289` 早就写明政策/帮助组
> The policy group SHALL use the same kicker, **link size**, tracking and hover treatment as the existing MENU and COLLECTIONS groups

现在的 `panelLinkCls` 是上一轮"大字入口"改造引入的偏离（`git show --name-only 2c4697c` 显示那次改版一个 openspec 文件都没碰，spec-first 被跳过）。老板这次的要求 = 把它改回 spec 的原意。

**具体改法**（`src/components/layout/Footer.tsx`）：
1. 删 `:25` 的 `panelLinkCls`（`${linkCls} font-display text-lg font-semibold uppercase tracking-[var(--tracking-14)] text-cream`）
2. `:73` 的 HELP 面板容器 `flex flex-col items-start gap-3` → 换成与 MENU 列**完全同一套**：
   `<div className="text-cream/70 flex flex-col gap-3 text-xs tracking-[var(--tracking-14)] uppercase">`
3. `:74` / `:77` 两个 `<Link>` 的 className 从 `panelLinkCls` → **`linkCls`**（与 `:42-53` 逐字节相同）
4. **保留 `.tap-target--quiet`**（它在 `linkCls` 里）：命中区仍 44px，视觉行高不动
5. `:81-88` 的 Legal & Policies 块 **不动**：保留 `text-xs` + `text-cream/50` + `border-cream/10 border-t` + `›`（aria-hidden）
6. `:10-13`、`:24`、`:26-28`、`:66-70` 的注释全部同步改写 —— 否则下一位维护者看到"设计稿的四级层级 / 两个大字入口"的注释会把大字改回去

**字号基准：`--tracking-14`（跟 MENU 列）。** 左两列自身并不一致（MENU `tracking-14`、COLLECTIONS `tracking-10`）。老板说"和左边两列对齐"，MENU 是第一列、也是最自然的锚点。
→ **默认不动 COLLECTIONS 的 `tracking-10`**（老板只提了 FAQ / Contact Us；12px 下 0.02em ≈ 0.24px，肉眼不可辨）。作为残留项记录。

**层级怎么维持（4 个不依赖字号的杠杆）**：
1. **分组线** `border-cream/10 border-t` + `mt-5 pt-4`（`:81`）—— 主入口在线上、二级在线下
2. **颜色阶** 主入口 `cream/70`（对比 **9.01:1**）vs 二级 `cream/50`（**5.21:1**）—— 两档都过 WCAG AA 4.5:1
3. **装饰符** `›`（`aria-hidden`，不进可读名）
4. **位置** 栏目名正下方 / 分隔线之下

**⚠️ 硬边界：不要把 Legal & Policies 的透明度继续往下压。** 在 `#1d1915` 底上 `text-cream/50` ≈ **5.2:1（过 AA）**，`text-cream/40` 会掉到 ≈ **3.8:1（不达标）**（12px 属"正常文字"，不适用大字例外）。也不建议降到 11px —— 全站 11px 只留给 `.kicker`（`globals.css:197-198` 的既有约定），12→11 视觉上读不出层级。

**已知代价（记录在案）**：FAQ / Contact Us 是**售后信任与求助入口**，从 18px 半粗降到 12px 常规会降低被注意概率。缓解：44px 命中区 + hover 提亮 + 仍在第 4 列首位。这是老板明确要求的取舍。

**顺带收益**：统一后 HELP & SUPPORT 列高从 ~121px 收到 ~97px，与 MENU 列（~100px）基本齐平 → 四列底边节奏变整齐。

**测试要改**：`Footer.test.tsx:138-152` 现在断言 `faq.className` 含 `"text-lg"`、`legal.className` 含 `"text-xs"`、`faq.className` 含 `"text-cream"` —— 统一后 `:145-146`、`:149` 会失败。
**注意这个用例本身就是弱断言**：`expect(faq.className).toContain("text-cream")` 会因为 `"text-cream/50"` 也含子串 `text-cream` 而**恒真**（假绿）。重写时改成断言**与 MENU 列同类名**（这才真正表达"对齐"这个契约），别再用子串。

---

## 3. 歧义处理：逐条采用默认读法 + 理由

| # | 歧义 | **采用** | 理由 |
|---|---|---|---|
| A1 | 诉求 2 的黑条：首页 Marquee 还是 Header 顶部 promo 条？ | **只删首页 Marquee**，保留 Header 条 | 截图里的 `— IS.OFFY —` 分隔符只存在于 `page.tsx:27` 的 `join` 串；Header 一次只显示一条，不可能出现分隔符。删 Header 条会让满赠/运费信息在全站失去唯一载体 —— 那才是真净损失，且会连带影响 `--header-h` |
| A2 | 诉求 1 的「隐藏」口径：`display:none` 留 DOM / `sr-only` / 不渲染？ | **用开关不渲染**（`SHOW_HERO_DETAILS_CTA = false`） | ①满足"隐藏不是删除逻辑"（开关一行恢复）；②`<a>` 嵌套非法 → 若 CTA 留在 DOM 又要给屏 3-5 包整屏链接，SSR 会输出嵌套锚点导致 hydration mismatch；③`hidden` 类在 jsdom 里不生效会让测试假绿；④`opacity-0`/`sr-only` 会留下看不见但可聚焦/可点的幽灵控件（WCAG 2.4.7 反例） |
| A3 | 隐藏 CTA 后屏 3/4/5 无可点元素，是否允许整屏可点？ | **允许，且必须做** | 不补的话 5 屏里 3 屏（60% 曝光时长）整屏不可点，等于重新引入历史上修过的 P1-1 缺陷。整屏链接零视觉变化、不新增元素、可访问名取标题+副标题（比什么都没有强）。`wrapScreenLink` 已是现成机制 |
| A4 | 箭头隐藏后指示条命中区仅 ≈43px，差 44px 门槛 1px，能否扩 `::after`？ | **允许**，`2.5rem` → `2.65rem`（仅箭头关闭时） | 纯命中区调整，视觉尺寸一点不动（`h-[1.18%]` 不变）；箭头关闭后"向下扩会抢命中区"的约束消失。375px 下 2.78 + 42.4 ≈ **45.2px** ✓ |
| A5 | 诉求 3：删 badge 后大标题原地不动还是上移？ | **原地不动**（补 `mt`） | 老板只要求删一行字，未要求重排；PSD 里 y6.6%/y12.9% 是有意的构图，上移 28–42px 是未被要求的位移 |
| A6 | 诉求 3：`home.newsBadge` key 删不删？ | **保留**（en/zh 都不动） | `dictionaries.test.ts` 要求 key 集一致；`ProductCard.tsx:21` 注释引用它；保留 = 零风险、跨分区零耦合。`NewsGridTexts.badge` 改为可选 prop |
| A7 | 诉求 4：删的是带名字那排还是无名字那排？ | **删带名字的 siblings 排**（`[code]/page.tsx:117-144`），保留 `ProductGallery` | 四条独立判据见 §2 诉求 4。截图里的名字物理上不可能来自 `ProductGallery`（它不渲染可见文字）。若判断反了，`ProductGallery` 的 3 个单测会立刻红 |
| A8 | 诉求 4：删后要不要补"看整个系列"入口？ | **本次不补**，列为待确认 | 老板原话只要求删。补是低成本（一行）但属新增设计元素，应由老板点头。记录在风险里 |
| A9 | 诉求 5：(b) 取色值等于现有底色，是否还改？ | **只把 NEWS 段补显式 `bg-[#efefef]`**，另两处不动 | 取色结果与现状逐位相同 → 不做"美化式加深"。但必须显式声明：今天的 `#efefef` 是层叠副作用（无层级 `body{}` 压过 `@layer utilities`），谁把那条规则挪进 `@layer` 首页底色就整体变白 |
| A10 | 诉求 5：三张 jpg 删不删？ | **删文件** | 全仓仅 `page.tsx` 三处引用；git 历史可回滚；留在 `public/` 是死文件（~460KB，不会被 tree-shake） |
| A11 | 诉求 5：幽灵字要不要用 CSS 重画保留叠印感？ | **不重画**，保持纯色 | 老板原话是"去掉底纹图"。幽灵字对比度只有 1.10–1.22:1，不是可读元素，只是一层纸纹。若日后仍觉平，用实时 CSS 文字重画（`#E0DCDC` on `#EFEFEF` 等），**不要放回 JPG** |
| A12 | 诉求 6：统一到哪一档字号？ | **左列 MENU 的 12px 档**（`text-xs` + `tracking-14` + `text-cream/70`） | 与 `brand-site:287` 早已要求的"同字号同字距"一致；不引入新字号标度 |
| A13 | 诉求 6："对齐"是列内左对齐还是移到 MENU 列同 x？ | **列内左对齐 + 四列排版属性一致**，不做栅格结构合并 | 左边缘机械上本来就一致（`.tap-target--quiet` 无横向 padding）。改前先量一次 `getBoundingClientRect().left`，若差值本就是 0，就证明只需统一字号字重 |
| A14 | 诉求 6：左两列自身 tracking 不一致（14 vs 10），要不要一并收？ | **不动 COLLECTIONS** | 老板只提了 FAQ / Contact Us；扩大改动面无收益（12px 下 0.02em ≈ 0.24px） |
| A15 | 诉求 2+5 叠加后 hero 与 NEWS 硬接缝，补不补分隔线？ | **补 1px `border-b border-cream-line`** 到头图外层 `<section>` | 实测数据：hero 底边随屏切换在 `#fefefe`(Δ15) / `#f7f2ef`(Δ8) / `#bdc3c7`(Δ50) / **`#4e4d4f`(Δ163)** 之间跳 —— 5 秒一轮，"看不见的淡线"与"硬边"反复切换。补线把接缝固定成设计线（`--color-cream-line: #e3e3e3`）。属 1px 新增元素，老板可否决（否决则接受硬边，**但不要**在 NEWS 顶部加渐变） |
| A16 | 流程：走不走 spec-first？ | **走**，且**先归档 `2026-10-11-mobile-adaptation`** 再开本 change | `AGENTS.md` 强制；且该 in-flight change 已 45/45 完成但未归档，其 delta 有 3 条与本单直接冲突（见 §6）。先原样归档再改会让 spec 立刻自相矛盾 |
| A17 | 流程：6 项合成一个 change 还是拆 6 个？ | **合成一个 change** | 诉求 2 与 5 在同一文件相邻 15 行（`page.tsx:58-73`）、共享同一次接缝验收，拆开必然要改两遍注释、看两次接缝 |

---

## 4. 布局连带影响（诉求 2 与诉求 5 都在动首页节奏）

### 4.1 结论：**不需要补任何间距代码，但需要补一条 1px 分隔线**

**诉求 2（删 Marquee）**
- Marquee 是**正常流内的块**（`Marquee.tsx:15`：`border-y` 2px + `py-3` 24px + 内层 `text-xs` 行盒 16px ≈ **42px**；`docs/design/mobile/home.png` 在 375px 量得 y358–406 = **48px**，差异可能来自 strut/取整）。删掉后下方所有 section **整体上移该值**。
  → **验收时先量后改**：改前记录 `.animate-marquee` 最近 `border-y` 容器的 `getBoundingClientRect().height`，改后断言 `body.scrollHeight` 恰好少这个值。
- 各 section 的节奏来自 `.section-y`（`globals.css:202-213`，48/80/112px）与 `.container-site`，**与 Marquee 无耦合**（无相邻兄弟选择器、无负 margin 补偿）→ **不需要补间距**。手工塞 `mt-*` 反而会破坏 48/80/112 的成套规范。
- `--header-h` 由 Header 自己的 `ResizeObserver` 自测（`Header.tsx:43-59`），Marquee 不在 header 内 → **不受影响**，sticky 子 tab 定位照旧。
- **真正的观感变化是"分隔带没了"** → 见 4.2。

**诉求 5（删底纹图）**
- 三处都是 `<Image fill>`（`position:absolute; inset:0`），**不参与高度计算** → **零布局影响**，不需要动 `.section-y` / `.container-site`。
- `#efefef` ↔ `#f7f7f9` 的两档底色差（8/255 ≈ 1.07:1）**仍然存在**，section 分层不靠底图。

### 4.2 唯一需要人眼判断的点：hero ↔ NEWS 接缝（**已用数据定案**）

实测头图素材底边 5% 中位色（`public/assets/hero/*.jpg`，I 帧最长者）：

| 头图 | 底边 5% 中位色 | Δ vs NEWS `#efefef` |
|---|---|---|
| `hero-brand.jpg`（屏 1） | `#bec3c7` | **50** |
| `hero-promo.jpg`（屏 2） | `#f7f2ef` | **8** |
| `hero-princess.jpg`（屏 3） | `#fefefe` | **15** |
| `hero-streetwear.jpg`（屏 4） | **`#4f4d50`** | **162** |
| `hero-playful.jpg`（屏 5） | `#fefefe` | **15** |

→ 今天这条边被 Marquee 的黑色 `border-y`（`--color-sand: #d4d4d4`）遮住了；删掉后它会**每 5 秒在 Δ8 与 Δ162 之间来回跳**。
**采用（A15）**：给 `page.tsx:54` 的 `<section className="relative overflow-hidden">` 补 `border-b border-cream-line`，把接缝固定成一条 1px 设计线（`#e3e3e3`）。
**否决时的退路**：接受硬边，**但不要在 NEWS 顶部加渐变** —— `page.tsx:63-65` 注释里那条"柔和的过渡渐变带"代码与图里都不存在，是错注释（本次一并修正）。

### 4.3 顺序调整：**无**

section 顺序从 `hero → promo bar → news → shop by category → …` 变成 `hero → news → shop by category → …`，其余不变。
`openspec/specs/brand-site/spec.md:10` 那句 section 顺序需要 MODIFIED delta。

### 4.4 三张底图删除后 section 会不会"变平"？不会

- 三张图 **96.31% / 98.90% / 98.29%** 的像素本来就是那个纯色，画面本来就是平的。
- 层次仍由：标题字号（30–68px）、`.section-y` 的 48/80/112 纵向节奏、相邻 section 的 `#EFEFEF ↔ #F7F7F9` 两档底色共同承担。
- 幽灵字最多影响 section 面积的 ~8–13%，且对比度只有 1.10–1.22:1（WCAG 非文本对比要求 3:1）—— 它不是可读元素。
- **反例提醒**：不要为了"填空"去收紧这三个 section 的 `.section-y`。

---

## 5. 分区开发计划

**分区原则**：同一文件不得出现在两个分区。分区之间只允许"合入顺序"依赖，不允许文件重叠。

| 分区 | 诉求 | 文件清单（每个文件只属于一个分区） | 可独立验证？ |
|---|---|---|---|
| **P1｜PDP** | 4 | `src/app/[locale]/products/[code]/page.tsx` | ✅ 改动面最小、与他区零共享 → **先做，建立无回归基线** |
| **P2｜页脚** | 6 | `src/components/layout/Footer.tsx`、`src/components/layout/Footer.test.tsx` | ✅ 同文件闭环（先改断言再改类名） |
| **P3｜NewsGrid 组件** | 3 | `src/components/home/NewsGrid.tsx`、`src/components/home/NewsGrid.test.tsx` | ✅ 独立（`badge` 改可选 + 不再渲染 + `mt` 补偿） |
| **P4｜头图** | 1 | `src/components/home/HeroCarousel.tsx`、`src/components/home/HeroCarousel.test.tsx` | ✅ 组件级隔离，只需先拍板 A2/A3 |
| **P5｜首页编排 + 促销条 + 底纹 + 素材** | 2 + 5 | `src/app/[locale]/page.tsx`、删 `src/components/Marquee.tsx`、删 `src/components/Marquee.test.tsx`、`src/app/globals.css`、删 `public/assets/home/{news,category,upcoming}-bg.jpg`、新增 `scripts/sample-bg-color.py` | ✅ 一次 `page.tsx` 编辑做完全部 4 处（诉求 2 + 3 的传参 + 5） |

**文件重叠检查**：`page.tsx` 只在 P5；`globals.css` 只在 P5；`messages/*.json` 本次**没有任何分区改动**（`newsBadge` 保留、`promoMessages` 保留）；`ProductGallery.tsx` 无分区改动。

### 5.1 依赖与合入顺序

```
Phase 0  spec-first：先 `pnpm exec openspec archive 2026-10-11-mobile-adaptation`，
         再新建 openspec/changes/<id>/ 并写 brand-site + commerce 两处 delta，
         `pnpm exec openspec change validate <id>`
            │
Phase 1  P1（PDP / 诉求4） ──┐  互不干扰，可并行
         P2（Footer / 诉求6）─┤
         P4（Hero / 诉求1）  ─┘
            │
Phase 2  P3（NewsGrid / 诉求3）  ← 必须先于 P5
            │
Phase 3  P5（page.tsx / 诉求2+3传参+5）  ← 依赖 P3 已完成
            │
Phase 4  文档与素材收尾 + 全量验收
```

**两条硬顺序约束**：
1. **P3 必须先于 P5（或同批合入）**。P3 把 `NewsGridTexts.badge` 改成可选，P5 才删掉 `page.tsx:96` 的 `badge: t("newsBadge")`。若反过来，P5 合入时 `badge` 仍是必填 → `pnpm typecheck` 红。
2. **P5 内部诉求 2 与 5 必须一次编辑完成**。两者在 `page.tsx:58-73` 相邻，共同决定 hero→NEWS 接缝；分两次改必然要改两遍注释、看两次接缝。

### 5.2 每个分区内的 TDD 步骤（Red → Green → Refactor）

| 分区 | Red（先失败的断言） | Green（实现） |
|---|---|---|
| P1 | 断言 PDP 中 `a.hscroll > *` 数量 = 0；`ProductGallery` 的 `button` 数 = `images.length` 且在 → **先确认现状为 6 → 失败** | 删 `:117-144`，改 `:99-103` 注释，保留 `min-w-0` |
| P2 | 把 `Footer.test.tsx:138-152` 的层级用例改写成"FAQ/Contact 与 MENU 链接同类名、同计算样式" → **先失败** | 删 `panelLinkCls`、换容器类、两个 Link 用 `linkCls` |
| P3 | `NewsGrid.test.tsx` 断言 `queryByText("New Arrivals")` 为 null（用 en locale 的 texts）→ **先失败** | 删 badge span、`badge?: string`、h3 `mt` 补偿 |
| P4 | `HeroCarousel.test.tsx`：断言 CTA 链接数 = 0、箭头按钮数 = 0、**5 屏整屏链接的 href 集合 = 5 个**、5 个 tab 仍在 → **先失败** | 加两个开关常量、重构 `renderOverlay` 统一 `wrapScreenLink`、箭头容器包开关、指示条 `after` 按开关取值 |
| P5 | 源码守卫：`scan(/<Marquee/)` 为空；`page.tsx` 中 `scan(/news-bg|category-bg|upcoming-bg/)` 为空 → **先失败** | 一次编辑删 Marquee 用法/import/3 变量、删 3 处 `<Image>`、NEWS 补 `bg-[#efefef]`、删 `badge:` 传参、补 hero `border-b`、改 4 段注释；删组件/单测/keyframes/3 张 jpg |

---

## 6. Spec-first 与测试同步（不做这些，CI 必红 / spec 自相矛盾）

### 6.1 必须先归档 in-flight change

`openspec/changes/2026-10-11-mobile-adaptation/` 已完成（45/45）但**未归档**，其 delta 有 3 条与本单直接冲突：

| 冲突 | 位置 | 冲突内容 |
|---|---|---|
| C1 | `changes/…/specs/commerce/spec.md:66` | 要求 "sibling products of the same series SHALL remain reachable **with a visible name per thumbnail**" —— 正是诉求 4 要删的那排（`tasks.md:68` 就是给它补的常显名称） |
| C2 | `changes/…/specs/brand-site/spec.md:135-139` | "reduced-motion 下 promo marquee 换行静态块" —— 删掉 Marquee 组件后该场景**无落点** |
| C3 | `changes/…/specs/brand-site/spec.md:64-84` | "Hero indicator bars" 只要求 ≥24px，与同文件 "Touch target contract" 的 ≥44px 通用条款**自相矛盾**；今天实测 ≈43px，过 24 不过 44 |

→ **先 `pnpm exec openspec archive 2026-10-11-mobile-adaptation`**（让 spec 基线变当前），再在本 change 里用 MODIFIED delta 显式收口，**不要**把新内容叠在旧 delta 上。

### 6.2 本 change 需要出具的 delta

| capability | 位置 | 现状条文 | 需要的 delta |
|---|---|---|---|
| `brand-site` | `spec.md:10` | section 顺序含 `promo bar` | **MODIFIED**（去掉 promo bar） |
| `brand-site` | `spec.md:94-131`（Hero carousel） | 要求 prev/next 箭头；描述 CTA 尺寸；"**Series slides MUST NOT wrap the whole slide in an anchor** (the CTA is the only navigation entry)" | **MODIFIED**（箭头移除；CTA 由开关控制且默认不渲染；**全 5 屏整屏包链接**） |
| `brand-site` | `spec.md:133-140` | Scenario "CTA navigates to landing" / "Slide links to landing" / "Non-linked slides" | **MODIFIED/REMOVED**（前两条改为"整屏链接导航"；"Non-linked slides" 早已与代码漂移 —— 代码早已给屏 1/2 `href` 并整屏包链接） |
| `brand-site` | `spec.md:178-181` | Scenario "Arrow navigation" | **REMOVED** |
| `brand-site` | `spec.md:198-207` | "the feature card's **badge** and headline at the top centre" | **MODIFIED**（badge 移除，标题位置由 `mt` 补偿钉住） |
| `brand-site` | `spec.md:217-228` | "the oversized faded 'Stay / tuned.' watermark is baked into the background image and MUST NOT be re-rendered" | **MODIFIED**（底图移除；该条前提消失） |
| `brand-site` | `spec.md:280-300`（Footer policy entry points） | 要求"五条政策链接"（**与代码早已漂移**，实现是 FAQ / Contact / Legal 三条）+ "same link size as MENU and COLLECTIONS" | **MODIFIED**（收口漂移 + 把"同字号"落实） |
| `commerce` | `spec.md:32` | "…and **sibling-look selection**" | **MODIFIED**（可达性由 "More from this series" 卡片网格承载，每项有商品名） |

**建议**：诉求 4 的 delta 把"每个缩略图有可见名称"的约束**改挂到 "More from this series" 网格上** —— 那里每项确实有 `truncate` 商品名（`page.tsx:257-259`），语义成立，不是删需求而是换承载物。

### 6.3 会失败的现有测试（必须同批改）

| 文件 | 行 | 断言 | 处理 |
|---|---|---|---|
| `HeroCarousel.test.tsx` | `:75` / `:134` / `:199` | `getAllByRole("link", { name: "heroDetailsCta", hidden: true })` 数量 = 3 | 改为断言 **数量 = 0**，并新增"5 屏整屏链接 href 集合"用例 |
| `HeroCarousel.test.tsx` | `:140-142` | `getByRole("button", { name: "heroNextSlide"/"heroPrevSlide" })`（**无 `hidden: true`**） | 改为断言数量 = 0 |
| `HeroCarousel.test.tsx` | `:204-208` | 断言箭头 className 含 `"clamp(44px"` | 删除（元素不再渲染） |
| `HeroCarousel.test.tsx` | `:198-199` | 注释"屏 3-5 不整屏包链接（嵌套 `<a>` 非法）" | 改注释：CTA 关闭时不渲染，故整屏包链接合法 |
| `NewsGrid.test.tsx` | `:36` | `texts` 字面量含 `badge: "新品上市"` | 改为不传 `badge`（可选 prop） |
| `NewsGrid.test.tsx` | `:41` | `getByText("新品上市")` | 改为 `queryByText(...)` 为 **null**，并断言 `h3` 仍在 |
| `Footer.test.tsx` | `:145-146` | `faq/contact.className` 含 `"text-lg"` | 改写为"与 MENU 首链同类名"的断言 |
| `Footer.test.tsx` | `:149` | `legal.className` 含 `"text-xs"` | **保留**（Legal 仍 12px） |
| `Footer.test.tsx` | `:150` | `faq.className` 含 `"text-cream"` | **必须重写**：`"text-cream/50"` 也含子串 `text-cream` → 恒真假绿。断完整类名或计算样式 |
| `Marquee.test.tsx` | 整文件 | 组件被删 | **整文件删除** |

### 6.4 jsdom 的能力边界（验收工具分层）

- **单测（vitest + jsdom）只能断源码字面量与 DOM 结构/文本/href** —— **不能**断"隐藏"、计算样式、对齐、取色。Tailwind CSS 不加载，`getComputedStyle` 对 `class="hidden"` 返回空，Testing Library 的 `hidden: true` 形同虚设（这就是"假绿"的根源）。
- **真实浏览器层**：`scripts/audit-mobile.mjs` + `scripts/lib/cdp.mjs`（零依赖 CDP，已有 `visible()` / `effectiveBox()` / `elementFromPoint` / `getComputedStyle` / `Page.captureScreenshot`）。所有"隐藏 / 对齐 / 接缝 / 取色"类断言必须落这里。
- **取色层**：Pillow 脚本（建议落盘 `scripts/sample-bg-color.py`）。

---

## 7. 验收断言（每项一条可验证的断言）

| # | 断言 | 类型 | 命令 / 判据 | 阴性对照 |
|---|---|---|---|---|
| **1** | 头图 CTA 与箭头**不存在于 DOM**，且**5 屏全部整屏可点** | 单测 | `pnpm test -- HeroCarousel`：① `queryAllByRole("link", { name: "heroDetailsCta" })` 长度 = **0**；② `queryAllByRole("button", { name: /heroPrevSlide\|heroNextSlide/ })` 长度 = **0**；③ 头图内 `<a href>` 集合 = `{/about, /products, /collections/princess-lady, /collections/outdoor-sporty, /collections/playful-life}`（**5 条**）；④ 5 个 `role="tab"` 仍在，`click` 后目标 tab `aria-selected === "true"` | 改前 ①=3、②=2、③=**2 条**（屏 1/2）→ 必失败 |
| **1b** | 自动轮播仍在（真实浏览器一次观测） | 真实浏览器 | 打开首页，等 5.5s，断言 `[role="tab"][aria-selected="true"]` 的索引从 i 变为 i+1 | — |
| **1c** | 指示条有效命中高度 ≥44px | 真实浏览器 | 把 home 纳入 `audit-mobile.mjs` 的 ≥44 检查，用现成 `effectiveBox(tab)` 量 `h`，断言 **`h >= 44`**（375px 下 `2.78 + 42.4 ≈ 45.2`） | 改前 375px ≈ **43px** → 失败 |
| **2** | 促销黑条**真的没了**（像素级，唯一充分条件） | 真实浏览器 | `node scripts/audit-mobile.mjs --base http://127.0.0.1:3000 --widths 320,375,390` 全绿 + 375×812 全页截图在 hero 底边与 NEWS 顶边之间扫一条全宽横带，断言**不存在任何一行的 ≥90% 像素为 `#1d1915`** | **改前该带整行都是黑的 → 必失败** |
| **2b** | 下方内容上移量 = Marquee 实测高度 | 真实浏览器 | 改前记录 `.animate-marquee` 的 `border-y` 容器 `getBoundingClientRect().height`（预计 42–50px），改后断言 `body.scrollHeight` 恰好少该值（±2px） | — |
| **2c** | Header 那条 promo 条**没被误删** | 单测/浏览器 | `header` 内仍存在 `bg-ink` 的 promo 容器、文本非空、且**不含** `— is.offy —` | — |
| **2d** | 源码守卫：首页不再渲染 Marquee | 单测 | `scan(/<Marquee/)` 在 `src/app/**/page.tsx` 为空（照 `src/mobile-rules.test.ts` 的写法） | — |
| **3** | NEW ARRIVALS 文本消失，**大标题位置不动**（±2px） | 单测 + 真实浏览器 | ① `pnpm test -- NewsGrid`：`queryByText("New Arrivals")` 为 **null**，`getByRole("heading", { name: /ROMANTICIZING/i })` 仍在；② 真实浏览器 375px 与 1440px 各测一次：`h3.getBoundingClientRect().top - card.getBoundingClientRect().top` 与**改前基准差 ≤2px** | 改前 ① 失败（文本在）。不补 `mt` 时 ② 在 375px 会差 **≈28px** |
| **3b** | 没删错：`ProductCard` 的 `New in` 仍在 | 单测 | 首页仍能找到 `New in` 角标（featured 商品卡） | — |
| **4** | PDP 目标行消失，**主图切换能力不受损** | 单测 | `pnpm test`：① PDP 中 `a.hscroll > *` 数量 = **0**；② `ProductGallery` 仍渲染 `images.length` 个 `<button>`，点击第 2 个后主图 `src` 变为 `images[1]` 且该按钮 `aria-current="true"`；③ "More from this series" 仍在，卡片数 = `min(siblings.length, 6)` | 改前 ① = 6 → 失败 |
| **4b** | 375px 无横向溢出（`min-w-0` 保住了） | 真实浏览器 | `document.documentElement.scrollWidth <= clientWidth`（`audit-mobile.mjs` 现成断言） | 删掉 `min-w-0` 会恢复 `scrollWidth` 402 |
| **5** | 三个 section 是**纯色平底**（幽灵字真的没了） | 真实浏览器 | 375×812 全页截图，对三个 section 的矩形区域统计像素，断言 **≥99.5%** 的像素与目标色 `max|Δ| ≤ 2` | **改前必失败**（news 有 3.17% 幽灵字像素、category 1.00%、upcoming 1.55%） |
| **5b** | 底色是**声明出来的**，不是层叠副作用 | 真实浏览器 | `getComputedStyle(newsSection).backgroundColor === "rgb(239, 239, 239)"` **且** `newsSection.className` 含 `bg-[#efefef]`；category/upcoming 断言 `rgb(247, 247, 249)`（两段都要：前者证结果，后者证不依赖层叠） | 改前第二段失败 |
| **5c** | 网络层证否：三张图不再被请求 | 真实浏览器（CDP Network 域） | 首页全部请求的 url 不含 `news-bg` / `category-bg` / `upcoming-bg`（含 `/_next/image?url=…` 编码形式） | — |
| **5d** | 布局零回归 | 真实浏览器 | 三个 section 的 `getBoundingClientRect().height` 与改前差 **≤1px** | — |
| **6** | 页脚三列**排版属性完全相等 + 左边缘相等 + 命中区不回归** | 真实浏览器（1440×900） | ① `getComputedStyle` 的 `fontSize` / `fontWeight` / `fontFamily` / `letterSpacing` / `color` 在 MENU 首链 / COLLECTIONS 首链 / FAQ 上**取值集合 size === 1**（把实测值打进 detail）；② `Math.round(rect.left)` 在 MENU 首链 / COLLECTIONS 首链 / FAQ / CONTACT US 之间 **max − min ≤ 1**；③ `paddingLeft === "0px"` 且 `marginLeft === "0px"`（保证框左 = 文字盒左，防"加 padding 再补负 margin"式假对齐）；④ `effectiveBox(FAQ).h >= 44`；⑤ 375px 单列堆叠时三个 `nav` 内首元素 `left` 全部等于容器 `left` | 改前 ① 失败（18px vs 12px） |
| **6b** | Legal & Policies 的弱化**没跌破 AA** | 真实浏览器 | `legal` 的 `color` alpha < `faq` 的 alpha，且**计算对比度 ≥ 4.5:1**（`text-cream/50` on `#1d1915` ≈ 5.21:1；`/40` ≈ 3.8:1 会失败） | 若有人顺手压到 `/40` → 失败 |
| **6c** | `pnpm test` 全绿 | 命令 | `pnpm test` | 改前 `Footer.test.tsx:145-146` 断言旧层级 |

**统一门禁（每个分区合入前 + 全量收尾）**：
```bash
pnpm test && pnpm typecheck && pnpm lint
pnpm dev   # 或 pnpm build && pnpm start
node scripts/audit-mobile.mjs --base http://127.0.0.1:3000 --widths 320,375,390
```

> ⚠️ **验收环境**：本机 `localhost:3000` 现在跑的是**旧构建**，不能作为改动前后的验收基准。所有视觉/命中区/接缝结论必须在 `pnpm dev` 或重建后按 375 / 768 / 1440 三档真机复核。

---

## 8. 风险登记

| 级别 | 风险 | 缓解 |
|---|---|---|
| 🔴 高 | 诉求 1 若只隐藏不补整屏链接：5 屏里 3 屏（60% 曝光时长、3 个系列落地页）整屏不可点，等同重新引入 P1-1 缺陷 | A3：必须同时给全部 5 屏 `wrapScreenLink` |
| 🔴 高 | 诉求 1 的 CTA 若保留在 DOM（`hidden`/`sr-only`）又给整屏包 `<a>` → SSR 输出嵌套锚点 → hydration mismatch | A2：用开关**不渲染**，两者互斥 |
| 🔴 高 | 诉求 4 若误删 `min-w-0`：自图集最多 10×56+9×10 = 650px > 原 386px，375px 横向溢出复现 | §2 诉求 4 第 2 条；断言 4b |
| 🟠 中 | 诉求 2 若顺手删掉 `common.promoMessages` i18n key：`Header.tsx:23` 的 `t.raw` 拿不到数组，全站顶部条坏掉 | §2 诉求 2；断言 2c |
| 🟠 中 | 诉求 3 只删 badge 不补 `mt`：大标题上移 28–42px，压到主图人物头部 | §2 诉求 3；断言 3 |
| 🟠 中 | 隐藏 CTA 后桌面鼠标用户不能拖拽（手势是 touch-only），唯一可见控件是 2.8px 细条 | 断言 1c 把命中区提到 ≥44px；**后续待办**：补 pointer 拖拽（复用 40px 阈值）+ hover/focus 暂停 |
| 🟠 中 | 自动轮播 5s 无限循环、无暂停控件（WCAG 2.2.2 既有缺口），隐藏箭头后可见控件更少 | 记为既有债，本次不扩大（**待办**：加暂停按钮或 hover/focus 暂停） |
| 🟠 中 | 触摸横滑 ≥40px 后浏览器仍可能补发 click → 屏 1/2 原本就整屏是 `<a>`，误跳风险存在；现在**全 5 屏都是 `<a>`**，风险面扩大 | **新增待办**：加"本次触摸判定为滑动则吞掉 click"的守卫。本次先记录，不在范围内 |
| 🟠 中 | spec 漂移未收：`brand-site:100/103/138-140` 仍写"屏 1/2 NOT clickable、点击无反应"，而代码早已 `href` + 整屏包链接 | Phase 0 的 delta 一并 MODIFIED（§6.2） |
| 🟠 中 | 文档过时：`docs/specs/mobile-adaptation-plan.md:134/236/247/259/356` 把"满幅底图"列为"明确保留的 7 件事"；`:137/149` 的箭头/CTA 44px 整改项失效 | Phase 4 标注失效；`docs/design/mobile/*.png` 基线图需重拍 |
| 🟡 低 | 诉求 6 若有人把 Legal 压到 `cream/40`：对比度 3.8:1 跌破 AA | §2 诉求 6 的硬边界 + 断言 6b |
| 🟡 低 | 页脚统一后 HELP 与 Legal 的层级差只剩 20% 透明度 + 一条分隔线，后续容易被继续压暗 | 注释里写死"不得再降"，断言 6b 兜底 |
| 🟡 低 | 全站**无任何埋点**（无 gtag/analytics/posthog/dataLayer/plausible）：诉求 1、3、4 都触及转化路径，无法度量影响或判断回滚 | **建议**：本次至少给首页头图跳转与 PDP 系列入口加基础事件，否则删转化位的决策只能靠直觉 |
| 🟡 低 | `docs/design/mobile/*.png` 是 375px 真实渲染基线，**包含**黑条与那排同系列小图；不重拍会让下轮评审拿旧图当基线 | Phase 4 重拍 `home.png` / `product-detail.png` |
| 🟡 低 | spec 结论依赖当前 JPEG 素材：若设计重新导出这三张图，采样值必须重采 | §1 表格抄进 change proposal 留存；`scripts/sample-bg-color.py` 固化后一条命令复核 |
| 🟡 低 | 删 3 张 jpg 后 `/_next/image` 优化 URL 变化；旧 URL 若仍被 CDN/浏览器缓存，部署后需确认无 404 | 断言 5c 覆盖 |

---

## 9. 待老板/负责人拍板的 4 项（有默认，可直接执行）

| # | 事项 | **默认（本方案采用）** | 若不采纳的后果 |
|---|---|---|---|
| Q1 | 隐藏 CTA 后，屏 3/4/5 是否整屏可点？ | **是**（整屏包链接，5 屏全可点） | 不采纳 → 60% 头图面积不可点，重新引入 P1-1 |
| Q2 | 删 badge 后大标题是否保持原位？ | **是**（`mt` 补偿，±2px） | 不采纳 → 标题上移 28–42px，压到主图主体 |
| Q3 | 诉求 2+5 叠加后 hero↔NEWS 硬接缝，补 1px 分隔线？ | **补** `border-b border-cream-line` | 不采纳 → 接缝每 5s 在 Δ8 与 Δ162 之间跳（可接受，但**不要**在 NEWS 加渐变） |
| Q4 | PDP 决策点换款入口是否补一行「View the whole series →」？ | **不补**（老板只要求删） | 不采纳 → 换款入口只剩页面底部 More 网格，对"一个系列集齐 12 款"的品类是可测量的转化损失 |

---

# 业主（老板）对歧义点的最终裁定 —— 以此为准

> 以下三条是业主在 2026-10-12 对本方案中歧义点的直接回复。**优先级高于本文档前面的任何专家默认读法。**
> 若实现与本节冲突，以本节为准。

## 裁定 1｜诉求 4：删的是「同系列商品小图」，主图多图切换必须保留

业主原话：

> 删除的是同系列商品小图，本商品多图切换能力要保留，同系列商品因为下面的大图已经有了所以可以去掉。

拆解：

- **要删的**：PDP 上方那排**同系列其它商品**的小图缩略（每张下面带被截断的名字 PREP S… / MADAM… / DIVA / MORI / LADY P… / GLOW）。
- **要保留的**：**本商品自己多张图的主图切换能力**（如果那排小图同时承担主图切换，必须先把它拆出来 —— 同系列部分删掉，多图切换入口另做或保留）。
- **理由**：同系列商品在下方 "More from this series" 大图卡片排里已经有了，重复。

⚠️ **实现注意**：动手前必须确认这两个功能在当前代码里是**同一个组件还是两个**。
- 若是两个 → 只删同系列那个。
- 若是一个（同一排缩略图既切主图又列同系列）→ **不能整排删掉**，要把「本商品多图切换」这一职责保留下来，只去掉同系列那部分。
- 报告里必须写明判定依据。

## 裁定 2｜诉求 6：`LEGAL & POLICIES` 保留更弱一档，分隔线保留

业主原话：

> LEGAL & POLICIES 颜色还是弱一档，浅一点，分割线也还是保留。

即页脚最终形态：

- `FAQ`、`CONTACT US` —— **与左侧两列（MENU / COLLECTIONS）统一**：同字号、同字重、同左边缘。
- `LEGAL & POLICIES` —— **仍比其他项浅一档**（弱化），**其上方那条分隔线保留**。

## 裁定 3｜诉求 2：促销条纯删除，不补回

业主原话：

> 纯删除，不补回。因为顶部的信息已经展示这部分了，这里不再需要重复展示了。

即：

- 黑底滚动条**整条删除**，不在别处补一份满赠信息。
- 理由是**顶部（Header 上方那条公告栏）已经在展示同样内容**了，属于重复。
  → 实现时顺带确认：顶部公告栏确实还在、内容覆盖了满赠信息（`common.promoMessages`）；若顶部也缺这部分，要在报告里提出来。

---

## 复测要求（针对以上三条追加）

1. 诉求 4：断言同系列小图**不再存在**，且**本商品主图仍可切换**（贴出切换前后的主图 src 或等价证据）。
2. 诉求 6：断言 `FAQ` / `CONTACT US` 与 MENU 列链接的 `font-size` / `font-weight` / `getBoundingClientRect().left` **三项实测值一致**；同时断言 `LEGAL & POLICIES` 的 `color` **比它们浅**（给出实际色值）且分隔线元素仍在。
3. 诉求 2：断言促销条容器与文案不在渲染输出中；同时断言**顶部公告栏仍在**（因为删除的理由是"顶部已展示"，若顶部也没了则理由不成立）。
