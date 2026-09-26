## Why

用户指出头图仍有多处与设计稿不符,要求安装 design-to-psd skill 并直接解析
`is.offy 网站.psd` 源文件做视觉还原。经 ag-psd 解析(画布 3250×17717,228 图层)
获得头图区域精确规格:(1)促销屏是**合成屏**(PSD「头图-活动奖励」组:白底+
左玩偶图+右 2×2 包包图+左下两行促销文案 size=40.6),此前误用整图 hero-05;
(2)指示条为 **4 条**(PSD 组8),轮播实为 4 屏而非 5 屏;(3)顶部 promo 条文案
应为「美国地区境内订单满90美元免运费,满120美元送包包。」。

## What Changes

- 从 PSD 导出促销屏 5 个图层素材(doll.png 2882×1905 + bag-1~4.png 657×657)
  至 `public/assets/hero/promo/`。
- `heroSlides` 改为 4 屏:品牌图(字标+slogan)/ 促销合成屏 / 公主lady / 时尚
  潮流生活;趣味生活图(hero-03)退出轮播(保留系列页)。
- `HeroCarousel` 新增 promo 合成屏渲染(白底+左玩偶+右 2×2 包包+左下两行文案)。
- 顶部 promo 条文案改为 PSD 精确文案(双语)。

## Capabilities

### Modified Capabilities
- `brand-site`: Hero 轮播按 PSD 源文件精确还原(4 屏/促销合成屏/指示条)。

## Impact

- `src/lib/content.ts`、`src/components/home/HeroCarousel.tsx`、`messages/{zh,en}.json`、
  `public/assets/hero/promo/`(新增 5 素材)、`HeroCarousel.test.tsx`
