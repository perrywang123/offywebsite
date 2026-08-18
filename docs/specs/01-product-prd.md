# 01 · 产品架构与需求 PRD（Product Architecture & Requirements）

> PLAYCORE 凭空幻想（PLAYCORETOYS）· IP：is.offy · 品牌电商独立站
>
> - 文档版本：v0.1（草案，待用户确认）
> - 状态：Draft / 待评审
> - 输入：`docs/brand-brief.md`、`resources/凭空幻想PLAYCORETOYS_品牌手册2026.pdf`（42 页）、`resources/产品修图/`（29 张）、`resources/ins/`（23 张）
> - 工程约束：spec-first（OpenSpec）+ TDD，见 `AGENTS.md`
> - 定位：本 PRD 定义「产品目录（Catalog）」的领域模型、命名、价格与核心用户故事，是后续 `openspec/changes/` 中 commerce 能力 spec delta 的产品侧输入

---

## 1. 术语表（Glossary，中英对照）

| 中文 | English | 说明 |
| --- | --- | --- |
| SKU | Stock Keeping Unit | 最小可售单元。本项目中 **1 个产品编码 = 1 个 SKU = 1 个 Offy 形象** |
| 产品编码 | Product Code | 唯一标识，如 `PCOF1-A3`，直接沿用 PDF 提取的编码 |
| 系列 | Series | 对形象的语义分组（如 Active & Sporty），用于导航与筛选 |
| 品类/大类 | Category | 定价档位与形态的分组（包挂 / 经典玩偶 / 大号玩偶 / 联名定制） |
| 选款 | Choose a Style | 用户挑选「哪个 Offy 形象」，对应 casetify 的「选款式」 |
| 形象 | Look / Persona | Offy 这一 IP 在特定「穿搭/情绪/风格」下的化身 |
| 情绪标签 | Emotion Tag | 描述形象气质的短标签（如「元气 / 街头 / 优雅」） |
| 占位价 | Placeholder Price | 暂定价格，集中存放于单一数据文件，随时可改 |
| 变体 | Variant | 本项目中「变体」= 每个独立形象，而非「同款多色号」 |

---

## 2. 核心设计原则

1. **产品 = IP 化身**：Offy 是一个 IP，每个 SKU 是她在不同「穿搭/情绪/风格」下的化身；用户「挑选与自己共鸣的她」。这决定了目录是**扁平的形象集合**，而不是「一个 Offy 玩偶 + 多个颜色」。
2. **一码一 SKU**：产品编码（PDF 提取）是唯一真源，1 个编码 = 1 个 SKU，不做编码层面的进一步拆分。
3. **数据与展示分离**：命名、价格、标签、图片路径全部集中在**单一数据文件**，UI 只读取该文件，便于后续由用户批量改价/改名/换图。
4. **中英双语优先，i18n 可扩展**：`nameZh` / `nameEn` 为当前字段；未来新增语言走 `localizedNames` 扩展，不破坏现有 schema。
5. **商城为预留能力**：当前里程碑只做品牌展示 + 订阅；本 PRD 的购物车/结算/支付为「预留能力」的领域定义，实现前必须先写 OpenSpec spec delta。

---

## 3. 产品目录结构（Catalog / Category Tree）

### 3.1 层级定义

目录采用三层结构，从上到下：

```
Category（品类：按形态/定价档） → Series（系列：按形象语义） → SKU（每个 Offy 形象）
```

- **Category** 决定「形态 + 定价档」，共 4 类：包挂挂件 / 经典玩偶 18cm / 大号玩偶 / 联名定制。
- **Series** 决定「导航分组与筛选」，沿用简报的系列语义。
- **SKU** 是叶子节点，1 编码 = 1 形象 = 1 详情页。

### 3.2 完整目录树（Catalog Tree）

