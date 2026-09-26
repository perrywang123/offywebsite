## 1. 素材迁移(无 spec delta)

- [x] 1.1 复制 56 张素材到 `public/assets/{hero,news,products,landing,teaser,collab}/`,按 SKU 编码命名商品图
- [x] 1.2 sips 压缩:头图→1920w,资讯/预告→1600w,商品图→质量压缩
- [x] 1.3 3 张落地长图(3250×9397)各切 5 段 + 压缩到 1920w(Swift 脚本)

## 2. 数据层重建(TDD)

- [x] 2.1 先改测试:`catalog/index.test.ts` 断言 3 系列、37+1 SKU、编码与价格档位
- [x] 2.2 `types.ts`:SeriesSlug 3 个新值;`Product.badge?: string`
- [x] 2.3 `series.ts`:princess-lady / fashion-life / playful-life
- [x] 2.4 `products.ts`:37 个 WCOFFY-* SKU(CPL/FLS $22、PLS $32,占位名)+ 保留 PCOF1-A4 挂 fashion-life;新增 `teaserSeries`(时尚包挂预告)导出
- [x] 2.5 修 `enrich.test.ts`、`ProductCard.test.tsx` 等硬编码引用

## 3. 品牌与文案

- [x] 3.1 `messages/zh.json`、`en.json`:brand=is.offy、导航、首页文案、促销条(送 offy 包包)、37 个化身
- [x] 3.2 Header logo / Footer 字标换 is.offy™(数据驱动自动生效);CategoryTabs 适配 3 系列

## 4. 首页重排(TDD)

- [x] 4.1 `HeroCarousel` 组件 + 测试:5 头图轮播,点击跳 `/landing/[n]`
- [x] 4.2 `NewsGrid` 组件 + 测试:8 张资讯卡(数据驱动,预留详情页)
- [x] 4.3 `page.tsx` 区块重排:Hero 轮播 → 促销条 → 资讯 → 类别选购(3) → 最新曝光造型 → 新品预告(teaser) → 联名 → 新 IP → 订阅

## 5. 落地页

- [x] 5.1 `/[locale]/landing/[id]/page.tsx`:id 1-3,每屏一张切段图垂直滚动;无效 id 404

## 6. 列表/系列/详情页适配

- [x] 6.1 `/products` 列表页改回本地目录驱动(38 SKU)+ enrich 保留
- [x] 6.2 collections/about 页适配新系列与新素材路径

## 7. 验证

- [x] 7.1 `pnpm test` 全绿(93)、`pnpm typecheck`、`pnpm lint` 干净
- [x] 7.2 `pnpm build` 成功 + 本地部署 3002 端到端(首页轮播/落地页 5 段/38 SKU 列表/价格档位/无效 id 404)
