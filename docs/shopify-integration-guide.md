# Offy 当前 Shopify 接入说明

基线：2026-10-31。此文件记录仓库实现，不代替商家后台配置或实时权限/支付资格文档。

## 已采用的模型

Next服务端经Storefront GraphQL读取商品/系列/政策并创建Cart，浏览器跳Shopify checkoutUrl。订单、退款、发货和结账网关由Shopify侧管理。当前不是直连Shopify Payments或Payments App，也不是本站自建收单。

配置：SHOPIFY_STORE_DOMAIN（不带协议的商店域名）、SHOPIFY_STOREFRONT_TOKEN、SHOPIFY_API_VERSION（当前默认2026-07）、SHOPIFY_MARKET_COUNTRY（缺国家时默认市场）。读商品和Cart创建使用X-Shopify-Storefront-Access-Token。不要在没有确认令牌类型时把私有凭据当可公开token。

SHOPIFY_ADMIN_TOKEN虽然在env schema中，当前业务未使用，不是商品读取的必要条件。不要为文档或前台取数扩增Admin权限。

## 数据映射与查询

- site code/slug=product.handle；详情/购物袋靠handle识别，SKU独立。
- Collection映射见server/catalog/live.ts；任意新Collection不会自动增加导航。
- 当前取首variant；多规格选项未实现。
- 标题/描述HTML/图集/市场价格/可售状态/SKU来自Storefront；不再采用本地商业覆盖或fallback。
- 商品/Collection/周边连接每页250条并跟随游标；分页失败不发布部分名册。商品归属最多250个Collection，超过时明确不可用，避免错误归类。
- 四政策取shop字段；联系信息为本地结构化文案。

缓存与country字面量校验见 [架构](architecture.md)。Shopify返回的amount和currency一起使用，本站不自己换汇。结账country与页面同源；语言显式EN，避免使用店铺默认语言。

## 结账与订单

ShopifyPaymentProvider服务端解析变体/可售，Cart带buyerIdentity.countryCode、inContext语言和return_url attribute。Shopify托管结账完成后不会仅因该attribute自动回本站，需要商家侧配置；可选KOL模块已新增`/api/kol/webhook`和独立财务核对账本；真实店铺联调尚未完成。详见 [运行说明](kol-platform-operations.md)。

独立Stripe/PayPal仍是旧路径且限制USD；不要将其与Shopify结账页内商家启用的支付方式混为一谈。真实支付是否可用须商家后台及端到端验收，不能从/api/health配置非空推断。

## 商家维护与排障

商品发布到正确Headless渠道、设置真实价格/图片/库存/市场/Collections。日常改商品在Shopify进行；站内无商品快照维护入口。检查名称/币种异常时依次核对配置是否进容器、市场上下文、Storefront响应和服务端不可用诊断；健康端点只报告非空，不验证权限有效。

本地旧快照已删除。读商品失败时停止输出商业字段与结算，显示 [已确认的重试方案](shopify-unavailable-design.md)。列表、详情及结算均采用首variant的市场价格；不把最低规格价格用于另一个规格的结算。

## 外部参考

官方 [Storefront API](https://shopify.dev/docs/api/storefront) 与 [Cart管理](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)。具体后台入口、令牌流程和网关资格按当时官方文档核实，不保留早期个人账户/试用时长等推断。

KOL启用后Cart还可带服务端签名offy_ref；只有本地checkout记录、Shopify cartToken和实际付款期限一致才认领佣金。Admin token、webhook签名秘密和scope配置见 [手册](kol-platform-operations.md)。优惠规则仍由Shopify维护，本站仅绑定已有或受控追加代码。