```
PLAYCORE 凭空幻想 · is.offy 产品目录
│
├─ 01 包挂挂件 Bag Charm                              [category: bag-charm]
│   └─ 时尚包挂系列 Fashionable Bag Charm
│       └─ PCOF1-F0  · 时尚包挂 Offy（Offy Bag Charm）
│
├─ 02 经典玩偶（18cm） Classic Plush                  [category: classic-plush]
│   ├─ Signature Plush 经典毛绒
│   │   ├─ PCOF1-F1  · 经典原皮 Offy（Offy Signature Classic）
│   │   ├─ PCOF1-F2  · 经典暮色 Offy（Offy Signature Dusk）
│   │   └─ PCOF1-F3  · 经典花瓣 Offy（Offy Signature Petal）
│   ├─ Multi-texture 多材质（环保再生 + 金属质感）
│   │   ├─ PCOF1-F4  · 金属质感 Offy（Offy Metallic Edition）
│   │   ├─ PCOF1-F5  · 双色金属 Offy（Offy Two-Tone Metallic）
│   │   └─ PCOF1-F6  · 环保再生 Offy（Offy Recycled Edition）⚠️ 与下组共享
│   ├─ Recycled & Eco 环保再生材质
│   │   ├─ PCOF1-F6  · 环保再生 Offy（Offy Recycled Edition）⚠️ 与上组共享
│   │   ├─ PCOF1-F7  · 大地再生 Offy（Offy Eco Earth）
│   │   └─ PCOF1-F8  · 植感再生 Offy（Offy Eco Bloom）
│   ├─ 01 Active & Sporty 活力运动（球场/健身房/街头）
│   │   ├─ PCOF1-A3  · 网球甜心 Offy（Offy Tennis Ace）
│   │   └─ PCOF1-A4  · 街头小子 Offy（Offy Street Player）
│   ├─ 02 Outdoor & Lifestyle 户外生活（自然/城市漫步/聚会）
│   │   ├─ PCOF1-B2  · 野餐自然 Offy（Offy Picnic Day）
│   │   ├─ PCOF1-B3  · 城市漫步 Offy（Offy City Stroll）
│   │   └─ PCOF1-B4  · 聚会派对 Offy（Offy Party Night）
│   ├─ 03 Princess & Elegance 公主优雅（下午茶/展览/日常优雅）
│   │   ├─ PCOF1-C2  · 下午茶 Offy（Offy Afternoon Tea）
│   │   ├─ PCOF1-C3  · 展览缪斯 Offy（Offy Gallery Muse）
│   │   ├─ PCOF1-C4  · 日常优雅 Offy（Offy Everyday Elegance）
│   │   └─ PCOF1-C5  · 优雅公主 Offy（Offy Princess）
│   └─ 04 Playful 玩趣（日常玩乐时刻）
│       └─ PCOF1-D1  · 玩乐时刻 Offy（Offy Playtime）
│
├─ 03 大号玩偶 Large Plush                            [category: large-plush]
│   ├─ PCOF1-L0  · 大号原皮 Offy（Offy Original Large）
│   └─ PCOF1-L1  · 泰国限定 Offy（Offy Thailand Exclusive Large）
│
├─ 04 联名定制 Collab & Custom                        [category: collab-custom]
│   └─ OF 系列（14 款，编号见 §3.4）：OF 02 / OF 03 / OF 2.2 / OF 2.4_1 / OF 2.6 /
│       OF 2.11 / OF 2.12 / OF 2.13 / OF 2.31 / OF 2.32 / OF 2.42 / OF 2.51 /
│       OF 2.52 / OF 3.1
│
└─ 05 未来 IP（预告，暂不可售） Upcoming IP            [category: upcoming]
    ├─ Miss Kitty / 千金猫（Upcoming In-House IP）
    └─ Psyche / 灵魂与蝴蝶女神（The Soul and the Butterfly Goddess）
```

### 3.3 SKU 数量盘点

| 品类 Category | 系列 Series | 编码 Code | 数量 |
| --- | --- | --- | --- |
| 包挂挂件 bag-charm | 时尚包挂 | F0 | 1 |
| 经典玩偶 classic-plush | Signature Plush | F1–F3 | 3 |
| 经典玩偶 classic-plush | Multi-texture | F4–F6 | 3 |
| 经典玩偶 classic-plush | Recycled & Eco | F6–F8 | 3（F6 共享） |
| 经典玩偶 classic-plush | Active & Sporty | A3, A4 | 2 |
| 经典玩偶 classic-plush | Outdoor & Lifestyle | B2, B3, B4 | 3 |
| 经典玩偶 classic-plush | Princess & Elegance | C2–C5 | 4 |
| 经典玩偶 classic-plush | Playful | D1 | 1 |
| 大号玩偶 large-plush | — | L0, L1 | 2 |
| 联名定制 collab-custom | OF 联名 | 见 §3.4 | 14 |

