# 当前 Web 架构

基线：2026-10-31。完整数据流见 [架构](../architecture.md)。

## 页面与共享层

App Router 的根 layout 是 pass-through，`[locale]/layout.tsx` 输出 html/body、metadata、Provider、Header/Footer、CartDrawer 和 SiteJsonLd；template 添加 page-enter 动画。

14 个 page.tsx 覆盖首页、产品列表/详情、系列总览/详情、about、bag-charm、cart、checkout、两种确认落点、FAQ、政策目录/正文。API 与本地支付 return RouteHandler 分开；不要把 URL 语言前缀写死在导航或 canonical 中。

## Server / Client

页面 Server Component 读取 live 目录，再把商品/系列作为 props 传给 UI。CartProvider 客户端通过公开商品 API 获取商品事实。Hero、导航、购物袋、gallery、quick view、Reveal 与表单是客户端交互。

geo.ts 依赖 geoip-lite，只能服务端使用，不能因复用国旗函数把115MB地理库引入浏览器包。ProductCard 当前为服务端展示组件，无客户端 hook。

## 状态与图片

购物袋 localStorage key=offy.cart.v1，内容为 code/quantity；不使用早期提案中的 v2 商品价格快照。页面传的是 handle，不直接信任客户端传 variant/price。

品牌素材本地、商品图 Shopify CDN；图片需 sizes 与容器比例配套。ProductGallery 只切换自己的图，相关商品网格与之独立。quick view 用 Portal，不能把 fixed 遮罩放在页面 transform 祖先中。

## SEO / 构建

独立 metadata/canonical 已覆盖主要页面，JSON-LD 用纯函数构造并转义。Shopify seo 字段尚未读取。构建为 standalone，外部化 geoip-lite 并追踪 .dat，Docker runner 补迁移所需 drizzle-orm。

## 商业数据失败保护

[Shopify 权威数据变更](../../openspec/changes/archive/2026-10-31-shopify-authoritative-catalog/proposal.md) 已获确认并实现。商业读取 no-store、页面 force-dynamic；不可用页 noindex，详情无虚假 Product/Offer。sitemap.xml RouteHandler 能明确返回503。
