## Context

老板 2026-10-12 的 6 项删减诉求已经实现进代码（commit `5b833da`，外加一处尚未提交的
NEWS 标题文案改动），但实现前**没有写 OpenSpec change**。于是 `openspec/specs/` 里
有 8 条要求与代码相互矛盾，其中 3 条早在本次改动前就已经漂移。

同一时间，已完成的 `2026-10-11-mobile-adaptation` 还没归档。它的 delta 有 3 条与本
次改动冲突（`docs/specs/boss-6-optimizations-plan.md` §6.1）：

| 冲突 | 位置 | 冲突内容 |
|---|---|---|
| C1 | mobile-adaptation 的 `commerce` delta | 要求同系列商品「每个缩略图配一个可见名称」—— 正是诉求 4 要删的那排 |
| C2 | mobile-adaptation 的 `brand-site` delta | 「reduced-motion 下 promo marquee 换行静态块」—— Marquee 删掉后该场景无落点 |
| C3 | mobile-adaptation 的 `brand-site` delta | Hero 指示条只要求 ≥24px，与同文件「Touch target contract」的 ≥44px 通用条款自相矛盾（实测 ≈43px，过 24 不过 44） |

顺序上必须**先归档 mobile-adaptation**（本 change 已执行），让 `openspec/specs/` 成为
当前基线，再用 MODIFIED delta 收口。若倒在旧 delta 上叠新内容，归档时两边会互相覆盖。

## Goals / Non-Goals

**Goals:**

- 让 `openspec/specs/` 重新成为代码的**如实描述**：8 条矛盾条文全部收口，下一个人按
  spec 验收不会判这次改动违规。
- 把「老板口径」的**理由**留在 spec 里（开关而不是删除、纯色是采样来的、Legal 弱一档
  但不能跌破 AA），避免下一轮有人「顺手恢复」。
- 不动任何 `src/` 文件；不改测试。

**Non-Goals:**

- 不补做已经错过的 TDD 流程（测试与实现都已落地并在 commit 里）。
- 不实现方案 §8 里登记的后续待办（pointer 拖拽、hover/focus 暂停轮播、埋点）。
  这些确实有人在 concurrent 地做（见 Risks 表最后一行），但**不属于本 change**：
  本 change 只把 2026-10-12 已落地的实现写进 spec。
- 不 archive 本 change；不补拍 `docs/design/mobile/*.png` 基线图。
- 不改 `docs/specs/boss-6-optimizations-plan.md`（那是方案，不是 spec）。

## Decisions

### D1：本 change 是「追认 + 收口」，不是「先写 spec 再写码」

代码已在 `5b833da` 落地，重来一遍 TDD 只会让 diff 与历史打架。因此 `tasks.md` 把
`[x]` 留给**已完成的实现**，把 `[ ]` 留给**验证与后续归档**。spec delta 逐条对齐代码
实际行为，而不是对齐方案里的理想描述 —— 凡是代码与方案不一致的地方，以代码为准并在
本文记录（目前未发现此类不一致，见 D5）。

### D2：scenario 级移除只能「保留名字、重写内容」；REMOVED 块不会真正删掉任何东西

`openspec` 没有任何「删掉单个 scenario」的 delta 语法。可选的四条路，逐条排除：

| 方案 | 为什么不可行 |
|---|---|
| REMOVED 写 scenario 名 | REMOVED 的单位是 `### Requirement: <name>`。写 scenario 名进去，归档时只会 warn「not in the current spec; treating it as already removed」然后**什么都不删** —— spec 里的旧 scenario 原地不动，等于没做 |
| MODIFIED 块里直接不写这些 scenario | `change validate` 的 `findMissingCurrentScenarios` 会报 ERROR：MODIFIED 是整块替换，归档拒绝丢掉当前 spec 里还存在的 scenario 名 |
| 删掉并重加整条 requirement（`Hero carousel with landing links` 等） | 要动多条 requirement = 多组 DELETED+ADDED；`ADDED` 与 `REMOVED` 同名会被判冲突，得换名字，等于把十几个 scenario 全部搬家。收益只有「名字好看」，代价是把整块 diff 打散 |
| **保留 scenario 名、重写其内容**（本 change 采用） | 唯一能在「归档不丢 scenario」的前提下改掉内容的写法 |

