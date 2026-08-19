# Redesign 04 — 导航子 Tab 结构与页尾公司名（品牌/内容层）

> 范围：本文件只做**品牌与内容层**（信息架构、文案、排版方案、i18n key、评分），不写实现代码。
> 承接 `redesign-01-brand.md`（品牌主线/标识/slogan 三件套）与 `redesign-02-visual.md`（token/字体/克制度）。
> 实证基准：dogguo.com 顶层 tab 全大写 `NEW / SHOP / SALE / ABOUT US`，右侧 `Search / Account / Cart (n)`；
> 页尾标准多列（h4 大写小标题 + 链接列表），品牌名在页尾 logo 与版权行突出。

---

## 1. 目标（一句话）

把现有「首页 / 商店 / 系列 / 品牌故事」的扁平 4 链接导航，升级为 dogguo 式
**全大写顶层 tab + 下拉子 tab**（NEW / SHOP / SERIES / ABOUT），并把页尾从「小字品牌名」
升级为「**超大公司名 `PLAYCORE 凭空幻想` + slogan 主标识带 + 多列链接**」。

---

## 2. 顶部导航信息架构

### 2.1 顶层 tab 映射（dogguo → Offy）

| dogguo 顶层 | Offy 顶层 | 中文 | 定位 | 目标路由 |
| --- | --- | --- | --- | --- |
| NEW | **NEW** | 新品 | 新品 + 预告（8 待揭晓 + 2 未来 IP） | `/products?filter=new` 或 `/new` |
| SHOP | **SHOP** | 商店 | **购买主入口**：全部形象 + 9 系列 + 联名定制 | `/products` |
| SALE | **SERIES** | 系列 | 9 系列「按情绪」杂志式总览（**不用折扣语义**） | `/collections` |
| ABOUT US | **ABOUT** | 品牌故事 | 品牌/团队/零售/定制 | `/about` |

> **关于 SALE 的决策**：Offy 是 editorial 品牌，不做「折扣清仓」叙事，dogguo 的 `SALE`
> 位改由 `SERIES / 系列` 承接；「限定 / 联名」这类稀缺性内容收进 SHOP 下拉底部独立项
> （`联名 / 定制`），不凭空造「Sale」标签。若未来真上折扣，再插回 `SALE` tab 并配 `messages.nav.sale`。

**顶层 tab 视觉规则（dogguo 节奏）：**
- 英文全大写，`tracking-[0.14em]`（沿用现有 token），`text-xs`。
- 中文紧随英文同权显示（双语 lockup 延续）：`NEW 新品 / SHOP 商店 / SERIES 系列 / ABOUT 品牌故事`。
- 「首页」不再单独占一个 tab——**logo（PLAYCORE 凭空幻想）即首页入口**，与 dogguo 一致
  （logo 区是品牌名，点 logo 回首页）。`nav.home` 仅保留给页尾/移动端菜单复用。

### 2.2 各顶层 tab 下拉子项清单（中英对照）

> 系列名**直接读 `src/lib/catalog/series.ts` 的 `seriesList.name`**（单一数据源），
> **不在 messages 里重复**；下方「系列」项仅为内容对照，落地时遍历 `seriesList` 生成。

#### 2.2.1 NEW / 新品（下拉，4 项）

| 子项 | 中文 | English | 路由 | 备注 |
| --- | --- | --- | --- | --- |
| 全部新品 | 全部新品 | All New | `/products?filter=new` | 全部 `featured` 或新增 `isNew` 标记 |
| 最新揭晓 | 最新揭晓 | Latest Reveals | `/products` | 复用「最新揭晓」section |
| 即将揭晓 | 即将揭晓 | Coming Soon | `/products?filter=upcoming` | 8 款 P22–P29（`isUpcoming`） |
| 未来 IP | 未来 IP | Upcoming IP | `/about#future` | Miss Kitty / Psyche 预告 + 订阅 |
| 订阅新品 | 订阅新品 | Get Notified | 首页订阅锚点 | 引导 Newsletter |

#### 2.2.2 SHOP / 商店（mega 下拉，**9 系列**）

