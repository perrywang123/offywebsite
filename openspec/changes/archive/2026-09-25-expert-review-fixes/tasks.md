## 1. 支付三修(TDD)

- [x] 1.1 checkout 前端 provider "card"→"stripe" + route 测试(4 例)
- [x] 1.2 success 页支持 session_id(getOrderForConfirmation)+ 测试(3 例)
- [x] 1.3 订单确认仅认高熵凭证,拒绝可枚举 orderNumber;paypal-return 改带 paypal_order_id

## 2. 购物车两修(TDD)

- [x] 2.1 CartProvider 自动 prune 失效 code + 测试(pruneLines 2 例)
- [x] 2.2 setQty/addLine clamp 1-99 + 测试(2 例)
- [x] 2.3 CartDrawer 焦点移入 + Esc 关闭 + aria-label + 测试(3 例)

## 3. 详情/导航/动效

- [x] 3.1 详情页描述区块(zh 空回退 en)
- [x] 3.2 MobileNav 汉堡抽屉导航 + 测试(5 例)
- [x] 3.3 collections hero ken-burns → animate-ken-burns

## 4. SEO 与健壮性

- [x] 4.1 layout 根 generateMetadata(title/desc/OG/hreflang)+ 详情页 generateMetadata
- [x] 4.2 sitemap.ts(双 locale 全路由)+ robots.ts
- [x] 4.3 Shopify fetch AbortSignal.timeout(3s)(products/catalog 两处)

## 5. P1 顺修与验证

- [x] 5.1 文案去数字化(castSub/catalog.subtitle)、checkout email .email()、结算空态 i18n、success 页 i18n 小项
- [x] 5.2 test(127)/typecheck/lint/build 全绿 + 部署 3002 端到端 + 归档