因此实际采用的办法是：**这 4 条全部通过 MODIFIED 重写内容收口**，而 REMOVED 块只留
`Arrow navigation` 一个名字（方案 §6.2 里唯一被点名 REMOVED 的那条）当作**显式意图记录**。

要处理的 4 个 scenario，以及它们保留名字后的新含义：

- `Arrow navigation` → 断言箭头**不渲染**、切换入口只剩指示条 + 自动轮播 + 触摸滑动
- `Reduced motion` → 断言 reduced-motion 下横向滚动条（`.hscroll`）行为不变
- `Non-linked slides` → 断言**屏 1/2 现在也整屏可点**，落到 `/about` 与 `/products`
- `Footer exposes exactly the five policy links` → 断言页脚只有 3 条入口（校验器逼出来的，见下）

> 也就是说：`brand-site` 的 REMOVED 块**不产生任何主 spec 的删除效果**。这是取舍，
> 不是遗漏 —— 代价写在这里，免得下一个人以为归档漏执行了。

**这条约束是实测出来的，不是推断**：第一版 delta 里，`Footer policy entry points`
有一个 scenario 被我改名成「Footer exposes the three help entry points」，`change validate`
立刻报错并点名 ——

```
✗ [ERROR] brand-site/spec.md: MODIFIED "Footer policy entry points" omits scenario(s) the
  current spec still has: "Footer exposes exactly the five policy links". Copy them into the
  MODIFIED block (a MODIFIED requirement replaces the whole block, so archive refuses to
  drop them).
```

于是它也被改回**原名 + 新内容**（名字里的「five policy links」与内容里的「三条入口」不
一致，是同一个机制逼出来的）。现在 `brand-site` 一共有 4 个 scenario 名与内容不匹配：

| requirement | 保留的旧名 | 新内容 |
|---|---|---|
| `Hero carousel with landing links` | `Arrow navigation` | 箭头不渲染 |
| `Hero carousel with landing links` | `Non-linked slides` | 屏 1/2 现在也整屏可点 |
| `Horizontal scroller pattern` | `Reduced motion` | `.hscroll` 在 reduced-motion 下不变 |
| `Footer policy entry points` | `Footer exposes exactly the five policy links` | 页脚只有 3 条入口 |

独立复核（自写脚本按 `### Requirement:` / `#### Scenario:` 解析主 spec 与 delta）：
`brand-site` 7 个 MODIFIED 块与 `commerce` 1 个 MODIFIED 块的 scenario 缺失集合**全部为空**。

| 保留的 scenario 名 | 它现在的含义 | 为什么不留原文 |
|---|---|---|
| `Arrow navigation` | 断言**箭头不渲染**、切换入口只剩指示条 + 自动轮播 + 触摸滑动 | 原文描述的是已不存在的箭头几何 |
| `Reduced motion` | 断言 reduced-motion 下横向滚动条（`.hscroll`）行为不变 | 原文描述的是已删除的 Marquee |
| `Non-linked slides` | 断言**屏 1/2 现在也整屏可点**，落到 `/about` 与 `/products` | 原文断言「点击无反应」，与代码相反 |

代价：一个名字读起来和内容不匹配。缓解：`proposal.md` 与本节都留了对照表，且
`Arrow navigation` 的内容以「名字保留是归档机制的约束」开头写明。**这是本 change 里
唯一不确定的地方**：如果将来 openspec 支持 scenario 级版本化，这 3 条应该改名。

### D3：`Touch target contract` 的 Hero 指示条门槛从 24px 提到 44px

