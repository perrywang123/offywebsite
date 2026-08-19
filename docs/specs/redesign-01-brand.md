# PLAYCORE 凭空幻想 — 品牌呈现层重设计规格

> 文档编号：`redesign-01-brand.md` · 归属：品牌设计专家
> 输入：`docs/brand-brief.md`、`src/lib/catalog/products.ts`、`src/app/[locale]/page.tsx`、`about/page.tsx`、`messages/zh.json`、`en.json`、`docs/specs/03-visual-spec.md`
> 目标：把独立站从「PPT 式商品陈列」升级为「像公司品牌官网」的品牌呈现层。
> 范围：**仅品牌呈现层**（首页 + about 页的信息架构、品牌标识、全部形象展示方案、文案语气与关键区段文案），不涉及支付/购物车/服务端逻辑。

---

## 0. 现状诊断（一句话结论）

> 现状是一个「能用的商品页」，不是一个「有品牌身份的官网」。
> 三个致命伤：**公司名缺失**（header 是 "Offy"，hero 主标题是"把情绪穿在身上"，通篇找不到 "PLAYCORE 凭空幻想" 作为主角）、**形象不完整**（首页只露 8 个 featured + 5 个纯色块，29 个形象里的 8 个"待定"、未来 IP、OF 联名 14 款全部不可见）、**PPT 感**（section 平铺堆叠 + 纯色 tiles + "Lookbook" 这类设计草稿词）。

现有设计系统（`03-visual-spec.md`）的**色彩/字体 token 是好的**（暖黑+奶油+波普点缀、Arial Black 系统字体栈），本规格**不推翻**它，只重排「叙事结构与品牌标识」这一层。

---

## 1. 品牌叙事结构

### 1.1 品牌叙事主线（贯穿全站的「三幕」）

把散落的 section 收拢成一条有因果的故事线，替代现在的「hero → featured → series → story → lookbook → newsletter」平铺：

| 幕 | 一句话 | 对应 section | 情绪 |
| --- | --- | --- | --- |
| **第一幕 · 她是谁** | 我们是谁，Offy 从哪来 | 品牌标识 Hero + 品牌宣言 | 好奇、温柔 |
| **第二幕 · 她的每个样子** | 一个 Offy，29 个化身 | 全部形象（章节 + 名册） | 琳琅、代入 |
| **第三幕 · 她的未来** | 更多伙伴 + 联名 + 订阅 | 未来 IP + 联名定制 + 订阅 | 期待、行动 |

> 关键转变：**公司名与 slogan 是第一幕的主角，IP（Offy）是第二幕的主角**。现在顺序反了——用户先看到"把情绪穿在身上"，翻到底也不知道这是哪家公司。

### 1.2 首页信息架构（从上到下，一屏一意图）

```
① 品牌 Hero（全幅 / 半幅，暖黑或奶油底）
   - 超眉（eyebrow）：PLAYCORETOYS · 2026
   - H1 大字第一行：PLAYCORE 凭空幻想（公司名 = 主角）
   - H1 大字第二行：让想象落地，让陪伴发生（slogan，强调色）
   - 副文案：用一句话把 IP 引进来（Offy 是谁 → 情绪穿搭）
   - 主 CTA：逛全部形象 ｜ 次 CTA：认识 Offy（品牌故事）
   - 视觉：ins 大图 + 公司名叠压/错位排版（editorial，非 PPT 居中）

② 品牌宣言（Manifesto，独立「屏幕」）
   - 暖黑全宽或奶油大留白居中，大字号引语排
   - 三段式：信念 → 创造 Offy → 「她不是玩偶，是共鸣的她」
   - 落款：slogan 双语（让想象落地… / Imagine with Love…）

③ 全部形象总览（THE CAST —— 本页最重的一屏，见 §3）
   - 章节式系列导航（9 个情绪章节，编号 01–09）
   - 全员名册（29 个形象紧凑可扫，含 8 个"待定"占位）
   - 三种状态徽章：可购 / 待揭晓 /（预告·定制另起两段）

④ 未来 IP 预告（COMING NEXT）
   - Miss Kitty 千金猫 · Psyche 灵魂与蝴蝶女神（2 张大卡 + 剪影/色块占位）
   - 「即将登场」徽章，附订阅入口（把期待转成订阅）

⑤ 联名定制（MAKE OFFY YOURS）
   - OF 联名 14 款编码墙 + 品牌定制叙事 + 联系 CTA
   - 讲「为品牌/创作者开放定制」，不卖现货

⑥ 订阅（NEVER MISS HER）
   - 简短收尾，与②宣言呼应
```

