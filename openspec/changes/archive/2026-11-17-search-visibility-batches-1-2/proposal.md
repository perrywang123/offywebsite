# Why

搜索结果仍有旧脚手架图标缓存，首页摘要缺少品类意图；商品未读取 Shopify SEO 字段，部分页面继承首页 OG/hreflang。用户已确认搜索文案，2026-11-17 改选本人提供的黑白 OFFY Logo，要求完成第一批并继续第二批。

# What Changes

- 采用用户提供的方形黑白 Logo 生成 96px favicon，保留站内 Header Logo。
- 应用已确认的首页/主要页面标题摘要，统一每页 canonical、OG 和真实语言地址。
- 查询 Shopify 商品与系列 SEO；空值仍采用当前 Shopify 内容，不引入商品事实快照。
- 现有 /products 承接可购买 plush bag charm 搜索意图；/bag-charm 仍为新品预告。
- 补充结构化数据实体关联和站点名称别名，排除页脚版权/菜单作为搜索摘要的候选。
- 独立核对 www TLS/跳转、Search Console 和 Merchant Center。需要新账户授权、销售规则调整的操作单独确认；不能把未完成配置记为完成。

# Capabilities

## New Capabilities

- `search-visibility`: 品牌搜索图标、页面搜索语义、Shopify SEO 透传与真实实体关联。

# Impact

涉及 src/app/icon.tsx、公开页面 metadata、src/lib/seo、只读 Shopify 查询及 DAL、商品列表标题和页脚非可见 SEO 属性。不修改价格、库存、variant、市场判定、购物袋、结账或广告上报。生产只发布预构建 storefront，保留 admin/worker。基础设施修改必须先备份、验证再 reload；Google 审核/重新抓取是外部待办。
