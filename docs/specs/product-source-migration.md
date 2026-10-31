# Shopify 商品数据：唯一事实来源

2026-10-31 已获用户确认并实现。原静态目录和旧商品字段覆盖已退役。

商品目录、三系列成员、merch、详情、首页商品模块、公开API、sitemap与所有结算provider都经过live层。商品code=Shopify handle，SKU独立；列表/详情/结算统一首variant价格。市场金额与currency来自同一country上下文，不自己换汇。

商业fetch使用no-store，页面force-dynamic，仅用React cache在一次渲染内去重；失败不回本地或上次成功值。HTTP/GraphQL/必需字段异常返回不可用；明确null才404；成功空数组才显示真实空态，合法0价仍按Shopify显示。

购物袋仍只存offy.cart.v1的code/quantity；挂载、打开、加购、页面恢复可见、结算准备时重新验证。失败保留记录且隐藏商品字段、小计和结算入口，成功重试后恢复；仅明确404自动删行。

商品快照products.ts、enrich.ts、check:catalog已删除。品牌内容和旧handle跳转配置保留在lib/catalog/brand.ts；系列路由/hero/tagline保留。NEWS卡片只在绑定商品验证后出现，商品图取Shopify。首页局部失败只显示一个恢复面板，独立成功的模块继续可见。

列表/Collections连接每页250并跟随游标；分页失败不发布部分清单。商品归属取最多250个Collection，超过则不可用，避免错误归类；详情图最多10张，首variant，无多规格选择器。

[展示方案](../shopify-unavailable-design.md) / [实现验收](../shopify-authority-validation.md)。多规格、正式中文、webhook/订单回传、PG属于独立后续工作。