> **删除项**：原「Lookbook」section 不再以独立标题存在；原「Series」纯色 tiles、原「Featured」单独 section 并入 ③。原「Story」并入 ②。ins 生活图**不单独成节**，而是**融入 ① Hero、② 宣言、⑥ 订阅**作为 editorial 配图，让品牌图服务于叙事而非被陈列。

### 1.3 About（品牌故事）页结构

现在的 about 页骨架是对的（故事/团队/零售/未来/定制），缺的是**公司名与质感**，重排为：

```
① 页首：公司名 + slogan（大字）+ 一句话定位
   - "PLAYCORE 凭空幻想" 主标识
   - "Imagine with Love. Create with Companion." / "让想象落地，让陪伴发生"

② 起源（Origin）：呀哈哈灵感 → Offy 诞生 → 设计理念
   - 大图叙事（ins 图 + 情绪排版），非纯文字段落

③ 创作团队（The Makers）：JIE / 桃子
   - 从「卡片列表」升级为「人物位 + 署名 + 城市坐标」（曼谷/上海）
   - 增加小红书账号（4976893650）作为社交触点

④ 零售网络（Stockists）：TX 淮海 / 银泰 in77 / 曼谷 Warehouse30_6
   - 做成「城市坐标」列表，可配 ins 图氛围

⑤ 全部形象速览（The Cast 精简版）—— 让 about 页也能扫到 29 个形象 + 未来 IP
   - 复用首页 §3 的名册组件（紧凑条带），跳转 /products

⑥ 未来 IP + 联名定制（同首页④⑤，可合并为一段）

⑦ 收尾 CTA：逛全部形象 + 订阅
```

---

## 2. 公司名 / 品牌标识呈现方式（纯文字 Logo）

> 约束：**无图片 logo**，全部用系统字体栈（`--font-display` Arial Black + `--font-sans` PingFang SC，见 `03-visual-spec.md` §2）。这是优点而非限制：文字 logo 更清晰、可缩放、双语一致、无需切图。

### 2.1 双语文字 Logo Lockup（唯一权威样式）

```
┌─────────────────────────────┐
│  PLAYCORE                   │  ← Latin 主标：font-display 900，全大写，-0.02em
│  凭空幻想                    │  ← 中文副标：font-sans 700（PingFang SC）
│  PLAYCORETOYS · EST. 2026   │  ← 微标：font-sans 600，12px，tracking 0.2em
└─────────────────────────────┘
```

**规则（一票否决）：**
1. **主标永远是 `PLAYCORE` + `凭空幻想` 同框**（双语 lockup），不允许只出现 "Offy" 当 logo。
2. 「Offy」是 **IP 角色名**，不是公司名——只能出现在 Hero 副文案、品牌故事、商品名中，绝不进 header 主标识位。
3. 三种布局变体：
   - **水平式（Header）**：`PLAYCORE 凭空幻想` 一行，Latin 左、中文右，中间 `0.5em` 字距；字号 `text-lg`。
   - **堆叠式（Hero / 页脚）**：Latin 上、中文下；Latin `text-5xl md:text-7xl`、中文 `text-2xl`。
   - **印章式（可选，徽章场景）**：中文「凭空幻想」竖排或圆圈内，仅用于贴纸徽章，不作主标识。
