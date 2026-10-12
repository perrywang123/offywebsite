## Why

老板在 2026-10-12 提了 6 项首页 / PDP / 页脚的删减诉求（外加一处 NEWS 标题文案微调）。
实现已经落在代码里（commit `5b833da` + 一处未提交的文案改动），但**这一轮没有走
spec-first**，于是 `openspec/specs/` 至少有 8 条要求与代码直接矛盾 —— 下一个人按
spec 验收会把这次改动判成违规。

矛盾分两类：

- **旧条文被本次改动推翻**：hero 要求 prev/next 箭头、要求「系列屏 MUST NOT 整屏包
  anchor」；首页 section 顺序里还写着 `promo bar`；news 主卡还要求 badge；teaser 还
  要求「底图里烤好的 watermark 不得重渲染」；页脚还要求「五条政策链接」。
- **早已漂移、这次一并收口**：`brand-site` 里「屏 1/2 NOT clickable / 点击无反应」
  早在本次改动前就与代码不符（代码已给 5 屏 `href` 并整屏包链接）；页脚
  「五条政策链接 + 与 MENU 同字号」也与实现（FAQ / CONTACT US + 弱化 Legal 二级入口）
  对不上。

同时，已完成的 `2026-10-11-mobile-adaptation` 尚未归档，它的 delta 有 3 条与本次冲突
（详见 `docs/specs/boss-6-optimizations-plan.md` §6.1）。**先原样归档它**，让
`openspec/specs/` 变成当前基线，再用本 change 的 MODIFIED / REMOVED delta 显式收口 ——
不把新内容叠在旧 delta 上。

本 change 是**追认 + 收口**：只写 spec，不改任何 `src/` 业务代码。

## What Changes

1. **首页头图**：「查看详情」CTA 与左右箭头改为**开关控制且默认不渲染**
   （`SHOW_HERO_DETAILS_CTA` / `SHOW_HERO_ARROWS`）；因为 CTA 不渲染，屏 3-5 不再有内层
   `<a>`，5 屏**统一整屏包链接**（`/about`、`/products`、3 条 `/collections/*`）。
   指示条命中区在箭头隐藏后向上多扩 0.15rem，375px 下实测 ≈45.2px，满足 44px 通用条款。
2. **首页滚动促销条 `Marquee` 整体删除**（诉求原话「纯删除，不补回」）；Header 顶部
   那条 promo 公告栏**保留**，仍然是全站唯一的满赠信息位。
3. **首页 NEWS 主卡删除 NEW ARRIVALS 徽章**，大标题位置用 `mt` 补偿钉住（±2px）。
4. **PDP 删除同系列商品小图条**；**本商品自图集多图切换（`ProductGallery`）保留** ——
   两者本来就是两个组件，删的是前者。同系列可达性由页尾「More from this series」
   卡片网格承载（每张卡片有商品名）。
5. **首页三处底纹图删除**（`news-bg.jpg` / `category-bg.jpg` / `upcoming-bg.jpg`），
   换成实测采样的显式纯色：news `bg-[#efefef]`，category 与 upcoming `bg-[#f7f7f9]`。
   随底图一起消失的是图里烤进去的 `BROWSE CATEGORIES…` / `is.offy` / `STAY / TUNED.`
   淡色幽灵字（对比度 1.10–1.22:1，本就不是可读元素）。
6. **页脚 FAQ / CONTACT US 与 MENU / COLLECTIONS 两列排版统一**（同字号 / 同字重 /
   同左边缘）；`LEGAL & POLICIES` 保留**更浅一档**（`text-cream/50`，对比度 ≈5.21:1，
   仍过 AA）且保留其上方的分隔线。
7. **一处新文案改动**：首页 NEWS 标题去掉 `News·` 前缀，只留 `The Latest from OFFY`
   （`newsKicker` 这个 i18n key 保留，只是不再渲染）。

## Capabilities

### New Capabilities

- 无。本 change 只修改既有能力，不引入新能力。

