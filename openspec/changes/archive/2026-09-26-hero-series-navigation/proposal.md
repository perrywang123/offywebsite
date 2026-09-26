## Why

头图点击跳落地页(/landing/[id])会整屏黑(根因:landing 页 min-h-screen 的 flex
容器内 h-full 子元素无法解析高度,图片容器塌缩为 0)。用户明确新交互:5 张头图中
促销图/品牌图 2 张不可点击,其余 3 张**跳对应系列商品列表**;系列页顶部展示
对应的头图(设计稿截图 3 形式)。landing 页随之废弃删除。

## What Changes

- `heroSlides`:hero-01/02/03 链接改为 `/collections/princess-lady|outdoor-sporty|playful-life`;hero-04/05 保持不可点击。
- `Series` 新增 `heroImage` 字段(3 系列挂 hero-01/02/03.jpg);系列页 hero 图由
  "系列第一款商品图"改为 `series.heroImage`,kicker 加 OFFY 字样。
- 删除 `src/app/[locale]/landing/` 路由与 `content.ts` 的 landingPages/getLandingPage。

## Capabilities

### Modified Capabilities
- `brand-site`: Hero 轮播 3 张可点击头图跳对应系列页;系列页 hero 展示系列专属头图。

### Removed Capabilities
- `brand-site`: 头图点击落地页(/landing/[id])整体移除。

## Impact

- `src/lib/content.ts`、`src/lib/catalog/series.ts`、`src/lib/catalog/types.ts`
- `src/app/[locale]/collections/[series]/page.tsx`
- 删除 `src/app/[locale]/landing/`;`HeroCarousel.test.tsx`、`index.test.ts` 同步
