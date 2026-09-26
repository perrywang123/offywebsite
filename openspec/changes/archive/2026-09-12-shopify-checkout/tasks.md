## 1. 环境与配置

- [x] 1.1 `env.ts` 新增 `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_STOREFRONT_TOKEN` / `SHOPIFY_API_VERSION`
- [x] 1.2 新增 `isShopifyConfigured()`
- [x] 1.3 `.env.example` / `.env.production.example` 增加 SHOPIFY_* 占位

## 2. 商品映射

- [x] 2.1 `Product` 类型新增可选 `shopifyVariantId`
- [x] 2.2 把 MOTARO 的 variant id 挂到对应商品（PCOF1-A4）

## 3. Shopify provider

- [x] 3.1 先写失败测试：createCheckout（成功 / 未配置 / 无变体映射）
- [x] 3.2 `shopify/client.ts`：Storefront GraphQL 请求 + cartCreate 封装
- [x] 3.3 `shopify/provider.ts`：实现 PaymentProvider
- [x] 3.4 `registry.ts` 注册 shopify，`ProviderName` 扩展

## 4. 接入 API 与 UI

- [x] 4.1 checkout route 的 provider 枚举加 `shopify`，resolveProvider 支持
- [x] 4.2 结算页增加 Shopify 支付选项 + i18n 文案

## 5. 验证

- [x] 5.1 `pnpm test` 全绿、`pnpm typecheck`、`pnpm lint` 干净
- [x] 5.2 `pnpm build` 成功