- **唯一 SKU 合计 = 35**（PCOF1 系 19 个唯一编码 + 大号 2 + OF 联名 14；F6 跨两材质系列只算一次）。
- 未来 IP（Miss Kitty / Psyche）不计入可售 SKU，仅作预告展示。

### 3.4 联名/定制（OF）编码清单

简报原文「以上款式支持定制及品牌联名合作挑选」，编码如下（作为 SKU 占位，命名与价格待定）：

`OF 02`、`OF 03`、`OF 2.2`、`OF 2.4_1`、`OF 2.6`、`OF 2.11`、`OF 2.12`、`OF 2.13`、`OF 2.31`、`OF 2.32`、`OF 2.42`、`OF 2.51`、`OF 2.52`、`OF 3.1`

> 建议：联名/定制不公开标价，`priceUsd` 置空，详情页展示「定制/联名咨询」入口（`isQuoteOnly = true`）。

---

## 4. 命名规范（Naming Convention）

### 4.1 可复用命名规则（Rule，非逐个硬编）

**中文名公式**：`<形象/情绪关键词> Offy`
（如需强调系列语义，前缀加 `<系列中文名> ·`；口语化、四字以内关键词优先）

**英文名公式**：`Offy <Look / Material descriptor>`（Title Case，descriptor 用英文名词短语）

**关键词池（descriptor pool）按系列语义派生**——新增形象时从对应池取词，保证风格一致：

| 系列 | 中文关键词池（形象/情绪） | 英文 descriptor 池 |
| --- | --- | --- |
| Active & Sporty | 网球 / 街头 / 球场 / 健身房 / 元气 | Tennis Ace / Street Player / Court / Gym / Sporty |
| Outdoor & Lifestyle | 野餐 / 自然 / 城市漫步 / 聚会 | Picnic Day / Nature / City Stroll / Party Night |
| Princess & Elegance | 下午茶 / 展览 / 日常优雅 / 公主 / 缪斯 | Afternoon Tea / Gallery Muse / Everyday Elegance / Princess |
| Playful | 玩乐 / 童趣 / 搞怪 / 日常 | Playtime / Playful / Whimsy |
| 材质线（F4–F8） | 金属 / 双色 / 环保再生 / 大地 / 植感 | Metallic / Two-Tone / Recycled / Eco Earth / Eco Bloom |
| 大号 | 原皮 / 泰国限定 | Original Large / Thailand Exclusive Large |

**命名编码约束**：
- 编码由 `PCOF1-<字母><数字>` 构成，命名不改编码；编码是唯一真源，名称是展示层。
- 大号款当前无编码，本 PRD 建议补 `PCOF1-L0`（原皮）、`PCOF1-L1`（泰国限定），作为占位编码，待用户确认。
- 联名款沿用 `OF` 前缀编码，名称统一 `Offy Collab <OF 编号>`（中：`OF <编号> 联名款 Offy`）。

### 4.2 每个编码的中英文名（占位，待用户确认）

