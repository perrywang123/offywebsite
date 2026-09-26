## Why

头图按交互稿二轮验收仍有多处不对:(1)图身份映射错误——经原图 OCR+色调分析
确认:促销图是素材 5.jpg(米黄玩偶+包包)而非 2.jpg;公主lady 是素材 2.jpg
(白底人台);趣味生活是素材 3.jpg(深底);(2)屏 1 is.offy 手写体字标与 slogan
字体/文字不对;(3)屏 3/4/5 缺「OFFY + 系列名」顶部居中粗黑大字;(4)屏 4 文字
应按设计稿为「时尚潮流生活」;(5)object-cover 截断玩偶、未居中,需改
object-contain + 图边缘色补底。

## What Changes

- `heroSlides` 重排为:屏1 hero-01(品牌,字标+slogan)、屏2 hero-05(促销,左下
  粗黑文案)、屏3 hero-02(公主lady→princess-lady)、屏4 hero-04(时尚→outdoor-sporty)、
  屏5 hero-03(趣味→playful-life);每屏配 `bg` 边缘色。
- 新增 `public/assets/brand/is-offy-wordmark.png`(从设计稿 PDF 矢量裁出并透明化),
  屏 1 以图片展示手写体字标;slogan 为「让想象落地 让陪伴发生」(空格无逗号)。
- 屏 3/4/5 叠加顶部居中「OFFY + 系列名」粗黑大字(双语);系列页 heroImage 修正为
  hero-02/04/03;outdoor-sporty 显示名改「时尚潮流生活」。
- 头图展示 object-cover → object-contain + 边缘色补底,不再截断。

## Capabilities

### Modified Capabilities
- `brand-site`: Hero 轮播图身份/文字/字标/展示方式与交互稿一致;系列页 hero 图正确。

## Impact

- `src/lib/content.ts`、`src/components/home/HeroCarousel.tsx`、`src/lib/catalog/series.ts`、
  `src/app/[locale]/page.tsx`、`public/assets/brand/`、两个测试文件
