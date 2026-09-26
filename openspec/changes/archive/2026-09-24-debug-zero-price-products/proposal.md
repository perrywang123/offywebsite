## Why

商店后续将上线 Shopify Payments,当前需要先**用 Shopify 上 4 款真实 $0 商品
端到端调试支付链路**(展示 → 加购 → Shopify 托管结算 → 下单),$0 订单无需
真实扣款即可验证全链路。这 4 款(burger-doll / country-getaway / prep-school /
gurardian-angel)已在 Shopify 发布(USD $0、有图),站点现有目录(37 占位款 +
offy_redrush)之外补充即可。

## What Changes

- `products.ts` 新增 4 个 SKU:code 用 handle 大写(BURGER-DOLL 等),挂
  fashion-life 系列,骨架图直接用 Shopify CDN 图(enrich 失败也能显示真图),
  每款挂 `shopifyHandle` + `shopifyVariantId`,本地价 0。
- enrich 价格护栏放宽:`priceCents > 0` → `>= 0`——Shopify 返回 USD $0 属合法
  价格,允许覆盖本地价(非 USD 仍不覆盖,护栏主逻辑不变)。
- 目录规模 38 → 42 款;catalog 测试的"positive price"断言调整为
  non-negative(调试期 $0 SKU 例外)。

## Capabilities

### Modified Capabilities
- `commerce`: 商品目录允许调试期 $0 SKU(须映射 Shopify 真实商品);enrich 对
  USD $0 价格正常覆盖。

## Impact

- `src/lib/catalog/products.ts`(4 款)、`src/server/catalog/enrich.ts`(护栏)
- `src/lib/catalog/index.test.ts`、`src/server/catalog/enrich.test.ts`