4. 颜色：默认 `ink-900`；深底（hero/页脚）用 `cream-50` 或 `paper`；slogan 里的关键词可用 `pop-coral`/`pop-yellow` 局部高亮。

### 2.2 Slogan 的位置与层级（三处，各司其职）

| 位置 | 层级 | 形式 |
| --- | --- | --- |
| **Hero** | 最高（Display） | 作为 H1 第二行，与公司名同框；`text-4xl md:text-6xl`；中文 `font-black`、英文 `font-display 900` |
| **页脚** | 低（辅助） | 公司名 lockup 下，一行小字 `text-sm text-cream-50/70` |
| **About 页首 / 宣言落款** | 中（强调） | 独立引语式大字，双语并置（中上英下或并排） |

**中英并置规则**：任何 slogan 出现，两种语言**必须同时在场或可互相切换**，强化「凭空幻想」是双语品牌。Hero 默认显示当前 locale 语言为主、另一语言为辅（小一号、低对比度），例如中文页：主「让想象落地，让陪伴发生」+ 辅「Imagine with Love. Create with Companion.」。

### 2.3 品牌标识在 Header 的落地

现状 Header 用 `t("brandShort")` = "Offy"。改为：

```tsx
<Link href="/" className="flex items-baseline gap-2">
  <span className="font-display text-lg font-black tracking-tight text-ink-900">PLAYCORE</span>
  <span className="text-sm font-bold text-ink-700">凭空幻想</span>
</Link>
```

> 英文 locale 下同样显示双语（PLAYCORE + 凭空幻想），只在需要时让中文以更小/更弱的字级出现，**不隐藏中文**——公司中文名是品牌身份的一部分。

---

## 3. 「展示全部形象」呈现方案（分层，非平铺网格）

> 目标：29 个产品形象 + 2 个未来 IP + OF 联名 14 款，**全部可见、有层次、有质感**，而不是一张 4×7 的平铺 PPT 网格。

### 3.1 四态分层模型（先分类，再呈现）

把所有"形象"按**状态**分成四类，每类用不同的视觉语言，避免"可购商品、待定占位、未来预告、联名定制"混在一起显粗糙：

| 态 | 数量 | 内容 | 视觉语言 | 交互 |
| --- | --- | --- | --- | --- |
| **① 在售可购** | 21 | F0–F8 / A3–A4 / B2–B4 / C2–C5 / D1 / L0–L1（有命名） | 白底产品卡（`bg-paper`，3:4） | 点击 → 详情 → 加购 |
| **② 待揭晓** | 8 | P22–P29（"形象待定"占位） | 暖灰底 + 「No.22」编号 + 「即将揭晓」徽章 | 点击 → 详情页占位态（不可购） |
| **③ 未来 IP** | 2 | Miss Kitty / Psyche | 大卡 + 剪影/色块占位 + 「即将登场」徽章 | 点击 → about 页锚点，附订阅 |
| **④ 联名定制** | 14 | OF 02 … OF 3.1 | 编码墙 + 「定制/联名」徽章，非商品卡 | 点击 → 联系/定制 CTA |

### 3.2 首页「全部形象」section 的复合结构（THE CAST）

**A. 章节式系列导航（"按情绪探索"）——替代原 5 个纯色 tiles**

把 9 个系列当作杂志的 **9 个章节（Chapter）**，每章一张「主形象产品图」做底，叠加编号与情绪 tagline：

- 视觉：`grid-cols-2 md:grid-cols-3`，每格 `aspect-[3/4]`，主形象图铺满 + 底部渐变遮罩（`bg-ink-900/40`）+ 编号 `01–09` + 系列名 + 情绪 tagline。
- 首格做成「全部形象 / All 29」入口（珊瑚色或暖黑色块），其余 8 格按系列（bag-charm 排 01）。
- 点击 → `/collections/[series]`。
- **情绪标签取代功能词**：系列名用现有 `seriesList.name`，但 tagline 用「情绪」而非「规格」（例：Signature → "最纯粹的她"；Princess & Elegance → "优雅是她，也是你"）。见 §4 文案。

