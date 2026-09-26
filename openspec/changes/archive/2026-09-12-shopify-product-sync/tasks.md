## 1. Shopify 商品查询

- [x] 1.1 先写失败测试：按 variantId 取商品字段（成功 / 未找到 / 未配置）
- [x] 1.2 `src/server/shopify/products.ts`：Storefront GraphQL 查询 + 请求级去重缓存

## 2. 富化层

- [x] 2.1 先写失败测试：有映射→Shopify 覆盖；无映射→回退本地；取数失败→回退本地
- [x] 2.2 `src/server/catalog/enrich.ts`：enrichProduct / enrichProducts

## 3. 接入展示页

- [x] 3.1 `next.config.ts` 增加 cdn.shopify.com remotePatterns
- [x] 3.2 详情页 `products/[code]` 服务端富化 + `revalidate`
- [x] 3.3 目录 / 系列 / 首页 列表富化

## 4. 验证

- [x] 4.1 `pnpm test` 全绿、`pnpm typecheck`、`pnpm lint` 干净
- [x] 4.2 `pnpm build` 成功
