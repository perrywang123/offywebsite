## Why

设计团队交付了全新网站 UI/交互稿（`resources/网站素材包/`，含 `offy网站.pdf` 全览演示
+ 56 张素材）。品牌从「PLAYCORE 凭空幻想」升级为 **is.offy™**，商品体系从
9 系列 21 SKU(`PCOF1-*`)重构为 **3 大系列 37 个化身**(`WCOFFY-CPL/FLS/PLS-*`,
$22/$32 两档价),并引入头图轮播、头图点击落地页、最新资讯、新品预告等新模块。
现有站点需按这套交互完整重排。

## What Changes

- **数据层重建**:`SeriesSlug` 由 9 个改为 3 个(`princess-lady` / `fashion-life` /
  `playful-life`);`products.ts` 重写为 37 个 `WCOFFY-*` SKU(公主lady 12 款 $22、
  时尚潮流生活 12 款 $22、趣味生活 13 款 $32,名称先用「系列名+编号」占位);
  **保留 offy_redrush(PCOF1-A4)作为第 38 个 SKU 挂入 fashion-life**,保住 Shopify
  支付链路。`Product` 新增可选 `badge` 字段(区域限定徽章,暂不设值)。
- **素材迁移**:56 张素材复制压缩到 `public/assets/{hero,news,products,landing,teaser,collab}/`;
  3 张 3250×9397 落地长图各切 5 段并压缩。
- **品牌与文案**:Header/Footer/字标换 is.offy™;`messages/zh|en.json` 全量更新
  (黑皮 OFFY · 37 个化身、仪式感生活、促销「任意购买三个公仔以上送 offy 包包」)。
- **首页重排**:Hero 轮播(5 头图,点击跳落地页)→ 促销条 → 最新资讯(8 卡) →
  按类别选购(3 大类) → 最新曝光造型 → 新品预告(时尚包挂系列,teaser 素材) →
  联名定制(14 款 OF) → 新 IP 预告(凯蒂小姐/普赛克,已有数据) → 订阅。
- **新增落地页** `/[locale]/landing/[id]`(id 1-3):每屏一张切段图、垂直滚动。
- **列表页数据源**:从 Shopify 驱动改回**本地目录驱动**(37 SKU 仅 1 个已上架
  Shopify),保留 enrich 基建——后续各款在 Shopify 上架后挂 `shopifyHandle` 即可
  逐款切换为 Shopify 拉价。

## Capabilities

### Modified Capabilities
- `brand-site`: 首页模块结构重排;品牌标识升级为 is.offy™;新增 Hero 轮播、
  最新资讯、新品预告、头图落地页模块。
- `commerce`: 商品目录改为 3 系列 37 SKU 新编码新价格;列表页数据源改回本地
  目录(保留 Shopify enrich 逐款富化)。

## Impact

- `src/lib/catalog/`(types/series/products 重写)
- `src/app/[locale]/page.tsx`(首页重排)、`src/app/[locale]/landing/[id]/page.tsx`(新增)、
  `src/app/[locale]/products/page.tsx`(数据源)、`src/app/[locale]/about/page.tsx`
- `src/components/`(新增 HeroCarousel、NewsGrid;Header/Footer/CategoryTabs 适配)
- `messages/zh.json`、`messages/en.json`
- `public/assets/`(新增 hero/news/products/landing/teaser/collab 六个目录 56+ 张图)
- 测试:`catalog/index.test.ts`、`enrich.test.ts`、`ProductCard.test.tsx` 等同步更新
