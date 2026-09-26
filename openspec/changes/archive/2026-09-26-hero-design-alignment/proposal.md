## Why

头图轮播与交互稿(offy网站.pdf)未对齐:(1)顺序与可点击性反了——交互稿前 2 屏
(品牌全员图/促销图)不可点击,后 3 屏(系列图)可点击跳对应系列页;(2)头图
文字在图内顶部居中(is.offy™ 大标+slogan;促销屏粗黑大字左下),实现误加左下
大标题+副标题+2 个 CTA 按钮(交互稿无按钮,直接点头图进详情);(3)指示控件
应为底部居中横线条+右下角 ←/→ 深色箭头。

## What Changes

- `heroSlides` 重排并数据化:屏 1 品牌图(顶部居中 is.offy™+slogan,不可点)、
  屏 2 促销图(左下粗黑促销文案,不可点)、屏 3/4/5 系列图(可点击 →
  princess-lady / outdoor-sporty / playful-life)。
- `HeroCarousel`:支持 per-slide 文字叠加(top-center / bottom-left);新增
  prev/next 深色箭头按钮(右下角);指示点改横线条样式。
- 首页 hero 区删除叠加文案层(eyebrow/大标题/CTA 按钮),整屏仅轮播。

## Capabilities

### Modified Capabilities
- `brand-site`: Hero 轮播顺序/可点击性/文字叠加/指示控件与交互稿一致。

## Impact

- `src/lib/content.ts`、`src/components/home/HeroCarousel.tsx`、
  `src/app/[locale]/page.tsx`、`HeroCarousel.test.tsx`