**B. 全员名册（The Cast Index）——"其他形象简单展示"的落点**

在系列章节下方放一个**紧凑可扫的全量名册**，让 29 个形象一眼可见：

- 视觉：圆形头像墙（`rounded-full`，`w-16 h-16`，`object-cover` 聚焦面部）横向 wrap 排列，或 6–8 列小缩略条带。
- 每个头像：hover 显示形象名 + 情绪 tag；点击进详情。
- **待揭晓的 8 个**（P22–P29）同样出现在名册里，用暖灰底 + 「?」/「No.22」标识，**不缺席**——让用户知道"后面还有"。
- 底部一条「查看全部 29 个形象 →」链到 `/products`。

> 这样 29 个形象获得 **双重呈现**：系列章节给「叙事与情绪」，名册给「完整性与可扫性」。前者是质感，后者是"简单展示所有形象"的硬需求。

**C. 未来 IP 预告（COMING NEXT）——从 about 页前置到首页**

- 2 张 `md:grid-cols-2` 大卡，暖黑或奶油底。
- 无正式图 → 用**剪影/色块占位**（`bg-cream-100` + 大号角色名 + 「即将登场」徽章），或用 ins 氛围图代替；**不伪造角色图**。
- 文案（§4）给每个 IP 一个「人设一句话」+ 订阅 CTA 按钮。

**D. 联名定制（MAKE OFFY YOURS）——OF 14 款编码墙**

- 标题 + 一句话叙事（品牌联名是能力，不是现货）。
- **编码墙**：14 个 OF 编码（`OF 02 / OF 03 / OF 2.2 / … / OF 3.1`）做成胶囊徽章矩阵（`rounded-full`），hover 变珊瑚色——既"展示了 14 款"，又诚实（无图时不造假）。
- 一句正文 + 「定制/联名合作 →」CTA（链到 about 页 custom 段或 mailto）。

### 3.3 数据缺口（前置依赖，见 §6）

- **OF 联名 14 款**：`products.ts` 中**完全不存在**（只有 brand-brief §5.3 的编码），也无图。方案 D 先以「编码墙 + 文案」呈现，等图/数据补全后再升级为商品卡（`isQuoteOnly: true`）。
- **未来 IP 2 个**：`upcomingIps` 已有数据但**无图**，用剪影/色块占位。
- **待揭晓 8 个**：`products.ts` 命名是 `Offy 形象 22（待定）`，**命名策略要改**（见 §5 P1）。

---

## 4. 品牌语气与文案风格（中英）

### 4.1 语气基调（Voice）

| 维度 | 原则 | 反例（现状） |
| --- | --- | --- |
| 说话对象 | 对「你」说话，不是对「用户」 | "订阅获取新品"（冷） → "别错过下一个她"（亲） |
| 情绪 | 温柔 + 一点街头倔强，不卖萌过火 | "把情绪穿在身上" 只讲产品，不讲品牌 |
| 词汇 | 用「她/化身/情绪/共鸣」，不用「款式/规格/系列」当卖点 | "按系列探索"、"热门形象"、"Lookbook" |
| 设计草稿词 | **禁用** "Lookbook / 画板 / Mockup / 图集" | 现状 lookbookTitle 硬编码 "Lookbook" |
| 公司感 | 自称「PLAYCORE 凭空幻想」，用「我们」 | 现状通篇只有 "Offy" |
| 中英一致性 | 中文有温度、英文短促有力（Arial Black 天生适合短句） | 中英文案基本对等，但标题平淡 |

