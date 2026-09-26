## Why

用户已在 Shopify 配置好 3 个 Collection 并上架 19 款真实商品(图/描述/USD 价
齐全)。站点按用户确认切换为 **Shopify 真实商品驱动展示**:废弃 37 个占位款号
(WCOFFY-*),商品名/图/价/描述全部以 Shopify 为准;加购→结算下单链路商品信息与
Shopify 订单对齐;系列归属以 Shopify Collections 为准。中文名先直译占位,后续由
用户在 Shopify(Translate & Adapt)正式配置。

## What Changes

- **目录重写**:37 占位款 + PCOF1-A4 全部移除;`products.ts` 改为 **19 条 Shopify
  映射款**,code = handle(swan-princess 等),骨架价 = Shopify 现价快照
  (Stripe/PayPal 备用渠道用),每款挂 `shopifyHandle` + `shopifyVariantId`,
  展示字段仍由 enrich 实时覆盖(架构不变)。
- **系列对齐 Collections**:`SeriesSlug` 改为 `princess-lady`(Lady系列 12 款,含
  按图补入的 royal-grey)/ `outdoor-sporty`(outdoor & sporty 1 款)/
  `playful-life`(趣味生活 6 款,含 gurardian-angel);删除 `fashion-life`。
- **中文名直译**:19 款按角色名直译占位(天鹅公主/黑珍珠/高冷小猫……)。
- **featured/区域限定**:6 款 featured 供首页曝光造型;cold-kitten、lemon-fizz
  标 `badge:"US"`(按设计稿 02/08 号位对应),UK 款因 FLS 素材未上架暂缺。
- **测试同步**:catalog/checkout/paypal/shopify provider/enrich 测试全部改为
  handle 编码与新系列。

## Capabilities

### Modified Capabilities
- `commerce`: 商品目录由占位款号切换为 19 条 Shopify 映射款;系列与 Shopify
  Collections 对齐;下单链路商品信息以 Shopify 为准。

## Impact

- `src/lib/catalog/{types,series,products}.ts`(重写)
- `src/lib/catalog/index.test.ts`、`src/server/catalog/enrich.test.ts`、
  `src/server/checkout/create-checkout-session.test.ts`、
  `src/server/payments/{shopify,paypal}/provider.test.ts`
- 页面零改动(数据驱动自动适配;详情页尺寸区块对 null 隐藏需验证)
