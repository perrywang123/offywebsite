## 1. TDD

- [ ] 1.1 HeroCarousel 测试:slides 1-3 链接到 3 个系列页,4/5 无 href 不可点击
- [ ] 1.2 index.test.ts:seriesList 每条含 heroImage(/assets/hero/hero-0N.jpg)

## 2. 实现

- [ ] 2.1 types/series:Series.heroImage 字段 + 3 系列配图
- [ ] 2.2 content.ts:heroSlides 1-3 → 系列页;删 landingPages/getLandingPage
- [ ] 2.3 collections/[series] 页 hero 用 series.heroImage,kicker 加 OFFY 字样

## 3. 删除

- [ ] 3.1 删除 src/app/[locale]/landing/ 目录

## 4. 验收

- [ ] 4.1 test/typecheck/lint/build 全绿 + 部署 3002
- [ ] 4.2 端到端:轮播 3 链接、系列页头图、/zh/landing/1 → 404、归档