### 4.2 关键区段文案建议（可直接替换 `messages/*.json`）

**Hero（公司名 + slogan + IP 一句话）**

| 字段 | 中文 | English |
| --- | --- | --- |
| eyebrow | PLAYCORE 凭空幻想 · 2026 | PLAYCORE 凭空幻想 · 2026 |
| heroTitle1 | **PLAYCORE 凭空幻想** | **PLAYCORE** |
| heroTitle2 | **让想象落地，让陪伴发生** | **Imagine with Love.**<br>**Create with Companion.** |
| heroSub | Offy 是我们创造的第一个小精灵——从自然汲取力量，把情绪穿在身上的黑肤色卡通 IP。你挑选的，是与自己共鸣的那个她。 | Offy is our first spirit — a dark-skinned cartoon IP who draws strength from nature and wears her mood on the outside. The one you pick is the her that feels like you. |
| shopCta | 逛全部形象 | Shop All Looks |
| aboutCta | 认识 Offy | Meet Offy |

> 副 slogan（另一语言）作为辅助行并置在 H1 下方：中文页配 `Imagine with Love. Create with Companion.`，英文页配 `让想象落地，让陪伴发生`。

**品牌宣言（Manifesto）**

| 中文 | English |
| --- | --- |
| 我们相信，想象是温柔的勇气，陪伴是落地后的爱。 | We believe imagination is gentle courage, and companionship is love made real. |
| 于是我们创造了 Offy——一个任性、倔强、满脑子古怪想法的小精灵，把内心穿在身上，把情绪变成造型。 | So we made Offy — a willful, stubborn little spirit full of strange ideas, who wears her heart on the outside and turns mood into style. |
| 她不是一只玩偶，而是与你共鸣的那个「她」。 | She isn't a plush. She's the her that resonates with you. |
| Imagine with Love. Create with Companion. | 让想象落地，让陪伴发生。 |

**各 section 标题（替代现状文案）**

| 场景 | 中文（现状 → 建议） | English（现状 → 建议） |
| --- | --- | --- |
| 全部形象总览 | 热门形象/按系列探索 → **她的每个样子** | Featured Looks → **Every Her** |
| 系列章节 | 按系列探索 → **按情绪找她** | Shop by Series → **Shop by Mood** |
| 全员名册 | （无）→ **全员名册** | （无）→ **The Cast** |
| 品牌故事 | 你挑选的不只是一只玩偶 → **她从哪里来** | → **Where She Came From** |
| ~~Lookbook~~ | ~~Lookbook~~ → **她的日常**（并入 hero/宣言） | ~~Lookbook~~ → **Offy in the Wild** |
| 未来 IP | 未来 IP → **接下来，还有她们** | Upcoming IPs → **Coming Next** |
| 联名定制 | 定制与联名 → **把 Offy 变成你的品牌** | Custom & Collab → **Make Offy Yours** |
| 订阅 | 加入 Offy 的陪伴 → **别错过下一个她** | Stay in the loop → **Never Miss Her** |

**系列情绪 tagline（在 `series.ts` tagline 上微调，更情绪化）**

| 系列 | 中文 tagline（建议） | English tagline（建议） |
| --- | --- | --- |
| bag-charm | 把她挂上包，随身陪伴 | Carry her everywhere you go |
| signature | 最纯粹的她，原皮与经典 | The signature her, in her purest form |
| multi-texture | 金属与再生，另一种质感 | Metal & recycled, a different texture |
| recycled-eco | 温柔对待地球的她 | Her, gentle on the planet |
| active-sporty | 球场、健身房、街头的元气 | Built for court, gym & street |
| outdoor-lifestyle | 自然、漫步与聚会的松弛 | Made for nature, citywalks & hangouts |
| princess-elegance | 优雅是她，也可以是你 | Elegance is her — and you |
| playful | 搞怪是她的日常 | Whimsy is her daily |
| large-plush | 更大只，更治愈的拥抱 | Bigger, warmer hugs |

