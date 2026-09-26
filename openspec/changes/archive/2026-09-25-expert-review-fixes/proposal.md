## Why

三位专家(电商产品/UI 设计/Web 测试)全站评审发现 10 个 P0 级问题:支付链路
两处不匹配(前端 `card` vs 后端 `stripe`、success 页 `order_id` vs `session_id`)
+ 订单页 IDOR 安全漏洞 + 购物车僵尸数据 + 详情页描述未渲染 + 移动端无导航 +
抽屉无焦点管理 + ken-burns 类名失效 + 全站零 SEO + Shopify fetch 无超时。
本变更集中修复全部 P0 及 4 个高价值 P1(文案数字/数量 clamp/email 校验/i18n 小项)。

## What Changes

- **支付**:前端 provider `card`→`stripe` 统一;success 页支持 `session_id` 查询
  (复用已有 by-session API);订单确认只认高熵凭证(session_id / PayPal order id),
  拒绝可枚举 orderNumber。
- **购物车**:CartProvider 加载时自动 prune 失效 code;`setQty` 内 clamp 1-99;
  CartDrawer 焦点移入 + Esc 关闭。
- **商品详情**:新增描述区块(Shopify description,空值隐藏)。
- **导航**:新增 MobileNav(汉堡按钮 + 抽屉导航)。
- **动效**:collections hero `ken-burns` → `animate-ken-burns`。
- **SEO**:layout 根 generateMetadata(title/description/OG/hreflang)+ 详情页
  generateMetadata + `sitemap.ts` + `robots.ts`。
- **健壮性**:Shopify fetch 加 `AbortSignal.timeout(3s)`。
- **P1**:文案去数字化(37 化身)、checkout email zod `.email()`、i18n 小项。

## Capabilities

### Modified Capabilities
- `commerce`: 支付 provider 路由一致;订单确认需高熵凭证;购物车自动清理失效行;
  详情页展示 Shopify 描述。
- `brand-site`: 移动端抽屉导航;系列页 hero 动效生效;全站 SEO 元数据。

## Impact

- checkout page/route、success page、CartProvider/CartDrawer、MobileNav(新增)、
  products/[code]、layout、sitemap/robots(新增)、shopify client、messages
