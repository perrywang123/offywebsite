## Why

商品目前来自本地静态目录（`src/lib/catalog`），与 Shopify 后台脱节：Shopify 上更新了
商品名/图片/描述/价格，网站不会变（用户看到的仍是旧商品名）。需要让网站在展示层
按需从 Shopify Storefront API 实时（近实时）拉取图片、描述、价格、标题，覆盖本地占位值。

## What Changes

采用**字段级混合**策略，避免破坏双语、系列、情绪标签、尺寸等本地结构：

- 本地 `catalog` 保留“骨架”：双语名、系列、情绪标签、尺寸、以及 `code → shopifyVariantId` 映射。
- 新增 Shopify 商品查询：按 `shopifyVariantId` 从 Storefront API 取 `title / description /
  images / price`。
- 新增服务端 **enrich（富化）层**：当某商品配置了 `shopifyVariantId` 时，用 Shopify 数据
  覆盖展示用的图片/描述/价格/名称；未配置或取数失败则回退本地值。
- 展示页（首页 / 目录 / 系列 / 详情）改为服务端 `await` 富化后再渲染，并设 `revalidate`
  实现近实时（默认 60s；后续可用 Shopify webhook 触发失效）。
- `next.config` 增加 Shopify CDN 图片 `remotePatterns`（`cdn.shopify.com`）。

不改动：结算价格权威仍由 Shopify `cartCreate`（Shopify 路径）/ 本地目录（Stripe/PayPal 路径）
决定；购物车 client 展示的实时化留后续。

## Capabilities

### Modified Capabilities
- `commerce`: 商品目录支持从 Shopify 近实时富化展示字段（图片/描述/价格/标题）。

## Impact

- `next.config.ts`（图片 remotePatterns）
- `src/server/shopify/products.ts`（新增：Storefront 商品查询 + 请求级缓存）
- `src/server/catalog/enrich.ts`（新增：富化层，回退本地）
- `src/app/[locale]/page.tsx` / `products/page.tsx` / `collections/[series]/page.tsx` /
  `products/[code]/page.tsx`（服务端富化 + revalidate）