| 编码 | 中文名 nameZh | 英文名 nameEn | 系列 |
| --- | --- | --- | --- |
| PCOF1-F0 | 时尚包挂 Offy | Offy Bag Charm | Fashionable Bag Charm |
| PCOF1-F1 | 经典原皮 Offy | Offy Signature Classic | Signature Plush |
| PCOF1-F2 | 经典暮色 Offy | Offy Signature Dusk | Signature Plush |
| PCOF1-F3 | 经典花瓣 Offy | Offy Signature Petal | Signature Plush |
| PCOF1-F4 | 金属质感 Offy | Offy Metallic Edition | Multi-texture |
| PCOF1-F5 | 双色金属 Offy | Offy Two-Tone Metallic | Multi-texture |
| PCOF1-F6 | 环保再生 Offy | Offy Recycled Edition | Multi-texture / Recycled & Eco |
| PCOF1-F7 | 大地再生 Offy | Offy Eco Earth | Recycled & Eco |
| PCOF1-F8 | 植感再生 Offy | Offy Eco Bloom | Recycled & Eco |
| PCOF1-A3 | 网球甜心 Offy | Offy Tennis Ace | Active & Sporty |
| PCOF1-A4 | 街头小子 Offy | Offy Street Player | Active & Sporty |
| PCOF1-B2 | 野餐自然 Offy | Offy Picnic Day | Outdoor & Lifestyle |
| PCOF1-B3 | 城市漫步 Offy | Offy City Stroll | Outdoor & Lifestyle |
| PCOF1-B4 | 聚会派对 Offy | Offy Party Night | Outdoor & Lifestyle |
| PCOF1-C2 | 下午茶 Offy | Offy Afternoon Tea | Princess & Elegance |
| PCOF1-C3 | 展览缪斯 Offy | Offy Gallery Muse | Princess & Elegance |
| PCOF1-C4 | 日常优雅 Offy | Offy Everyday Elegance | Princess & Elegance |
| PCOF1-C5 | 优雅公主 Offy | Offy Princess | Princess & Elegance |
| PCOF1-D1 | 玩乐时刻 Offy | Offy Playtime | Playful |
| PCOF1-L0 | 大号原皮 Offy | Offy Original Large | Large Plush |
| PCOF1-L1 | 泰国限定 Offy | Offy Thailand Exclusive Large | Large Plush |
| OF 02 … OF 3.1 | OF <编号> 联名款 Offy | Offy Collab OF <编号> | Collab & Custom |

> ⚠️ 以上 F1–F3、F4–F8 及 A–D 的具体关键词均为**占位命名**，严格遵循 §4.1 规则生成；最终以用户提供的中英文名为准（见 §11 待确认清单）。

---

## 5. 价格策略（Pricing，USD）

### 5.1 分层定价（3 + 1 档）

| 档位 Tier | 覆盖品类 | 建议美元区间 | 占位价（本 PRD 取值） |
| --- | --- | --- | --- |
| T1 包挂挂件 Bag Charm | F0 | $18 – $28 | $22 |
| T2 经典玩偶 18cm Classic Plush | F1–F8、A、B、C、D | $39 – $59 | 常规 $45；金属/环保材质 F4–F8 $49 – $55 |
| T3 大号玩偶 Large Plush | L0、L1 | $89 – $139 | 原皮 $99；泰国限定 $119 |
| T4 联名定制 Collab & Custom | OF 系列 | 询价（不公开标价） | `priceUsd = null` + `isQuoteOnly = true` |

**定价逻辑（占位假设，供后续调整）**：
- 同品类内**按系列/材质微调**，而非统一价：Signature Plush 为基价（$45），Multi-texture/Recycled 因工艺溢价 $4–$10，大号按体积 2–3 倍溢价。
- 泰国限定因「限定」属性溢价（约 +$20）。
- 所有价格为**占位价**，最终以用户定价为准。

### 5.2 价格存储：单一数据文件（Single Source of Truth）

- 价格**不写死在组件/页面**，全部来自一个数据文件，推荐 `src/server/catalog/products.ts`（或 `data/products.json`），由 seed 脚本写入 DB 或直接由服务层读取。
- 改价 = 改这一个文件 + 重新构建，不改任何 UI 代码。
- `priceUsd` 用 `number`（单位美元，2 位小数），前端展示时再格式化为 `$45.00` / `US$45`。

---

## 6. 产品数据模型字段清单（Product Data Model）

每个 SKU 对应一条记录，字段如下（TypeScript 类型参考）：