| 子项 | 中文 | English | 路由（slug） |
| --- | --- | --- | --- |
| **全部形象**（加粗高亮行） | 全部形象（29 款） | All 29 Looks | `/products` |
| 01 时尚包挂 | 时尚包挂 | Fashionable Bag Charm | `/collections/bag-charm` |
| 02 Signature 经典毛绒 | Signature 经典毛绒 | Signature Plush | `/collections/signature` |
| 03 多材质 | 多材质 | Multi-texture | `/collections/multi-texture` |
| 04 环保再生 | 环保再生 | Recycled & Eco | `/collections/recycled-eco` |
| 05 活力运动 | 活力运动 | Active & Sporty | `/collections/active-sporty` |
| 06 户外生活 | 户外生活 | Outdoor & Lifestyle | `/collections/outdoor-lifestyle` |
| 07 公主优雅 | 公主优雅 | Princess & Elegance | `/collections/princess-elegance` |
| 08 玩趣 | 玩趣 | Playful | `/collections/playful` |
| 09 大号毛绒 | 大号毛绒 | Large Plush | `/collections/large-plush` |
| — 分隔线 — | | | |
| 联名 / 定制 | 联名 / 定制 | Custom & Collab | `/about#custom` |

> mega 下拉布局建议：左 2/3 铺 9 系列（`grid-cols-2/3`，每项「系列名 + 情绪 tagline」），
> 右 1/3 放「全部形象」大卡 + 「联名 / 定制」入口（视觉上突出两个非系列项）。

#### 2.2.3 SERIES / 系列（下拉 = 情绪章节，与 SHOP 差异化）

| 子项 | 中文 | English | 路由 | 情绪 tagline（示例） |
| --- | --- | --- | --- | --- |
| 全部系列 | 全部系列 | All Series | `/collections` | 9 章节总览 |
| 按情绪选购 | 按情绪找她 | Shop by Mood | `/collections` | 章节式入口 |
| 01 时尚包挂 | 时尚包挂 | Bag Charm | `/collections/bag-charm` | 随身陪伴 |
| 02 Signature | Signature 经典毛绒 | Signature Plush | `/collections/signature` | 最纯粹的她 |
| …（同 9 系列，按情绪 tagline 呈现） | | | | |
| 09 大号毛绒 | 大号毛绒 | Large Plush | `/collections/large-plush` | 更大的拥抱 |

#### 2.2.4 ABOUT / 品牌故事（下拉，5 项，锚点式）

| 子项 | 中文 | English | 路由锚点 |
| --- | --- | --- | --- |
| 品牌故事 | 品牌故事 | Our Story | `/about` |
| 创作团队 | 创作团队 | The Makers | `/about#team` |
| 零售网络 | 零售网络 | Stockists | `/about#stockists` |
| 定制与联名 | 定制与联名 | Custom & Collab | `/about#custom` |
| 联系我们 | 联系我们 | Contact | `/about#contact` 或页尾锚点 |

### 2.3 SHOP vs SERIES 差异（避免「两个下拉都列 9 系列」）

- **SHOP** = 功能性购买入口：分类名 + 直达购买，下拉快扫、够用即走。
- **SERIES** = 情绪性叙事入口：编号 + 情绪 tagline（「最纯粹的她」「优雅是她，也是你」），
  点进 `/collections` 的杂志式章节总览。

> 这是「同一批数据、两种叙事」的 editorial 手法，符合 `redesign-01` §3.2 的章节导航定调。
> **备选（若嫌重复）**：砍掉 SERIES tab，把「按情绪选购」并入 SHOP mega 下拉的一个区块，
> 顶层变 3 tab（NEW / SHOP / ABOUT）。默认按 4 tab 交付，待用户确认。

### 2.4 右侧工具区（dogguo：Search / Account / Cart (n)）

| 项 | 现状 | 目标 | 备注 |
| --- | --- | --- | --- |
| Search 搜索 | ❌ 无 | 加搜索图标（可先纯视觉/弹层，接 `/products?q=`） | P0 |
| Account 账户 | ❌ 无 | 加账户图标，先指向占位（未实现登录前可隐藏或「即将上线」） | P1 |
| Cart (n) | ✅ `CartButton` | 保留，补角标数量 `(n)` | 已具备，仅补数字 |
| 语言切换 | ✅ `LanguageSwitcher` | 保留 | 已具备 |

---

## 3. 页尾「大字公司名」方案

### 3.1 对照与目标

| 维度 | 现状 Footer | 目标（本规格） |
| --- | --- | --- |
| 公司名 | 小字 `text-2xl` PLAYCORE + `text-sm` 凭空幻想 | **超大 display 主标识带** |
| slogan | 小字 tagline + taglineEn | 主标识带内中英并置，字号放大 |
| 列数 | 3 列（品牌 / Menu / 联系） | 5 列（Shop now / Series / About / Customer care / Social） |
| 版权行 | `© 2026 PLAYCORE · 保留所有权利` | 公司名双语突出 + 保留权利 |

