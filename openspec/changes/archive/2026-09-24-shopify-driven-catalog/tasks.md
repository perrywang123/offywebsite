## 1. TDD(Red)

- [x] 1.1 index.test.ts 重写:19 款、3 系列(12/1/6)、每款 handle+variantId 非空、
  $0 款断言、featured 6 款、badge(cold-kitten/lemon-fizz US)
- [x] 1.2 create-checkout-session/paypal/shopify provider 测试:WCOFFY-CPL01/PCOF1-A4 → handle
- [x] 1.3 enrich.test:PCOF1-A4/fashion-life → offy_redrush/outdoor-sporty;zh 名保留本地

## 2. 数据层重写(Green)

- [x] 2.1 types.ts:SeriesSlug = princess-lady | outdoor-sporty | playful-life
- [x] 2.2 series.ts:3 系列(与 Shopify Collections 对齐)
- [x] 2.3 products.ts:19 条映射款(code=handle、zh 直译、骨架价=Shopify 现价、CDN 图、variantId)
- [x] 2.4 enrich.ts:en 名以 Shopify 为准,zh 名保留本地直译(为 Translate & Adapt 预留)

## 3. 页面适配

- [x] 3.1 首页:featured 6 款/regionals 2 款/roster 19 圆头像自动适配验证
- [x] 3.2 详情页:尺寸 null 隐藏验证 + Shopify 描述展示

## 4. 验证

- [x] 4.1 test(108)/typecheck/lint/build 全绿
- [x] 4.2 部署 3002:列表 19 款 Shopify 数据、中文直译名、详情描述、加购→Shopify 结算
- [x] 4.3 归档
