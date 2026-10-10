## Why

首页有三轮改动**先改了代码、没走 spec-first**（`AGENTS.md` 要求行为变更先落提案），
导致 `openspec/specs/brand-site/spec.md` 落后于实现。本次把这些 delta 一次补齐。

具体漂移（逐条对照代码核实，非推测）：

1. **头图系列屏早已不是"标题/副标题 PNG"**。规格里写的是「OFFY+series title PNG at
   x11.5%/y62.4%、subtitle PNG right-aligned at x39.9%/y62.6%、CTA at x58%/y73.1%」，
   但新 PSD（`网站头图.psd`）直接给了英文文字层，实现已改为**实时文字**（副标题
   x6.4% y64.51% / 主标题 x6.4% y71.2%，CTA 与副标题同一 flex 行右对齐）。
   促销屏同样从「two-line promo copy PNG」改成了实时文字。
2. **CTA 的位置与尺寸变了**：原先按 PSD 独立定位在 y62.75%，实测比副标题中心高约 2%
   头图高（1440 下 65.22% vs 67.20%），已改为与副标题**同行居中**；字号在 PSD 的
   1.45cqw 基础上小 2 号（18px 封顶），边框高度从 4.94% 收到 2.6cqw。窄屏另有
   （lg 以下）主标题下移到 73%、箭头缩小下移到 84.8% 的适配。
3. **资讯模块版式变了**：标题并成一行居中的「News·The Latest from OFFY」，
   「Browse all series」从网格内移出到标题下方；每张卡的文案从图片左下/图下移进
   **底部居中的黑色胶囊**；主卡文案移到顶部居中。
4. **更多新品区块标题层级曾颠倒**：PSD 里小字 `Stay tuned.` 在上、大字
   `Upcoming Releases` 在下，旧实现是反的，已按 PSD 调正。
5. **区域限定早已不是写死三个商品号**。「区域限定」现在按**访客所在国家**从
   Shopify Markets 动态推导：Shopify 侧的区域限定不是 tag 也不是 metafield，而是
   「只把商品发布到某些 Market」，服务端拿同一份 Storefront 查询换不同
   `@inContext(country:)` 跑一遍再比对。实测该店 37 个商品里 6 个是限定款
   （COLD KITTEN 仅 US、NOIR 仅 GB、BOOTS 仅 HK、LEMON FIZZ US/AU/HK、
   POLKA CHIC 恰好排除 US/GB/AU/HK、COASTAL STAR 除 AU 外全部）。
   规格里那条 `CPL02/CPL08 → U.S. ONLY、FLS10 → UK ONLY` 是改造前的写死数据。
6. **后续计划区块没有对应 Requirement**：`后续计划.psd` 把两个 IP（Miss Kitty /
   Butterfly Sprite）的角色形象公开了，卡片从"纯点阵占位盒 + COMING SOON — TBD"
   改成"智能对象插画 + IN DEVELOPMENT 胶囊 + 名字 + 居中标语"，且第二款从
   `PSYCHE` 定名为 `Butterfly Sprite`。

另外顺手清理：头图 Requirement 里有两组**完全重复**的 scenario
（`Slide links to landing` / `CTA navigates to landing`、`Slide 1 wordmark and slogan` /
`Slide 1 wordmark and one-line slogan` / `Slide 1 text overlay`）。因为 MODIFIED 是
整块替换、校验器不允许丢 scenario，本次保留全部原有 scenario 名并把 body 改写为
当前真实行为，重复项合并语义但不删名。

## What Changes

- `openspec/specs/brand-site/spec.md` 的 `Hero carousel with landing links` 改写：
  系列屏与促销屏说明改为实时文字，位置/字号/箭头按当前实现；
  新增 CTA 与副标题同行居中、lg 断点差异两条约束。
- `News module` 改写：标题一行居中、browse-all 移到标题下方、卡片文案进底部黑色胶囊。
- `Teaser section for upcoming series` 改写：标题层级按 PSD 调正。
- `Homepage renders brand content` 改写：区域限定 scenario 改为按访客国家从
  Shopify Markets 推导；联名 CTA 邮箱换到当前公司域名。
- 新增 `Coming-next IP cards` Requirement：描述后续计划区块的 PSD 结构与两款 IP。

## Capabilities

### ADDED

- **brand-site / Coming-next IP cards**：后续计划区块的双卡结构、插画来源与文案来源。

### MODIFIED

- **brand-site / Hero carousel with landing links**、**News module**、
  **Teaser section for upcoming series**、**Homepage renders brand content**。

## Impact

- 只动规格文档：`openspec/changes/2026-10-07-catch-up-homepage-specs/**`。
- **不改任何代码** —— 本次是把已经上线并验证过的实现补写成规格，不是反过来驱新实现。
- 与同时在案的 `2026-10-07-add-legal-policies` **无 Requirement 重叠**：那条提案只
  ADDED 新能力与页脚/焦点样式两条新 Requirement，`Homepage renders brand content`
  的 MODIFIED 归本次（否则两个 open change 改同一条 Requirement，归档时会冲突）。