| 字段 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `code` | string | ✅ | 全局唯一产品编码，主键 | `"PCOF1-A3"` |
| `slug` | string | ✅ | URL 段，由 code 或 nameEn 派生（kebab-case） | `"offy-tennis-ace"` |
| `nameZh` | string | ✅ | 中文名 | `"网球甜心 Offy"` |
| `nameEn` | string | ✅ | 英文名 | `"Offy Tennis Ace"` |
| `priceUsd` | number \| null | ✅ | 美元价；联名/定制为 `null` | `45` |
| `priceTier` | enum | ✅ | 定价档位 `bag-charm \| classic-plush \| large-plush \| collab-custom` | `"classic-plush"` |
| `category` | enum | ✅ | 品类（同上枚举） | `"classic-plush"` |
| `series` | string | ✅ | 系列标识（machine key） | `"active-sporty"` |
| `seriesNameZh` | string | ✅ | 系列中文名 | `"活力运动"` |
| `seriesNameEn` | string | ✅ | 系列英文名 | `"Active & Sporty"` |
| `dimensions` | object | ⚠️ | 尺寸（cm）：`heightCm / lengthCm / headCircumferenceCm / armCm / legCm`；大号与包挂尺寸待补 | 见下方 JSON |
| `emotionTags` | string[] | ✅ | 形象/情绪标签，用于筛选与详情展示 | `["活力","球场","元气"]` |
| `materialTags` | string[] | ➖ | 材质标签（环保再生/金属质感），可为空 | `[]` |
| `images` | string[] | ✅ | 产品图路径（相对 `public/`），首图为主图 | `["/products/pcof1-a3-01.png"]` |
| `featured` | boolean | ✅ | 是否首页/精选展示 | `true` |
| `isAvailable` | boolean | ✅ | 是否可售（未来 IP = false） | `true` |
| `isUpcoming` | boolean | ✅ | 是否「预告」款（Miss Kitty/Psyche = true） | `false` |
| `isQuoteOnly` | boolean | ✅ | 是否只询价（联名/定制 = true） | `false` |
| `sortOrder` | number | ✅ | 目录/系列内排序 | `301` |
| `localizedNames` | object | ➖ | 未来多语言扩展：`{ "ja": "..." }`，预留不破坏现有字段 | `{}` |
| `createdAt` / `updatedAt` | datetime | ✅ | 数据管理时间戳（由数据层维护） | — |

**参考 JSON 示例（单一 SKU）**：

```json
{
  "code": "PCOF1-A3",
  "slug": "offy-tennis-ace",
  "nameZh": "网球甜心 Offy",
  "nameEn": "Offy Tennis Ace",
  "priceUsd": 45,
  "priceTier": "classic-plush",
  "category": "classic-plush",
  "series": "active-sporty",
  "seriesNameZh": "活力运动",
  "seriesNameEn": "Active & Sporty",
  "dimensions": {
    "heightCm": 18,
    "lengthCm": 7.5,
    "headCircumferenceCm": 24,
    "armCm": 3.5,
    "legCm": 3.5
  },
  "emotionTags": ["活力", "球场", "元气"],
  "materialTags": [],
  "images": ["/products/pcof1-a3-01.png", "/products/pcof1-a3-02.png"],
  "featured": true,
  "isAvailable": true,
  "isUpcoming": false,
  "isQuoteOnly": false,
  "sortOrder": 301
}
```

> 尺寸说明：`PCOF1` 系列通用规格为 **高 18cm · 长 7.5cm · 头围 24cm · 手臂 3.5cm · 腿部 3.5cm**（brand-brief §5.1）。大号（L0/L1）与包挂（F0）尺寸简报未给出，字段保留、值置 `null`，待补。

---

## 7. 「选款」概念与变体模型（Style Selection & Variant Model）

### 7.1 核心定义

- **「选款」= 选择「哪个 Offy 形象」**，即选择与用户情绪共鸣的那个「她」。
- **每个 Offy 形象 = 一个独立产品（SKU）**，拥有独立编码、独立详情页、独立图片集、独立库存（预留）。
- **本项目不采用「一个产品 + 多个色号」的变体模型**。不存在「Offy 玩偶」这个父产品，再挂「色号=A3/A4/B2…」属性；而是 35 个平铺的 SKU。

### 7.2 与 casetify「选款式」的对应关系

| 维度 | casetify | Offy 独立站 |
| --- | --- | --- |
| 先选什么 | 先选「手机壳型号」（iPhone 17 Pro Max 等） | 先选「品类」（包挂 / 经典 18cm / 大号） |
| 「选款式」指什么 | 挑选壳面印刷设计（图案/印花） | 挑选 **Offy 的穿搭/情绪形象**（对应产品图） |
| 每个款式 = ? | 一个独立的壳面 SKU（有独立图、独立价） | 一个独立的 Offy 形象 SKU（有独立图、独立价） |
| 加购粒度 | 按「型号 + 款式」加购 | 按「品类 + 形象」加购（本项目中品类已隐含在编码内） |
| 视觉呈现 | 款式网格（grid of design thumbnails） | 形象网格（grid of Offy looks） |

