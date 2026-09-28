## Why

用户确认以主 PSD(`is.offy 网站.psd`)解析出的 UI 树为唯一基准重新订正首页头图,
此前参考的 PDF 截图与其他资源可能存在偏差。经全量解析(260 图层)+ 资源拆解
(69 张图)确认头图真实布局与当前实现存在结构性差异:

1. **系列屏(头图-2/3/4)真实布局是「玩偶上半 + 左下标题组」**:标题
   「OFFY⏎系列名」(x=375, y=1407, 头图区 62-100% 浅底区)+ 副标题
   (生活需要仪式感/周末出门玩/日常犯可爱,与 OFFY 行右对齐)+「查看详情」
   按钮(423×110, 系列名行右侧)——当前误用落地页式「顶部居中标题」。
2. **时尚屏(头图-3)是深色全屏背景**,标题/副标题为白色(PSD 文字层实测);
   公主/趣味屏为浅底黑字。
3. PSD 含更高清资源:字标 596×224(头图-1 矢量智能对象)、促销玩偶
   2882×1905、左右箭头 50×23 PNG、查看详情箭头 46×38。
4. 移动端适配需体系化:字号等比缩放并设 clamp 约束,头图文字过长时
   不溢出/不截断。

## What Changes

- 资源迁移至 `public/assets/`:高清字标(ink 色 4x)、导航 LOGO(ink 色)、
  促销玩偶本体(2882×1905 裁本体)、左/右箭头 PNG、CTA 箭头 PNG、
  3 张系列屏标题 PNG + 3 张副标题 PNG(主 PSD 文字层导出)、
  3 张资讯副卡小图(934×558)、4 张按 PSD 坐标重裁的 hero 图(hero-01~04)。
- `heroSlides` 系列屏数据结构改为:`titleImage + subtitleImage + ctaHref`,
  时尚屏标记 `dark: true`(白字)。
- `HeroCarousel` 系列屏改为左下布局:标题 PNG(x11.5%, y62%)+ 副标题
  PNG(OFFY 行右侧)+ 查看详情按钮(系列名行右侧,描边样式+箭头图标);
  屏 2 促销屏元素按 PSD 坐标重排(玩偶 x11% y10% w46% h50%、
  包包 x61.7% y18.2%、文案 x11.5% y62.4%);
  导航箭头换 PSD PNG。
- 移动端适配:hero 文字/图片尺寸改 clamp() 约束(vw 为主+上下限),
  系列屏标题组移动端等比缩小且不溢出,文字过长允许换行。
- Header LOGO 由文字改为 PSD 字标图。

## Capabilities

### Modified Capabilities
- `brand-site`: 首页头图轮播按主 PSD UI 树重排(系列屏左下标题组+副标题+
  查看详情按钮),全站 hero 资源升级为 PSD 原版高清素材,移动端等比适配。

## Impact

- `src/lib/content.ts`、`src/components/home/HeroCarousel.tsx`、
  `src/components/home/HeroCarousel.test.tsx`、`src/components/layout/Header.tsx`、
  `public/assets/{brand,hero,news}/`(新增/替换 ~15 个资源)、
  `messages/{zh,en}.json`(查看详情按钮文案)
