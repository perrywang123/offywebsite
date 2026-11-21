# Offy 当前 Shopify 接入说明

基线：2026-10-31。此文件记录仓库实现，不代替商家后台配置或实时权限/支付资格文档。

## 已采用的模型

Next服务端经Storefront GraphQL读取商品/系列/政策并创建Cart，浏览器跳Shopify checkoutUrl。订单、退款、发货和结账网关由Shopify侧管理。当前不是直连Shopify Payments或Payments App，也不是本站自建收单。

配置：SHOPIFY_STORE_DOMAIN（不带协议的商店域名）、SHOPIFY_STOREFRONT_TOKEN、SHOPIFY_API_VERSION（当前默认2026-07）、SHOPIFY_MARKET_COUNTRY（缺国家时默认市场）。读商品和Cart创建使用X-Shopify-Storefront-Access-Token。不要在没有确认令牌类型时把私有凭据当可公开token。

后台支持可选的 `SHOPIFY_ADMIN_CLIENT_ID` / `SHOPIFY_ADMIN_CLIENT_SECRET` 自动获取和续取 Admin token；也兼容手动 `SHOPIFY_ADMIN_TOKEN`。它们不是商品读取、购物车或后台登录的必要条件，三项全空时暂停远程同步，本地合作记录与结账诊断仍可使用。新应用凭据只进入 admin 运行环境，不传给主站；不要复用 Headless/Storefront 令牌或扩大前台权限。见 [配置说明](kol-platform-operations.md#admin-令牌自动续取与手动兼容)。

## 数据映射与查询

- site code/slug=product.handle；详情/购物袋靠handle识别，SKU独立。
- Collection映射见server/catalog/live.ts；任意新Collection不会自动增加导航。
- 当前取首variant；多规格选项未实现。
- 标题/描述HTML/图集/市场价格/可售状态/SKU来自Storefront；不再采用本地商业覆盖或fallback。
- 商品/Collection/周边连接每页250条并跟随游标；分页失败不发布部分名册。商品归属最多250个Collection，超过时明确不可用，避免错误归类。
- 四政策取shop字段；联系信息为本地结构化文案。

缓存与country字面量校验见 [架构](architecture.md)。Shopify返回的amount和currency一起使用，本站不自己换汇。结账country与页面同源；语言显式EN，避免使用店铺默认语言。

## 商品详情图与赠礼

- 商品介绍取 Shopify 商品描述的第一段。其余内容在 **Full description** 中展开。服装与眼镜的两项提示只在原描述明确提供相应事实时展示。
- 在 **Settings → Custom data → Products** 配置三个英文商品字段。**Detail Photos** 的键为 `custom.detail_photos`，类型为图片文件引用列表。**Size Guide** 和 **Materials Guide** 的键为 `custom.size_guide`、`custom.materials_guide`，类型为单张图片文件引用。开启 Storefront API 访问权限，然后在商品的 **Metafields** 中关联图片。对于已识别的原图库图片，只在该商品仍引用原图时按相应用途展示。
- **Gifts with purchase** 默认展开。在 **Discounts** 中维护赠礼规则、数量、商品范围和生效时间。Offy 核验当前可用的自动买赠，按购买门槛排序。每档赠礼链接可用赠品的商品页，顾客可将参与商品和对应赠品一起加入购物袋。实际优惠及叠加由 Shopify 结账计算。 [Shopify 自动买赠说明](https://help.shopify.com/en/manual/discounts/discount-types/buy-x-get-y)
- 在 **Content → Metaobjects** 中可建立 **Gift Tier**（`gift_tier`）。字段为 **Gift Name**（`gift_name`，单行文本）、**Gift Image**（`gift_image`，图片文件）、**Discount ID**（`discount_id`，单行文本，形如 `gid://shopify/DiscountAutomaticNode/123`）。再建立 **Gift Campaign**（`gift_campaign`），字段为 **Heading**（`heading`，单行文本）、**Terms**（`terms`，多行文本）、**Gift Tiers**（`gift_tiers`，引用 Gift Tier 的列表）。两个定义开启 Storefront API 读取权限。活动条目 Handle 使用 `offy-storefront-gifts` 并设为 **Active**。Offy 读取最多六档。 [Shopify Metaobjects 设置](https://help.shopify.com/en/manual/custom-data/metaobjects/building-a-metaobject)
- 如果店铺尚未创建活动条目，Offy 读取已绑定的三条现有 Shopify 折扣。若只想隐藏展示，可保留 **Active** 活动条目并清空 **Gift Tiers**。若要结束结账优惠，在 **Discounts** 停用相应规则。
- 赠礼规则读取使用 **Offy Admin** 应用的 `read_discounts` 与 `read_products`。后台服务核验购买范围和赠品，主站用顾客选择的市场核对赠品的可售状态。权限、赠品、适用范围或市场的验证失败时，页面省略受影响的赠礼。 [Shopify Admin 折扣 API](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/DiscountAutomaticBxgy)

## 商品买家秀

1. 在 Shopify 的 **Content → Files** 上传已获授权的照片。添加能准确描述画面的英文替代文字。
2. 在对应商品的 **Metafields → Buyer Photos** 添加图片，按展示顺序排列后保存。该字段是 `custom.buyer_photos`，类型为图片文件引用列表，开启 Storefront API 读取权限。 [Shopify 元字段引用](https://shopify.dev/docs/api/storefront/2026-07/objects/Metafield#field-Metafield.fields.references)
3. 打开该商品的独立站详情页。「OFFY in the wild」最多显示前三张缩略图，箭头进入完整相册。移除商品中的图片引用即可撤下；清空列表会隐藏整个模块。图片字段读取失败也会省略该区域，商品数据仍由各自的 Shopify 查询提供。

## 结账与订单

ShopifyPaymentProvider服务端解析变体/可售，Cart带buyerIdentity.countryCode、inContext语言和return_url attribute。Shopify托管结账完成后不会仅因该attribute自动回本站，需要商家侧配置；可选KOL模块已新增`/api/kol/webhook`和独立财务核对账本；真实店铺联调尚未完成。详见 [运行说明](kol-platform-operations.md)。

独立Stripe/PayPal仍是旧路径且限制USD；不要将其与Shopify结账页内商家启用的支付方式混为一谈。真实支付是否可用须商家后台及端到端验收，不能从/api/health配置非空推断。

## 商家维护与排障

商品发布到正确Headless渠道、设置真实价格/图片/库存/市场/Collections。日常改商品在Shopify进行；站内无商品快照维护入口。检查名称/币种异常时依次核对配置是否进容器、市场上下文、Storefront响应和服务端不可用诊断；健康端点只报告非空，不验证权限有效。

本地旧快照已删除。读商品失败时停止输出商业字段与结算，显示 [已确认的重试方案](shopify-unavailable-design.md)。列表、详情及结算均采用首variant的市场价格；不把最低规格价格用于另一个规格的结算。

## 外部参考

官方 [Storefront API](https://shopify.dev/docs/api/storefront) 与 [Cart管理](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)。具体后台入口、令牌流程和网关资格按当时官方文档核实，不保留早期个人账户/试用时长等推断。

KOL启用后Cart还可带服务端签名offy_ref；只有本地checkout记录、Shopify cartToken和实际付款期限一致才认领佣金。Admin token、webhook签名秘密和scope配置见 [手册](kol-platform-operations.md)。优惠规则仍由Shopify维护，本站仅绑定已有或受控追加代码。