### 3.2 结构图（自上而下）

```text
┌───────────────────────────────────────────────────────────────┐
│  FOOTER  ·  bg-ink  ·  text-cream                              │
│                                                                │
│  ┌─ 主标识带（视觉焦点，全宽居中）────────────────────────────┐ │
│  │                                                            │ │
│  │        P L A Y C O R E            ← font-display 900        │ │
│  │        （超大：text-6xl → md:text-8xl，tracking 0.08em）    │ │
│  │                                                             │ │
│  │            凭空幻想                ← 中文 text-3xl md:text-5xl│ │
│  │                                                             │ │
│  │  让想象落地，让陪伴发生              ← slogan 中文（主）      │ │
│  │  Imagine with Love. Create with Companion.  ← slogan 英文（辅）│ │
│  │                                                             │ │
│  │  [小红书 @is.offy]   [hello@playcoretoys.com]   [订阅]       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ 多列链接区（5 列，h4 大写小标题 + 链接列表）──────────────┐ │
│  │  SHOP NOW    SERIES      ABOUT       CUSTOMER CARE   SOCIAL │ │
│  │  现在选购    系列        关于        顾客服务        社媒     │ │
│  │   ─────      ─────       ─────       ─────           ─────  │ │
│  │  全部形象    01 时尚包挂  品牌故事    联系我们        小红书   │ │
│  │  新品        02 Signature  创作团队  配送信息        Instagram│ │
│  │  大号毛绒    03 多材质    零售网络    退换政策        微博     │ │
│  │  包挂        04 环保再生  未来 IP     常见问题        邮件订阅 │ │
│  │  联名/定制   …           定制与联名  隐私政策                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ 版权行 ──────────────────────────────────────────────────┐ │
│  │  © 2026  PLAYCORE 凭空幻想  ·  All rights reserved         │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### 3.3 大字公司名排版规格（主标识带）

- **`PLAYCORE`**：`font-display` 900（Arial Black 方向），全大写，`text-6xl md:text-8xl`，
  `tracking-[0.08em]`，`leading-none`，颜色 `cream`（深底）或 `paper`。
  - 进阶可选：`PLAYCORE` 用**描边/半透明 watermark**（`text-transparent` + `-webkit-text-stroke`）
    或略超出容器做「裁切大字」质感（dogguo 的 editorial 大字手法）。
- **`凭空幻想`**：`font-sans` 700（PingFang SC），`text-3xl md:text-5xl`，紧跟 Latin 下，`text-cream/80`。
- **slogan**：中英并置，中文为主、英文为辅（小一号 + `text-cream/60`），一行或两行居中。
- **社交触点行**：小红书账号（4976893650）、邮箱、订阅，`text-sm text-cream/60`，`gap-6`。
- 三者层级呼应 `redesign-01` §2.1 的「三件套」——页尾成为**第二个 hero**，而非辅助小字。

### 3.4 分列内容（5 列，h4 大写小标题）

| 列标题（EN 大写 / 中文） | 链接（中文 / English） | 路由 |
| --- | --- | --- |
| **SHOP NOW / 现在选购** | 全部形象 All Looks / 新品 New / 大号毛绒 Large Plush / 时尚包挂 Bag Charm / 联名·定制 Custom & Collab | `/products`、`/products?filter=new`、`/collections/large-plush`、`/collections/bag-charm`、`/about#custom` |
| **SERIES / 系列** | 9 系列（读 `seriesList.name`）+ 顶部「全部系列 All Series」 | `/collections/[slug]`、`/collections` |
| **ABOUT / 关于** | 品牌故事 Our Story / 创作团队 The Makers / 零售网络 Stockists / 未来 IP Upcoming IP | `/about`、`#team`、`#stockists`、`#future` |
| **CUSTOMER CARE / 顾客服务** | 联系我们 Contact / 配送 Shipping / 退换 Returns / 常见问题 FAQ / 隐私 Privacy | `/about#contact`、占位 |
| **SOCIAL / 社媒** | 小红书 @is.offy / Instagram（占位）/ 微博（占位）/ 邮件订阅 Newsletter | 外链 / 订阅锚点 |

> 与 dogguo 的 6 列（Shop now / About DOGGUO / Categories / Social / Customer care / Shop securely）
> 对应关系：`Categories` → 并入 `SERIES`；`Shop securely with` 由独立「放心选购」信任行承载
> （置于版权行上方或 Customer care 列底，放支付/安心徽章，暂占位）。

