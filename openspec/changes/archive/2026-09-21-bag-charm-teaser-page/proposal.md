## Why

首页预告模块的「查看详情」按钮当前跳到产品汇总页(不符合设计稿)。设计稿中该
按钮进入一个**时尚包挂系列预告详情页**:超大 FASHIONABLEBAG CHARM COLLECTION
标题 + 左大图右竖图 hero + 6 张预告产品卡(WCOFFY-XXX01~06,每卡「点击查看」)。
素材已在 `public/assets/teaser/`(头图 + 6 张产品图)。

## What Changes

- **新增路由** `/[locale]/bag-charm`:时尚包挂系列预告详情页——hero 区(超大
  英文标题两行 + 左大图(头图左半,object-left)+ 右竖图(头图右半,object-right)),
  标题区(时尚包挂系列/更多都市精灵,敬请期待),6 张预告产品卡网格
  (WCOFFY-XXX01~06 编码 + 「点击查看」→ /products)。
- **数据扩展**:`teaserSeries` 新增 `titleEn` 与 `items`(6 款 code+image),
  替代仅图片的 `previews`。
- **首页**:预告模块「查看详情」按钮 href 由 /products 改为 /bag-charm。

## Capabilities

### Added Capabilities
- `brand-site`: 时尚包挂系列预告详情页。

## Impact

- `src/app/[locale]/bag-charm/page.tsx`(新增)
- `src/lib/catalog/products.ts`(teaserSeries 扩展)
- `src/lib/catalog/index.test.ts`(teaser 断言更新)
- `src/app/[locale]/page.tsx`(按钮 href)