**未来 IP 文案（补「人设一句话」，现只有 name + tagline）**

| IP | 中文 | English |
| --- | --- | --- |
| Miss Kitty 千金猫 | 即将登场 · 千金大小姐，傲娇但心软 | Coming soon · The heiress, proud but soft-hearted |
| Psyche 灵魂与蝴蝶女神 | 即将登场 · 灵魂与蝴蝶女神，温柔而神秘 | Coming soon · Soul & Butterfly, gentle and mysterious |

**OF 联名定制**

| 字段 | 中文 | English |
| --- | --- | --- |
| 标题 | 定制与联名 · 14 款 | Custom & Collab · 14 Looks |
| 正文 | 已有 14 款品牌联名定制形象（OF 系列）。我们为品牌与创作者开放定制——把你的故事，穿到 Offy 身上。 | 14 collaboration looks already exist (OF series). We open custom & collab to brands and creators — put your story on Offy. |
| CTA | 联名/定制合作 → | Start a collab → |

---

## 5. 现站评分与 P0/P1 改进清单

### 5.1 评分（100 分制）

| 页面 | 得分 | 一句话 |
| --- | --- | --- |
| **首页** | **55 / 100** | 能用但无品牌身份：公司名缺席、形象不全、PPT 式堆叠 |
| **About** | **62 / 100** | 结构较完整，但缺公司名主标识、无 OF 联名 14 款、质感偏卡片列表 |

**首页扣分点（55 分）：**
- 品牌标识（20 分制）：**5 分** — header 用 "Offy" 而非公司名；hero 主标题"把情绪穿在身上"不点公司名；slogan 只在 story 引语里弱出现。
- 叙事结构（25 分制）：**14 分** — section 平铺无因果（hero→featured→series→story→lookbook→newsletter），像汇报 PPT 而非官网叙事。
- 全部形象（20 分制）：**8 分** — 仅 8 个 featured + 5 个纯色 series 块；29 个不完整、8 待定不可见、未来 IP 与 OF 联名 14 款完全缺席。
- 文案语气（15 分制）：**11 分** — "Lookbook" 硬伤 + "热门形象/按系列探索"平淡；但 story 段文案不错。
- 视觉质感（20 分制）：**10 分** — 纯色 tiles 像 PPT；ins 图 masonry 与 token 使用尚可，但整体 editorial 排版缺失。

**About 页扣分点（62 分）：**
- 有正确骨架（故事/团队/零售/未来/定制），但页首是 slogan 而非公司名；无 OF 联名 14 款；团队/零售是纯列表；未来 IP 无图无质感；无全量形象速览。

### 5.2 P0（本规格验收必须，每条可落地）

| # | 改进项 | 落地位置 | 现状 → 目标 |
| --- | --- | --- | --- |
| P0-1 | **Header 主标识改为公司名双语 lockup** | `components/layout/Header.tsx` + `messages` | `t("brandShort")`="Offy" → `PLAYCORE 凭空幻想`（§2.3） |
| P0-2 | **Hero 重构：公司名 + slogan 双行大字 + IP 一句话** | `page.tsx` hero + `messages.home` | 现"把情绪穿在身上" → `PLAYCORE 凭空幻想 / 让想象落地，让陪伴发生`（§4.2） |
| P0-3 | **删除 "Lookbook" 词汇与独立 section** | `page.tsx` + `messages.home` | `lookbookTitle="Lookbook"` → 删除，ins 图融入 hero/宣言/订阅 |
| P0-4 | **首页新增「全部形象」复合 section** | `page.tsx` 新增 + 复用 `ProductGrid`/新 `CastIndex` 组件 | 现 8 featured + 5 色块 → 章节导航（9 系列）+ 全员名册（29） |
| P0-5 | **未来 IP + OF 联名前置到首页** | `page.tsx` 新增两段 | 现仅在 about → 首页 ④⑤ 两段（§3.2 C/D） |
| P0-6 | **补齐文案**（hero/宣言/section 标题/未来 IP 人设） | `messages/zh.json` + `en.json` | 按 §4.2 全量替换 |

