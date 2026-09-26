## Why

迁移设计（`docs/specs/product-source-migration.md`）阶段一的**最小切片**：先让**商品列表页**
的成员由 Shopify 实时决定（含上/下架），验证"只维护 Shopify"的核心价值，并可基于此真实
测试支付。购物车/详情路由/完整替换留到支付验证通过后再做。

## What Changes

- 新增 `src/server/shopify/catalog.ts` 的 `listShopifyProducts()`：用 Storefront
  `products` 查询 + 字面量 `@inContext(country: US)` 拉取**已发布/上架**商品的展示字段
  （handle/title/price(USD)/image/available）。Storefront 仅返回已发布到 Headless 渠道且
  Active 的商品，故上/下架天然同步。
- `src/lib/catalog` 新增 `getProductByShopifyHandle(handle)` 反查。
- 商品列表页 `/[locale]/products` 数据源改为 Shopify：对每个 Shopify 商品用 handle 反查本地
  商品（取得 code/系列等），并用 Shopify 展示字段（名/图/USD 价/可售）覆盖后渲染。**加购/
  详情/结算仍复用现有 code 流程**（本次不改购物车模型）。
- 健壮性：Shopify 拉取失败时**回退本地目录**，避免空站。

## Capabilities

### Modified Capabilities
- `commerce`: 商品列表页的成员来源改为 Shopify（近实时 + 上下架同步），展示字段用 Shopify。

## Impact

- `src/server/shopify/catalog`（新增 listShopifyProducts）
- `src/lib/catalog`（getProductByShopifyHandle）
- `src/app/[locale]/products/page`（数据源切换 + 回退）