**结论**：把 casetify 的「壳面设计」类比为 Offy 的「形象」——两者都是「同形态、不同视觉/情绪内容」的独立 SKU。用户在 Offy 站的「选款」交互，就是 casetify「选款式」交互的等价物。

### 7.3 反例（明确不做）

- ❌ 不做「一个 Offy 玩偶产品，颜色下拉选 A3/A4/B2」。
- ❌ 不做「F 系列材质」作为 `color/material` 属性挂到 A–D 形象上（材质线本身也是独立 SKU）。
- ✅ 只做：每个编码一个详情页，详情页内**无**二级变体选择；「选款」发生在目录网格/列表层的形象挑选。

---

## 8. 核心用户故事与验收标准（User Stories + Given-When-Then AC）

> 以下为用户旅程主干。商城/支付属预留能力，本节作为未来 commerce spec delta 的 AC 蓝本。

### US-1 浏览产品目录（Browse Catalog）

**作为** 访客，**我希望** 按品类与系列浏览所有 Offy 形象，**以便** 找到与自己情绪共鸣的那一款。

- **GIVEN** 访客进入 `/shop`（或 `/products`）目录页
- **WHEN** 页面加载完成
- **THEN** 以「品类 → 系列」分组展示全部 35 个可售 SKU（未来 IP 归入「预告」区，不展示价格）
- **AND** 每个 SKU 卡片显示主图、中文名（当前语言）、英文名（副标题）、`$xx` 占位价
- **AND** 提供「系列」与「情绪标签」筛选；筛选后列表与计数正确更新

### US-2 进入商品详情（View Product Detail）

**作为** 访客，**我希望** 点开某个形象查看大图、尺寸与情绪标签，**以便** 决定是否购买。

- **GIVEN** 访客在目录页看到 `PCOF1-A3` 的卡片
- **WHEN** 点击该卡片
- **THEN** 跳转到 `/products/pcof1-a3`（或 `/products/offy-tennis-ace`）详情页
- **AND** 页面展示：多张产品图、`nameZh`/`nameEn`、`$45.00`、尺寸（18cm 等）、`emotionTags`、材质标签（若有）、系列面包屑
- **AND** 对 `isQuoteOnly = true` 的 OF 款，价格区显示「定制/联名咨询」而非金额

### US-3 选择形象/款式（Choose a Style）

**作为** 访客，**我希望** 在详情页或目录页自由切换不同形象，**以便** 比较并挑选「共鸣的她」。

- **GIVEN** 访客正在浏览某系列（如 Active & Sporty）
- **WHEN** 在「款式网格」中点击另一个形象缩略图（如从 A3 切到 A4）
- **THEN** 详情页/预览立即切换到该形象的主图、名称与价格
- **AND** URL 与「当前款式」状态同步更新（无需刷新）
- **AND** 系统仍将其视为**独立 SKU**（切换形象 = 切换到另一 SKU，而非修改同一 SKU 的属性）

### US-4 加入购物车（Add to Cart）

**作为** 访客，**我希望** 把选定的形象加入购物车，**以便** 一次结算多个形象。

- **GIVEN** 访客在 `PCOF1-C5` 详情页且该 SKU `isAvailable = true`
- **WHEN** 点击「加入购物车」
- **THEN** 购物车（session cart）新增一行，含 `code / nameZh / priceUsd / 数量 / 首图`
- **AND** 购物车角标数量 +1，并出现可关闭的「已加入」反馈
- **AND** 重复加购同一 SKU 使该行数量 +1，而非新增重复行
- **AND** 对 `isQuoteOnly = true` 的 SKU，不出现「加入购物车」，仅显示「咨询定制」

### US-5 结算下单（Checkout & Place Order）

**作为** 购物车有商品的访客，**我希望** 填写收件信息并确认订单，**以便** 完成购买。

- **GIVEN** 访客购物车含 ≥1 个可售 SKU，点击「结算」
- **WHEN** 访客填写收货信息（姓名/地址/邮箱）并提交
- **THEN** 系统按 `code` 逐行计算小计 = `priceUsd × 数量`，合计为各行之和（美元）
- **AND** 生成一条订单，含客户信息与 line items（`code / nameZh / priceUsd / qty`）
- **AND** 若 `priceUsd` 为 `null` 的 SKU 出现在购物车，则阻止下单并提示「含定制款，请单独咨询」

