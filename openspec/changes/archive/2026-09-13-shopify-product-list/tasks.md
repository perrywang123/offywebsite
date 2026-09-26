## 1. Shopify 商品列表读取

- [x] 1.1 先写失败测试：listShopifyProducts 映射（多商品 / 缺图 / 非OK回退 / USD 价）
- [x] 1.2 `src/server/shopify/catalog.ts`：listShopifyProducts（products + 字面量 @inContext(US)）

## 2. 本地反查

- [x] 2.1 `catalog/index.ts` 新增 getProductByShopifyHandle(handle)

## 3. 列表页数据源切换

- [x] 3.1 `products/page.tsx`：用 Shopify 列表 + 本地映射合并渲染；Shopify 失败回退本地

## 4. 验证

- [x] 4.1 `pnpm test` 全绿、`pnpm typecheck`、`pnpm lint` 干净
- [x] 4.2 `pnpm build` 成功 + 端到端：列表显示 Shopify 上架商品（offy_redrush）