### 5.3 P1（质感提升，紧随 P0）

| # | 改进项 | 落地位置 |
| --- | --- | --- |
| P1-1 | **series 纯色 tiles → 情绪章节卡**（主形象图底 + 编号 + 情绪 tagline） | `page.tsx` §3.2 A |
| P1-2 | **8 个"待定"形象命名去 TBD**：`Offy 形象 22（待定）` → `Look No.22`（EN）/ `造型 22`（ZH），配「即将揭晓」徽章，详情页置 `isUpcoming` 态 | `products.ts` P22–P29 + `ProductCard` |
| P1-3 | **Hero 主 CTA 用珊瑚强调色**（`pop-coral`），提升行动感，贴合 `03-visual-spec` §4.1 Accent | `page.tsx` |
| P1-4 | **About 页首改为公司名 + slogan 主标识**，补 OF 联名 14 款 + 全量形象速览条带 | `about/page.tsx` |
| P1-5 | **团队/零售质感升级**：人物位 + 城市坐标 + 小红书账号（4976893650） | `about/page.tsx` |
| P1-6 | **页脚 slogan 双语齐全 + 社交触点**（小红书/小红书账号链接） | `components/layout/Footer.tsx` |
| P1-7 | **动效/滚动入场**按 `03-visual-spec` §6 落地，替代平铺直给 | 各 section |

---

## 6. 数据缺口与前置依赖（实现前必读）

> 品牌呈现层要「展示全部形象」，但以下数据**当前不存在**，需先补数据或先以占位呈现，否则 UI 无法落地。

| 缺口 | 现状 | 影响 | 建议 |
| --- | --- | --- | --- |
| **OF 联名 14 款无数据** | `products.ts` 无任何 OF 条目；brand-brief §5.3 仅有 14 个编码（OF 02 … OF 3.1） | 首页「联名定制」无法展示 14 款商品 | 先以「编码墙 + 文案」呈现（§3.2 D）；数据/图补全后加 `isQuoteOnly:true` 条目 |
| **未来 IP 无图** | `upcomingIps` 只有 name/tagline | Miss Kitty/Psyche 卡无视觉 | 用剪影/色块/ins 氛围图占位，**不伪造角色图** |
| **8 个待定形象图↔编码未确认** | `products.ts` P22–P29 是"形象待定"占位，`image-inventory.md` 仅映射到 `p22–p29` | 名册里 8 个形象无法确定对应关系 | 先按现有 `img(22–29)` 映射展示，命名用 `Look No.22` 中性占位 |
| **产品中英文名/价格仍为占位**（brief §9） | `products.ts` 注释明确说明 | 文案层只能用编码 + 占位价 | 本规格文案不依赖最终名，用「形象编号 + 情绪 tag」承载 |

---

## 附：一页速览（供评审）

- **品牌主线**：公司名（PLAYCORE 凭空幻想）→ slogan（让想象落地 / Imagine with Love）→ IP（Offy）三件套在 Hero 一次讲清。
- **标识**：`PLAYCORE` + `凭空幻想` 双语纯文字 lockup，Arial Black + PingFang SC，三处锁定（header/hero/footer）；"Offy" 降级为 IP 名。
- **全部形象**：四态分层（21 在售 / 8 待揭晓 / 2 未来 IP / 14 联名）+ 章节导航 + 全员名册，29+2+14 全可见。
- **去 PPT 化**：删 "Lookbook" 与纯色 tiles，改用 editorial 大图叙事 + 情绪化文案。
- **评分**：首页 55 / about 62；P0 六项、P1 七项，全部落地到具体文件与 `messages/*.json`。