### US-6 支付成功（Payment Success）

**作为** 已提交订单的访客，**我希望** 完成支付并看到成功确认，**以便** 安心等待发货。

- **GIVEN** 存在一笔已提交订单，支付渠道为 Stripe（测试模式，默认）
- **WHEN** 支付 provider 回调返回成功（webhook / 前端确认）
- **THEN** 系统将订单标记为「已支付（paid）」
- **AND** 展示订单确认页（订单号、商品清单、金额、收件信息）
- **AND** 通过邮件（预留）发送确认；失败则订单回退为「待支付」并给出可重试提示

---

## 9. 与现有 OpenSpec 的关系

- 现有 `openspec/specs/commerce/spec.md` 已声明 catalog / cart / orders / payment 为**预留能力**。
- 本 PRD 是这些能力的**产品侧定义**：实现前应新建 `openspec/changes/<change-id>/`，在其 `specs/commerce/spec.md` delta 中引用本 PRD 的字段模型与 US-1~US-6 的 AC。
- 品牌展示页（现有 `brand-site`）可先以「目录只读 + 详情页只读 + 无购物车」形态上线；购物车/支付按本 PRD 的 US-4~US-6 后续启用。

---

## 10. 素材与映射约束（Assets）

- `resources/产品修图/`：29 张产品图，是**每个 Offy 形象**的产品图；文件名是生成时间戳，与编码无天然对应。
- 映射策略（占位）：按「生成时间顺序」自动映射到编码（brand-brief §9），生成 `images[]`；映射表集中存放，便于后改。
- **数量缺口待确认**：29 张产品图 vs 35 个 SKU（含 14 个 OF 联名），缺口 6 张 + 联名款图需另补；若 OF 款与 PCOF1 形象共享素材，需在映射表中声明。
- `resources/ins/`：23 张生活方式图，用于品牌宣传/首页，不进产品 `images[]`。
- 图片拷贝进 `public/` 引用，勿外链（brand-brief §8）。

---

## 11. 待用户确认清单（Open Questions）

| # | 待确认项 | 当前假设 | 影响 |
| --- | --- | --- | --- |
| 1 | **每个编码的最终中英文名** | 按 §4.1 规则生成的占位名（表 §4.2） | 全站展示文案 |
| 2 | **最终价格** | §5.1 分层占位价（$22 / $45 / $99…） | 购物车/支付与前台标价 |
| 3 | **产品图 ↔ 编码精确映射** | 暂按时间戳顺序自动映射 | 详情页正确图 |
| 4 | **F6 跨系列归属** | F6 同时列于 Multi-texture 与 Recycled & Eco，暂按单一 SKU、双系列标签处理 | 目录筛选与计数 |
| 5 | **大号款编码** | 建议补 `PCOF1-L0` / `PCOF1-L1` 占位编码 | 数据主键与 URL |
| 6 | **编码不连续**（A 缺 A1/A2、B 缺 B1、C 缺 C1） | 视为 PDF 未列全或未上架，暂不建 SKU | SKU 总数（35） |
| 7 | **大号/包挂尺寸** | 字段保留、值置 `null` 待补 | 详情页尺寸展示 |
| 8 | **OF 联名款销售方式** | 不公开标价，走「定制/联名咨询」（`isQuoteOnly`） | 购物车/结算流程（US-4/US-5） |
| 9 | **未来 IP（Miss Kitty/Psyche）上架节奏** | 仅「预告」展示，不可售 | 目录页结构 |
| 10 | **价格/命名数据文件的最终位置** | 建议 `src/server/catalog/products.ts` | 数据层实现（OpenSpec 阶段定） |
| 11 | **多语言扩展语言清单** | 先中英，预留 `localizedNames` | i18n schema |
| 12 | **支付渠道** | 默认 Stripe 测试模式 | US-6 实现 |

---

*本文档为产品侧 PRD，配套的 spec delta（OpenSpec）与实现任务将在用户确认上述清单后，按 `AGENTS.md` 的 spec-first + TDD 流程推进。*
