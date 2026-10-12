## Why

手机端(375×812)适配审计出了 56 条问题,产品与设计两轮评审后收敛为 **40 个唯一改动**。
但比"有多少条"更重要的是审计证伪的三个前提,它们直接改变了排期:

1. **线上结算不经过 `/checkout`** —— 购物袋抽屉与 `/cart` 的 Checkout 直接
   `POST /api/payments/checkout`,整页跳到 **Shopify 托管结算页**
   (`src/components/cart/useCheckoutRedirect.ts` + `payments/shopify/provider.ts`)。
   手机端**真正的结算面只有购物袋抽屉**;`/checkout` 及其 `success` 是兜底页,
   落在它们身上的审计条目(96px 留白、卡片内边距)优先级最低。
2. **`/cart` 页在全站没有任何入口**(grep 只命中注释与 `robots.ts` 的 disallow),
   Header 的购物袋按钮只开抽屉。所以 `/cart` 的问题按"共享组件一致性"处理。
3. **站点对外英文单语**(`routing.locales = ["en"]`),审计里以中文文案为依据的量化
   在线上并不存在;英文文案更长 → 问题只会更重。本单全部按 en 计算。

由此,56 条里真正卡住"买得到"的只有 8 条(P0):
PDP 首屏看不到标题/价格/加购(#14)、结算面没有吸底购买条、抽屉关不掉(#32/#33)、
抽屉没有 dvh/安全区/滚动锁(#21/#36/#37)、以及审计**未发现**的两条 ——
售罄商品一路点到结算才被 400 拦下、买完回到站上袋子还是满的(可能重复购买)。

## What Changes

**统一层(一次性覆盖 39/56 条)**:`globals.css` 新增 6 个类
(`.section-y` / `.tap-target(--quiet)` / `.hscroll` / `.safe-b(--t)`)+ 修掉
`.reveal[data-variant]` 的永久位移;`layout.tsx` 补 `viewportFit: "cover"`;
新增 `useScrollLock` 供三个浮层共用;Header 把实测高度写回 `--header-h`;
9 个页面根容器换成 `.container-site` + `.section-y`。

**P0(必须在手机上买得成)**:

- **PDP 吸底购买条**:新增 `StickyBuyBar`,三态(在售/售罄/预告)都有条,
  **必须是 `sticky bottom-0` 而不是 `fixed`** —— `template.tsx` 的
  `animate-page-enter`(`fill-mode: both`)终态保留 `transform: translateY(0)`,
  该包裹层会成为 `fixed` 的 containing block。同时把首屏距离压到位:
  版心/gap/画廊比例一起收,375px 下 h1 顶边 807 → ≈700px。
- **售罄 = 结算死路(P0-3)**:provider 把 400 拆成 `unknown_items` /
  `unavailable_items` 并**逐件指名**;`useCheckoutRedirect` 对 4xx **不跳转**、
  把 `blocked` 交给调用方原地重试;抽屉/购物袋页显示"哪件商品买不了 + 先移除再试"。
  **全站任何位置不再渲染 `invalid_items` / `checkout_failed` 这类原始码。**
- **买完袋子必须清空(P0-4)**:`cartCreate` 带上 `return_url` cart attribute,
  新增 `/checkout/return` 挂 `<ClearCartOnSuccess />`。行为断言:该页挂载后袋子行数 = 0。

**手机端规范收敛**:字号下限统一(11px 绝对下限、页面 H1 36、section H2 下限 30、
所有 `cqw` 字号必须带下限)、点击目标(独立控件 ≥44×44、行内文字链高度 ≥44)、
横滑容器(吸附 + 两端渐隐 + 隐藏滚动条,渐隐只在 <1024px)、安全区、零横向溢出。

**明确不做**(方案 §3):联名 14 形象不拆图;About 封面 48px 不压小;
`.lede` 20px 不降级(只把它从长正文收回 hero 副标题);Marquee 不改成可横滚;
不在列表层过滤售罄商品;不做订单 webhook 落库。

## Capabilities

### ADDED

- **mobile-layout**:<1024px 的统一版心(16px)、纵向节奏(48px)、字号下限
  (11px)、触控命中区(≥44×44 / 行内链高度 ≥44)、安全区与横滑容器规范;
  以及 320/375/390 三档的零横向溢出与"版心左边缘 = 16px"。

### MODIFIED

- **brand-site**:分类 tab 条改为横滑 + 吸附 + 44px 命中区(桌面高度不变)且把当前分类
  滚进视野;首页 hero 的品牌屏/促销屏整屏可点;名册 6 → 4 列并补常显名称;
  内容页版心/节奏/H1 字号统一;页脚与政策页的文字链补 44px 命中区。
- **commerce**:购物袋抽屉(88% 宽 + dvh + 安全区 + 滚动锁 + 44px 控件)、
  结算 4xx 的可执行错误(逐件指名、不跳转)、售罄商品在卡片上的呈现、
  付款完成回站后清空袋子;`cartCreate` 增加 `return_url` attribute。

## Impact

- 新增:`src/hooks/useScrollLock.ts`(+test)、`src/components/product/StickyBuyBar.tsx`(+test)、
  `src/components/product/ProductGallery.tsx`(+test)、`src/app/[locale]/checkout/return/page.tsx`、
  `scripts/audit-mobile.mjs`、`scripts/lib/cdp.mjs`、`src/mobile-rules.test.ts`。
- 修改:`src/app/globals.css`、`src/app/[locale]/layout.tsx`、Header/Footer/Marquee/
  CategoryTabs/newsletter、首页与 home/*、ProductCard/ProductGrid、PDP、
  CartDrawer/useCheckoutRedirect、payments/shopify/{provider,client}.ts、
  `/api/payments/checkout`、`/cart`、`/checkout`、内容页、`messages/{en,zh}.json`。
- **不改**:≥1024px 的任何计算(唯一例外是本单显式声明的两处:`.container-site`
  取代 `max-w-7xl` 带来的版心变化、`ProductCard` 徽章 10px → 11px)。
  逐条实现差异见 `design.md` 的"桌面端保持不变"一节。
- 依赖:无新增运行时依赖(审计脚本零依赖,用 Node 自带 `WebSocket` 直连 CDP)。
