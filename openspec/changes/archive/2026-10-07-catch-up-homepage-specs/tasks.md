# Tasks

> 本变更是**规格追平实现**（docs-only），不改代码。每条任务以「与实现核对一致」收尾。

## 1. 差异审计（逐条对照代码，不做推测）

- [x] 1.1 头图：核对 `HeroCarousel.tsx` 的实际定位/字号/断点，与规格里的
      「title PNG x11.5%/y62.4%、subtitle PNG x39.9%/y62.6%、CTA x58%/y73.1%」比对，
      确认系列屏与促销屏都已改为实时文字。
- [x] 1.2 头图 CTA：实测副标题与 CTA 的垂直中心（1440 与 1638 视口均为 0.00% 误差），
      记录 CTA 高度 2.6cqw / 字号 `clamp(9px,1.24cqw,18px)` / `min-w-[15.35cqw]`。
- [x] 1.3 头图窄屏：实测 390 / 640 / 870 / 1440 四个视口的
      副标题 top 64.51%、主标题 top 73%（lg 以下）/ 71.2%（lg 以上）、
      箭头 84.8% 与尺寸 `clamp(20px,2.7cqw,38px)`（lg 以下）。
- [x] 1.4 资讯模块：核对 `page.tsx` 的 `{newsKicker}·{newsTitle}` 单行居中标题、
      browse-all 已移出网格、`NewsGrid.tsx` 的黑色胶囊
      （主卡 `bottom-[10%] h-[15.56cqw] w-[52.4%]`、副卡 `bottom-[8.4%] h-[13.4%] px-[9cqw]`）、
      副卡无 figcaption。
- [x] 1.5 更多新品：核对 `page.tsx` 里 `stayTuned`(1.11vw) 在上、
      `teaserSub`(3.14vw) 在下，确认层级已按 PSD 调正、背景水印不重复渲染。
- [x] 1.6 区域限定：核对已无写死商品号，改为 `server/catalog/regional.ts`
      按 `@inContext(country:)` 推导；记录实测的 6 款限定与各自可见区域。
- [x] 1.7 后续计划：核对 `UpcomingCard.tsx` 的 PSD 比例
      （插画 x33.0/y-5.3/w72.1、胶囊 x6.9/y37.8/w32.9/h6.5cqh、名字 6.21cqw、标语两行居中），
      以及 `upcomingIps` 里第二款已定名 `Butterfly Sprite`。

## 2. 写 delta

- [x] 2.1 `MODIFIED Hero carousel with landing links`：改写说明段 + 保留**全部 14 条**
      原有 scenario 名（MODIFIED 是整块替换，校验器不允许丢 scenario），
      body 改写为当前真实行为；新增 `CTA stays centred on the subtitle`。
- [x] 2.2 `MODIFIED News module`：标题单行居中、browse-all 移出网格、卡片文案进黑色胶囊。
- [x] 2.3 `MODIFIED Teaser section for upcoming series`：标题层级按 PSD 调正。
- [x] 2.4 `MODIFIED Homepage renders brand content`：区域限定 scenario 改为按访客国家
      从 Shopify Markets 推导；保留其余 4 条原有 scenario，新增联名 CTA 域名 scenario。
- [x] 2.5 `ADDED Coming-next IP cards`：新增后续计划区块的 Requirement（3 条 scenario）。
- [x] 2.6 `proposal.md` + `tasks.md`：Why 里逐条写明漂移证据；Impact 声明不改代码。

## 3. 避免与在案提案冲突

- [x] 3.1 发现 `2026-10-07-add-legal-policies` 原本也 MODIFIED 同一条
      `Homepage renders brand content` —— 两个 open change 改同一条 Requirement 归档会冲突。
      已把该 MODIFIED 整块从 legal-policies 提案移出，归入本提案；legal-policies 只保留
      `## ADDED Requirements`（新能力 + 页脚入口 + 焦点样式）。
- [x] 3.2 两个提案分别校验通过。

## 4. 验收

- [x] 4.1 `pnpm exec openspec change validate 2026-10-07-catch-up-homepage-specs` → valid。
- [x] 4.2 `pnpm exec openspec change validate 2026-10-07-add-legal-policies` → valid。
- [x] 4.3 delta 里每条断言都能在实现或既有测试里找到对应（头图/资讯/后续计划的几何值
      来自 DOM 实测，区域限定的行为来自容器实测）。
- [x] 4.4 未改动任何代码：`git status` 中本提案只新增 `openspec/changes/**` 文件。

## 5. 未做（明确排除）

- [ ] 5.1 不归档（archive）：归档要把 delta 合进 `openspec/specs/brand-site/spec.md`，
      需在代码提交后单独执行 `pnpm exec openspec archive <id>`。
- [ ] 5.2 不改 `heroSlides` / `newsItems` 等数据内容本身 —— 本次只让规格追上实现。
- [ ] 5.3 期间发现的其它既有规格问题（头图 Requirement 内两组重复 scenario 的命名冗余）
      已在本次合并语义，但历史归档文件不动。