### 3.5 版权行

- `© {year} PLAYCORE 凭空幻想 · 保留所有权利（All rights reserved）`
- 公司名用双语（`PLAYCORE 凭空幻想`），`text-xs text-cream/50`，但**字号与字重高于普通版权**，
  让公司名在页尾收口处再次点题（对应 dogguo「品牌名在版权行突出」）。

---

## 4. i18n key 清单（中英文案）

> 系列名/情绪 tagline 沿用 `series.ts` 的 `seriesList.name / tagline`，**不新增**。
> 下列仅列「导航 + 页尾」新增/变更 key。命名沿用现有 `common.nav` / `common.footer` 前缀。

### 4.1 `common.nav`（顶部导航）

| key | zh | en | 说明 |
| --- | --- | --- | --- |
| `nav.new` | 新品 | New | 顶层，全大写 |
| `nav.shop` | 商店 | Shop | 顶层（复用现有，语义改） |
| `nav.series` | 系列 | Series | 顶层（替换原 `nav.collections`） |
| `nav.about` | 品牌故事 | Our Story | 顶层（复用现有） |
| `nav.search` | 搜索 | Search | 工具区 |
| `nav.account` | 账户 | Account | 工具区（P1） |
| `nav.new.all` | 全部新品 | All New | 下拉 |
| `nav.new.latest` | 最新揭晓 | Latest Reveals | 下拉 |
| `nav.new.comingSoon` | 即将揭晓 | Coming Soon | 下拉 |
| `nav.new.upcomingIp` | 未来 IP | Upcoming IP | 下拉 |
| `nav.new.subscribe` | 订阅新品 | Get Notified | 下拉 |
| `nav.shop.all` | 全部形象（29 款） | All 29 Looks | 下拉高亮行 |
| `nav.shop.custom` | 联名 / 定制 | Custom & Collab | 下拉底部 |
| `nav.series.all` | 全部系列 | All Series | 下拉 |
| `nav.series.byMood` | 按情绪找她 | Shop by Mood | 下拉 |
| `nav.about.story` | 品牌故事 | Our Story | 下拉 |
| `nav.about.team` | 创作团队 | The Makers | 下拉 |
| `nav.about.stockists` | 零售网络 | Stockists | 下拉 |
| `nav.about.custom` | 定制与联名 | Custom & Collab | 下拉 |
| `nav.about.contact` | 联系我们 | Contact | 下拉 |

### 4.2 `common.footer`（页尾）

| key | zh | en | 说明 |
| --- | --- | --- | --- |
| `footer.colShopNow` | 现在选购 | Shop Now | 列标题 |
| `footer.colSeries` | 系列 | Series | 列标题 |
| `footer.colAbout` | 关于 PLAYCORE | About PLAYCORE | 列标题 |
| `footer.colCare` | 顾客服务 | Customer Care | 列标题 |
| `footer.colSocial` | 社媒 | Social | 列标题 |
| `footer.colSecure` | 放心选购 | Shop Securely | 信任行标题（占位） |
| `footer.link.all` | 全部形象 | All Looks | 链接 |
| `footer.link.new` | 新品 | New | 链接 |
| `footer.link.large` | 大号毛绒 | Large Plush | 链接 |
| `footer.link.charm` | 时尚包挂 | Bag Charm | 链接 |
| `footer.link.custom` | 联名 / 定制 | Custom & Collab | 链接 |
| `footer.link.story` | 品牌故事 | Our Story | 链接 |
| `footer.link.team` | 创作团队 | The Makers | 链接 |
| `footer.link.stockists` | 零售网络 | Stockists | 链接 |
| `footer.link.upcoming` | 未来 IP | Upcoming IP | 链接 |
| `footer.link.contact` | 联系我们 | Contact | 链接 |
| `footer.link.shipping` | 配送信息 | Shipping | 链接（占位） |
| `footer.link.returns` | 退换政策 | Returns | 链接（占位） |
| `footer.link.faq` | 常见问题 | FAQ | 链接（占位） |
| `footer.link.privacy` | 隐私政策 | Privacy | 链接（占位） |
| `footer.social.xhs` | 小红书 @is.offy | Xiaohongshu @is.offy | 复用现有 `footer.social` |
| `footer.social.instagram` | Instagram | Instagram | 占位 |
| `footer.social.weibo` | 微博 | Weibo | 占位 |
| `footer.social.newsletter` | 邮件订阅 | Newsletter | 订阅锚点 |
| `footer.rights` | 保留所有权利 | All rights reserved | 复用现有 |