C3 的根因不是笔误，是两份要求互相矛盾：通用条款说「独立控件 ≥44×44」，但指示条那条
只写了 ≥24px。箭头隐藏后「向下扩会抢箭头命中区」的约束消失，`::after` 从
`calc(100%+2.5rem)` 放到 `calc(100%+2.65rem)`，375px 下命中高度 ≈45.2px，于是**两条
要求可以同时成立**。spec 改成 44px 是「把矛盾消掉」，不是「把门槛提高」。

### D4：删除 Marquee，而不是把它搬到 Header

Header 顶部已经有一条常驻 promo 公告栏，内容同源（`common.promoMessages`）。老板原话
「纯删除，不补回，因为顶部的信息已经展示这部分了」。因此：

- 删组件 / 单测 / keyframes / 首页用法；
- **保留 `common.promoMessages`** —— `Header.tsx` 的 `t.raw` 拿它渲染顶部公告栏，删 key
  会连带把顶部条打坏；
- `Header height and sticky offsets` 这条 requirement **整体保留**，只把「follow the
  promo bar as its copy wraps」的措辞点明是**顶部**公告栏（首页那条已经没了）。

### D5：同系列可达性改挂到「More from this series」，不是删需求

诉求 4 删的是**同系列商品**小图条（每个缩略图带被截断的商品名、点击去别的商品页），
**不是**本商品的自图集切换 —— 后者是 `ProductGallery`，一个独立组件，原样保留。
两者在改动前的代码里本来就是两个东西：横滑条是 `siblings`，自图集是 `images`。

所以 `commerce: Product detail` 里的约束不删，**换承载物**：可达性由页尾
「More from this series」卡片网格承担（`min(siblings.length, 6)` 张卡，每张有
`truncate` 的商品名 + 链接）。语义成立，不是需求缩水。

### D6：页脚「五条政策链接」按实现收口

`brand-site: Footer policy entry points` 要求的是 5 条政策直链，实现早就换成了
「HELP & SUPPORT 面板 = FAQ + CONTACT US + 一条细分隔线 + 弱化的 LEGAL & POLICIES
二级入口」，4 条政策统一收进 `/policies` 二级页。这次按实现收口，同时把老板裁定 2
（Legal 保留更弱一档 + 分隔线保留）写进 spec，因为它是**易被顺手压暗**的点：
`text-cream/50` 在 `#1d1915` 上 ≈5.21:1 过 AA，`/40` 只有 ≈3.8:1 会跌破。

## Risks / Trade-offs

| 风险 | 缓解 |
|---|---|
| D2 的 4 个 scenario 名与内容不匹配，未来读者可能误读 | `proposal.md`、本节对照表；`Arrow navigation` 场景正文首句写明原因 |
| REMOVED 块的 1 个名字在归档时只 warn 不删，看上去像写错了 | 本 change 在 REMOVED 块正文里写明了「这是 scenario 级移除、归档会跳过」，并留了 `tasks.md` 4.7 去核对归档输出 |
| spec 收口后代码若被回滚，spec 又会漂移 | spec 里写死了老板口径的理由（开关常量名、采样色值、AA 对比度），回滚的人会先撞到注释 |
| `docs/specs/boss-6-optimizations-plan.md` §6.2 的 8 条与本次 delta 逐条对应关系只存在于报告里 | 本 change 的 `tasks.md` 第 3 组按 §6.2 的 capability + 条文逐条列了验收项 |
| 三张底纹图的采样值依赖当前 JPEG 素材，设计重新导出后失效 | spec 记的是「实测采样」而不是「设计给的色值」，并指向 `scripts/sample-bg-color.py` 一条命令复核 |
| **并发写者**（另一个会话）在同一时间改 `HeroCarousel.test.tsx`，本轮末 `pnpm test` 因此有 6 个红用例 | 不是本 change 造成的（`HeroCarousel.tsx` 相对 HEAD 无改动）；`tasks.md` 4.4 要求其落地后重跑，并复查 delta 是否仍与实现一致 |
