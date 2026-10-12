# Tasks — 2026-10-12-owner-simplifications

> 本 change 是**追认 + 收口**：第 1、2 组的实现已经落在 commit `5b833da` 里（本 change
> 不再改代码），第 3 组是本次真正要做的事（写 delta + 校验 + 记录），第 4 组是留给
> 后续归档的动作。

## 1. 归档 in-flight change，让 spec 基线变当前

- [x] 1.1 记录归档前基线：`pnpm test` = 46 文件 / 362 测试全绿
- [x] 1.2 `pnpm exec openspec archive 2026-10-11-mobile-adaptation`
      （需要 `--yes`：CLI 在非交互环境读不到 stdin 确认，不是校验失败）
- [x] 1.3 确认合并结果：`brand-site` +6 added / ~2 modified，`commerce` +2 added /
      ~3 modified，变更目录移入 `openspec/changes/archive/`
- [x] 1.4 确认 C1/C2/C3 三条冲突此刻**已经进入** `openspec/specs/`（正是要在本 change
      里收口的东西），而不是被归档脚本丢掉

## 2. 老板 6 项诉求的实现（已完成，记在此处供追溯）

- [x] 2.1 诉求 1｜头图：`SHOW_HERO_DETAILS_CTA` / `SHOW_HERO_ARROWS` 两个开关默认
      `false`；CTA 与箭头**不渲染**（而非加隐藏类）；`renderOverlay` 用同一个开关
      保证「CTA 渲染」与「整屏包链接」互斥
- [x] 2.2 诉求 1｜把 5 屏全部包进整屏链接（`/about`、`/products`、
      `/collections/princess-lady`、`/collections/outdoor-sporty`、
      `/collections/playful-life`），指示条命中区随开关从 ~43px 提到 ≈45.2px
- [x] 2.3 诉求 2｜删除首页滚动促销条 `Marquee`（组件 / 单测 / keyframes / 首页用法），
      `common.promoMessages` 与 Header 顶部公告栏保留
- [x] 2.4 诉求 3｜NEWS 主卡删除 NEW ARRIVALS 徽章，大标题用 `mt` 补偿钉住位置
- [x] 2.5 诉求 4｜PDP 删除同系列商品小图条；本商品自图集 `ProductGallery` 与
      `min-w-0` 保留；换款入口留在页尾「More from this series」
- [x] 2.6 诉求 5｜三处底纹图换实测纯色（news `#efefef`、category / upcoming
      `#f7f7f9`），底色显式声明而非依赖层叠副作用
- [x] 2.7 诉求 6｜页脚 FAQ / CONTACT US 与 MENU / COLLECTIONS 同字号同字重同左边缘；
      `LEGAL & POLICIES` 保留 `text-cream/50` 弱一档 + 上方分隔线
- [x] 2.8 文案｜NEWS 标题去掉 `News·` 前缀，只留 `The Latest from OFFY`
      （`newsKicker` key 保留但不渲染）

## 3. 本 change 的 spec delta（逐条对齐方案 §6.2 的 8 行）

- [x] 3.1 §6.2-1 `brand-site` Homepage renders brand content（section 顺序去掉
      `promo bar`）→ MODIFIED
- [x] 3.2 §6.2-2 `brand-site` Hero carousel with landing links（箭头移除、CTA 由开关
      控制且默认不渲染、全 5 屏整屏包链接、16 个 scenario 名 1:1 保留）→ MODIFIED
- [x] 3.3 §6.2-3 `brand-site` Hero carousel 的三条 scenario（`Slide links to landing` /
      `CTA navigates to landing` / `Non-linked slides`）改为「整屏链接导航」→ 由 3.2 的
      MODIFIED 块承载
- [x] 3.4 §6.2-4 `brand-site` `Arrow navigation` → 写进 REMOVED 块（scenario 级，
      归档只 warn；内容收口在 3.2）
- [x] 3.5 §6.2-5 `brand-site` News module（badge 移除、标题位置由 `mt` 补偿、
      标题去掉 `News·` 前缀）→ MODIFIED
- [x] 3.6 §6.2-6 `brand-site` Teaser section for upcoming series（底图移除，
      「watermark 烤在底图里」这条前提消失）→ MODIFIED
- [x] 3.7 §6.2-7 `brand-site` Footer policy entry points（收口 5 条政策链接的漂移，
      改为 FAQ / CONTACT US / LEGAL & POLICIES 三条 + 同字号 + Legal 弱一档）→ MODIFIED
- [x] 3.8 §6.2-8 `commerce` Product detail（同系列可达性改由「More from this series」
      卡片网格承载，每项有商品名）→ MODIFIED
- [x] 3.9 §6.1-C3 追加收口：`brand-site` Touch target contract 的 Hero 指示条门槛
      24px → 44px（与同文件通用条款对齐）→ MODIFIED
- [x] 3.10 §6.1-C2 追加收口：`brand-site` Horizontal scroller pattern 的
      `Reduced motion` scenario 重写为 `.hscroll` 行为（Marquee 场景无落点）→ 由该
      requirement 的 MODIFIED 块承载

## 4. 校验与后续

- [x] 4.1 确认本次只动 `openspec/`：`git status` 里没有任何由本 change 造成的 `src/` 改动
      （`src/app/[locale]/page.tsx` 的未提交改动是本 change 之前就存在的文案改动；
      `src/components/home/HeroCarousel.test.tsx` 是**另一个并发写者**在 23:59 改的，
      与本次无关，见 4.3）
- [x] 4.2 `pnpm exec openspec change validate 2026-10-12-owner-simplifications` 通过
      （`--strict --changes` 也通过；修掉了 1 条 scenario 改名导致的 ERROR，见 design D2）
- [x] 4.3 `pnpm test` / `pnpm typecheck` / `pnpm lint` 全绿。收尾复跑快照：
      **46 文件 / 369 测试**（比本 change 的基线 362 多 7 个），多出来的全部是并发的另一个
      会话在 23:59–00:00 落地的新用例（pointer 拖拽、滑动吞 click、暂停控件、
      reduced-motion 默认不自动播放）—— 它先写了测试（当时 6 个红），随后补齐
      `HeroCarousel.tsx` 的实现转绿
- [ ] 4.4 **【重要，交接】** 4.3 里那个并发改动引入了本 change **没有覆盖**的新行为：
      暂停/播放控件（原生 button + `aria-label` + `aria-pressed`）、桌面 pointer 拖拽、
      `prefers-reduced-motion: reduce` 下默认不自动播放、以及组件内联的中英暂停文案
      （没有走 i18n 字典）。它需要**自己的一份 change**（方案 §8 已把这些登记为待办；
      其中的暂停控件还触及 `Motion quality bar` 与 `Readability floor` 所在的同一条
      reduced-motion 约定）。本 change 特意**没有**把这些写进 delta，以免替未定稿的实现
      背书；`Hero carousel with landing links` 的 `Arrow navigation` / `Auto-advance`
      两个 scenario 只做「箭头不在 DOM 里」「未暂停时会自动前进」的断言，与那份待写的
      change 不冲突
- [ ] 4.5 人工复核：把本 change 的 8 条 delta 与 `docs/specs/boss-6-optimizations-plan.md`
      §7 的验收断言逐条对照（真实浏览器层的 1b/1c/2/2b/3/5/5b/5c/5d/6/6b 不属本 change）
- [ ] 4.6 归档本 change（`pnpm exec openspec archive 2026-10-12-owner-simplifications --yes`）
      —— **本次不做**，等 4.4 / 4.5 完成
- [ ] 4.7 归档后确认 REMOVED 块的 1 条 warn 已在归档输出里出现且无 error
