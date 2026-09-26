## Why

第二轮设计稿对齐(用户截图反馈):(1)「按类别选购」合并模块在设计稿中还包含
**区域限定组**(3 张带 AVAILABLE IN THE U.S./UK ONLY 徽章的卡)和**产品汇总圆形名册**
(紧接本模块内),实现缺失且名册位置错置;(2)新品预告设计稿为**整幅背景大图 +
左侧文字叠加 + 黑色实心 pill 按钮**,实现为左右分栏;(3)页脚全宽 is.offy 大字标
用户确认去除。

## What Changes

- **区域限定组**:WCOFFY-CPL02/CPL08 标记 `badge: "US"`,WCOFFY-FLS10 标记
  `badge: "UK"`;ProductCard 渲染红底徽章(AVAILABLE IN THE U.S./UK ONLY);
  合并模块在曝光造型 6 卡后新增「区域限定:」3 卡组。
- **产品汇总名册并入**:圆形头像名册从独立模块移入合并模块(区域限定组之后),
  标题改「产品汇总-选购同款造型:」单行小字;预告模块前的旧名册区块删除。
- **预告模块重写**:teaser-hero 横图作为整幅背景(左白特写/右黑包挂),左侧
  文字组叠加(接下来//时尚包挂系列/INS 为准),「查看详情」改黑色实心 pill 按钮。
- **Footer**:删除全宽 SVG 字标区块(保留链接列与版权细条)。

## Capabilities

### Modified Capabilities
- `brand-site`: 首页类别模块含区域限定组与产品汇总名册;预告模块整幅背景布局;
  页脚不再渲染全宽字标。

## Impact

- `src/lib/catalog/products.ts`(3 款 badge)
- `src/components/product/ProductCard.tsx`(徽章渲染)+ 测试
- `src/app/[locale]/page.tsx`(区域限定组/名册并入/预告重写)
- `src/components/layout/Footer.tsx`(删字标)
- `messages/zh.json`、`en.json`(区域限定:/产品汇总-选购同款造型:)
