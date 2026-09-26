## Why

站点已有自建的 Stripe / PayPal 结算，但商家希望复用 Shopify 后台（商品/订单/收单）
并支持 Shopify 托管结算：买家在站内加购后跳转到 Shopify 的 PCI 合规结算页，用商家
配置的收单方式（当前个人 PayPal，未来 Shopify Payments）付款。首个接入商品为
「Offy Sport - MOTARO」（Shopify variant `50827828330785`，$45 USD），链路已用
Storefront API `cartCreate → checkoutUrl` 验证通过。

## What Changes

- 新增 `shopify` 支付 provider，实现现有 `PaymentProvider` 抽象：
  - `createCheckout()`：把购物车行按 `code → shopifyVariantId` 映射，调用 Storefront
    API `cartCreate`，返回 `checkoutUrl` 作为 `redirect: { kind: "redirect" }`。
  - `capture()` / `parseCallback()`：暂不支持（订单落在 Shopify 侧，回传留后续
    webhook 里程碑）。
- `Product` 增加可选字段 `shopifyVariantId`，并挂到对应商品。
- `env` 增加 `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_STOREFRONT_TOKEN` / `SHOPIFY_API_VERSION`
  与 `isShopifyConfigured()`。
- checkout API 的 provider 枚举与结算页 UI 增加 `shopify` 选项。

## Capabilities

### Modified Capabilities
- `commerce`: 新增「Shopify 托管结算」provider（服务端定价/变体映射，重定向到 Shopify）。

## Impact

- `src/lib/env`（新增 SHOPIFY_* 与 isShopifyConfigured）
- `src/lib/catalog`（Product 新增 shopifyVariantId + 商品映射）
- `src/server/payments/shopify`（新增 client + provider）
- `src/server/payments/registry` + `types`（注册 shopify，ProviderName 扩展）
- `src/app/api/payments/checkout`（provider 枚举加 shopify）
- `src/app/[locale]/checkout`（UI 增加 Shopify 选项）+ `messages/*`
- `.env.example` / `.env.production.example`（新增 SHOPIFY_* 占位）