> 复用现有：`brandLatin`/`brandZh`（公司名）、`tagline`/`taglineEn`（slogan）、
> `footer.contact`（联系我们）、`footer.rights`。`nav.collections` 建议保留 key 但指向 `/collections`（防历史引用断裂）。

### 4.3 建议落地时的 JSON 结构（示意）

```jsonc
// zh.json 增量
{
  "common": {
    "nav": {
      "new": "新品", "shop": "商店", "series": "系列", "about": "品牌故事",
      "search": "搜索", "account": "账户",
      "new": { "all": "全部新品", "latest": "最新揭晓", "comingSoon": "即将揭晓",
               "upcomingIp": "未来 IP", "subscribe": "订阅新品" },
      "shop": { "all": "全部形象（29 款）", "custom": "联名 / 定制" },
      "series": { "all": "全部系列", "byMood": "按情绪找她" },
      "about": { "story": "品牌故事", "team": "创作团队", "stockists": "零售网络",
                 "custom": "定制与联名", "contact": "联系我们" }
    },
    "footer": {
      "colShopNow": "现在选购", "colSeries": "系列", "colAbout": "关于 PLAYCORE",
      "colCare": "顾客服务", "colSocial": "社媒", "colSecure": "放心选购",
      "link": { "all": "全部形象", "new": "新品", "large": "大号毛绒", "charm": "时尚包挂",
                "custom": "联名 / 定制", "story": "品牌故事", "team": "创作团队",
                "stockists": "零售网络", "upcoming": "未来 IP", "contact": "联系我们",
                "shipping": "配送信息", "returns": "退换政策", "faq": "常见问题", "privacy": "隐私政策" },
      "social": { "xhs": "小红书 @is.offy", "instagram": "Instagram",
                  "weibo": "微博", "newsletter": "邮件订阅" }
    }
  }
}
```

> 注：`"new"` 作为 tab 文案与下拉命名空间同名会冲突——落地时把 tab 文案放 `nav.newLabel`
> （或下拉用 `nav.newMenu.*`），此处仅示意内容，命名以实现时的结构体为准。

---

## 5. 现站评分与 P0 清单

### 5.1 评分（100 分制）

| 组件 | 得分 | 一句话 |
| --- | --- | --- |
| **Header** | **52 / 100** | logo 已是「PLAYCORE + 凭空幻想」双语（方向对），但导航扁平、无下拉、无 NEW/SERIES 映射、缺 Search/Account |
| **Footer** | **38 / 100** | 3 列小字品牌名，公司名不突出、无多列结构、无社交列，离 dogguo 页尾差距大 |
| **导航+页尾合计** | **46 / 100** | 骨架可用，品牌「标头与收口」两处最强记忆点均未落地 |

**Header 扣分点（52 分）：**
- 品牌标识（25 分制）：**16 分** — 已是公司名双语 lockup（比 `redesign-01` 评分时进步），
  但 `font-semibold` 非 `font-black`、中文弱化为 `text-ink-soft`，未达「一票否决」的强主标识标准。
- 导航 IA（30 分制）：**10 分** — 「首页/商店/系列/品牌故事」扁平 4 链接；无全大写 tab、
  无下拉子项、无 NEW tab；`nav.collections` 语义模糊（用户分不清「系列」与「商店」）。
- 工具区（20 分制）：**11 分** — 有 `CartButton` + 语言切换，但缺 Search、Account、Cart 角标数字。
- 视觉/节奏（25 分制）：**15 分** — 有 uppercase + tracking，但未对齐 dogguo「logo 居中/左 + 全大写 tab」的 editorial 节奏。

**Footer 扣分点（38 分）：**
- 公司名突出度（35 分制）：**8 分** — 公司名是 `text-2xl` 小字，与 slogan 混在一列，无主标识带。
- 信息架构（30 分制）：**10 分** — 3 列（品牌/Menu/联系）远少于 dogguo 6 列，系列、顾客服务、社媒缺失。
- 版权行（15 分制）：**9 分** — 有 `PLAYCORE ·` 但双语不全、无重点。
- 视觉质感（20 分制）：**11 分** — `bg-ink text-cream` 深底方向正确，但缺大字焦点与分层。

### 5.2 P0（本规格验收必须，每条可落地）