### Modified Capabilities

- `brand-site`：8 条 delta —— 1 条 ADDED（整屏可点约束）、6 条 MODIFIED
  （Homepage renders brand content / Hero carousel with landing links / News module /
  Teaser section for upcoming series / Footer policy entry points / Touch target
  contract 的 Hero 指示条门槛）、1 条 REMOVED 名字记录（`Arrow navigation`，scenario 级，
  归档时只 warn 不删，理由见 `design.md` 决策 D2）。
- `commerce`：1 条 MODIFIED（Product detail —— 同系列可达性的承载物从「每张缩略图
  一个可见商品名」换成「More from this series 卡片网格，每项有商品名」）。

## Impact

**代码（已实现，本 change 不改动它们）**

- `src/components/home/HeroCarousel.tsx`：两个开关常量、`wrapScreenLink` 统一包屏、
  箭头容器包开关、`INDICATOR_HIT_AREA_CLS` 按开关取值。
- `src/components/home/NewsGrid.tsx`：`badge?: string` 保留但首页不再传，
  主卡标题 `mt` 并入已删徽章的高度。
- `src/app/[locale]/page.tsx`：删 `Marquee` 用法 / import、删 3 处底纹 `<Image>`、
  NEWS 补 `bg-[#efefef]`、hero 补 `border-b border-cream-line`、NEWS 标题渲染 `newsTitle`。
- `src/app/[locale]/products/[code]/page.tsx`：删同系列小图条，保留 `ProductGallery`
  与「More from this series」网格（`min-w-0` 必须保留，否则 375px 横向溢出）。
- `src/components/layout/Footer.tsx`：HELP & SUPPORT 面板与 MENU / COLLECTIONS
  共用同一套链接类；Legal 走 `subLinkCls`（`text-cream/50`）。
- 删除物：`Marquee` 组件与其单测、marquee keyframes、3 张底纹 jpg。

**spec**

- `openspec/specs/brand-site/spec.md`、`openspec/specs/commerce/spec.md`（由本 change
  的 delta 在**后续归档时**合并）。

**测试**

- `HeroCarousel.test.tsx`：CTA 链接数 0、箭头按钮数 0、5 屏整屏链接 href 集合 = 5 条、
  5 个 tab 仍在且点击可切屏。
- `NewsGrid.test.tsx`：`queryByText("New Arrivals")` 为 null，大标题仍在。
- `Footer.test.tsx`：FAQ / CONTACT US 与 MENU 首链同类名，Legal 仍 `text-xs`
  + `text-cream/50` 完整类名断言（避免 `text-cream` 子串恒真）。
- `src/mobile-rules.test.ts`：源码守卫 `scan(/<Marquee/)` 为空、三处底纹图名不出现。

**基线与当前状态（如实记录）**

- 本 change 开始时：`pnpm test` = 46 文件 / 362 测试全绿。
- 收尾时：`pnpm test` = **46 文件 / 369 测试全绿**，`pnpm typecheck` 与 `pnpm lint` 全绿。
  多出来的 7 个用例**不是本 change 写的** —— 是另一个并发会话在 23:59–00:00 往
  `HeroCarousel.test.tsx` / `HeroCarousel.tsx` 落地的（pointer 拖拽、滑动吞 click、
  暂停控件、reduced-motion 默认不自动播放）。它先写测试（当时 6 个红）再补实现转绿。
  本 change 全程只写 `openspec/`，一行 `src/` 都没碰。
- **交接项**：那个并发改动需要**自己的一份 change**（见 `tasks.md` 4.4）。本 change 刻意
  不把「暂停控件 / 拖拽 / reduced-motion 不自动播放」写进 delta，以免替一份未定稿的实现
  背书。

**不改动的东西**

- 不改任何 `src/` 文件；不改 i18n 字典；不改数据库 / 服务端逻辑；不 archive 本 change
  （它还没走完归档动作，归档是后续步骤）。