| # | 改进项 | 落地位置 | 现状 → 目标 |
| --- | --- | --- | --- |
| P0-1 | **Header 重构为 4 顶层 tab + 下拉**（NEW/SHOP/SERIES/ABOUT，全大写 + tracking） | `Header.tsx` + 新 `NavMenu` 组件 + `messages` | 扁平 4 链接 → 全大写 tab + 下拉（§2.1/2.2） |
| P0-2 | **SHOP mega 下拉挂 9 系列 + 全部形象 + 联名定制**（遍历 `seriesList`） | `NavMenu` + `src/lib/catalog/series.ts` | 无下拉 → 9 系列下拉（§2.2.2） |
| P0-3 | **NEW 下拉**（全部新品/最新揭晓/即将揭晓/未来 IP） | `NavMenu` + `messages.nav.new*` | 无 NEW → 4 项预告下拉（§2.2.1） |
| P0-4 | **Header 主标识加粗到位**（`font-black` + 中文同权） | `Header.tsx` | `font-semibold` + 弱化中文 → `font-black` + 双语同权（`redesign-01` §2.3） |
| P0-5 | **页尾大字公司名主标识带**（`PLAYCORE 凭空幻想` + slogan，超大 display） | `Footer.tsx` | 小字 → 超大主标识带（§3.3） |
| P0-6 | **页尾 5 列重构**（Shop now/Series/About/Customer care/Social，h4 大写小标题） | `Footer.tsx` + `messages.footer.*` | 3 列 → 5 列（§3.4） |
| P0-7 | **版权行双语公司名突出** | `Footer.tsx` | `PLAYCORE ·` → `PLAYCORE 凭空幻想 · 保留所有权利`（§3.5） |
| P0-8 | **补齐 i18n key**（nav + footer 文案） | `messages/zh.json` + `en.json` | 缺 → §4 全量 |

### 5.3 P1（质感提升，紧随 P0）

| # | 改进项 | 落地位置 |
| --- | --- | --- |
| P1-1 | Search 图标 + 弹层（`/products?q=`） | `Header.tsx` + 新 `SearchButton` |
| P1-2 | Account 图标（占位「即将上线」） | `Header.tsx` |
| P1-3 | Cart 角标数量 `(n)` | `CartButton` |
| P1-4 | 页尾「放心选购」信任行（支付/安心徽章，占位） | `Footer.tsx` |
| P1-5 | 页尾大字 `PLAYCORE` 描边/裁切 watermark 质感 | `Footer.tsx` + `globals.css` |
| P1-6 | 下拉动效（fade + translate，对齐 `redesign-03` 动效 token） | `NavMenu` |

---

## 6. 数据/路由依赖（实现前必读）

| 缺口 | 现状 | 影响 | 建议 |
| --- | --- | --- | --- |
| **`/new` 路由不存在** | 无 `new` 页面 | NEW 下拉「全部新品」无处可去 | 先复用 `/products?filter=new`（或新增 `/new`），`isNew` 字段待补 |
| **「即将揭晓」无独立过滤** | `products.ts` P22–P29 有 `isUpcoming`，但 catalog 页无对应 filter | NEW 下拉「即将揭晓」需过滤能力 | 加 `?filter=upcoming` 或独立 `/coming-soon` |
| **未来 IP / 联名无独立页** | `upcomingIps`/`collabLooks` 仅在 about 展示 | 下拉「未来 IP/联名定制」指向 about 锚点 | 先锚点 `/about#future`、`/about#custom`，独立页后补 |
| **顾客服务 4 链接无页面** | 配送/退换/FAQ/隐私均无页 | 页尾 Customer care 列 4 链接悬空 | 占位链接（`href="#"` 或指向 about），文案先落地 |

---

## 附：一页速览（供评审）

- **顶层 tab**：`NEW 新品 / SHOP 商店 / SERIES 系列 / ABOUT 品牌故事`，全大写 + tracking，
  logo = 首页入口；dogguo 的 `SALE` 位由 `SERIES` 承接，「限定/联名」收进 SHOP 下拉底部。
- **下拉**：SHOP mega 挂 9 系列（读 `seriesList`）+ 全部形象 + 联名定制；NEW 挂新品/预告；
  SERIES 挂情绪章节（与 SHOP 差异化）；ABOUT 挂锚点。
- **页尾**：顶部超大 `PLAYCORE 凭空幻想` + slogan 主标识带（第二个 hero），下分 5 列，
  版权行双语突出公司名。
- **评分**：Header 52 / Footer 38 / 合计 46；P0 八项、P1 六项，全部落地到具体文件与 `messages/*.json`。
