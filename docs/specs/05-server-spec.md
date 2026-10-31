# 当前服务端实现

基线：2026-10-31。API 完整表见 [架构](../architecture.md)。

## Shopify 读取

server/shopify/catalog.ts 包含列表、Collections、Collection 成员与周边扫描；products.ts 按 handle 取描述、多图、首 variant、库存和 Collection。country/language 按现有 GraphQL 字面量方式传入并校验。商品/系列5s超时、no-store；ck隔离查询参数，React cache仅在一次服务端渲染内去重。政策仍为300s缓存、5s超时。

live.ts仅映射Shopify商业事实，enrich和静态商品快照已删除。storefront.ts统一校验HTTP/GraphQL/必需字段与金额；连接跟随分页游标。regional只在所有范围探测成功时推断；没有webhook缓存失效。

## 支付

registry 提供 shopify/stripe/paypal，API缺省是Stripe而UI显式shopify。每条provider重新解析商品，客户端只提交code/quantity；Shopify校验失败一律503且不创建支付会话。Shopify建Cart并返回checkoutUrl，不落legacy订单表；启用KOL时保存签名checkout意图及cart关联，后续通过独立收件箱/主动核对写kol_shop_orders；Stripe创建会话并快照，webhook验签后paid落单；PayPal先create、后approved/amount校验、capture并落单。

Stripe/PayPal限制USD。数据库已经有currency列，不要重复源码旧注释“没有currency列”的错误理由；要扩多币种仍需独立需求、网关和金额语义验证。

## DAL / 订阅

四张保留表＋16张kol_*表，迁移0000–0006。同步better-sqlite3/Drizzle使用run/get/all，PG分支抛错。订阅仅做邮箱trim/lowercase、格式校验和唯一入库，没有邮件发送服务。

## 已知未完成

KOL已实现管理员、登录限流、Origin/CSRF、Shopify最小收件箱与账本/结算事务，默认关闭。全站统一限流/监控、legacy完整订单事务/并发订单号、PayPal webhook兜底和PG仍未实现。商品严格失败保护见 [已实现变更](../../openspec/changes/archive/2026-10-31-shopify-authoritative-catalog/design.md)。

KOL模块、独立入口、双方式优惠码、精确财务/结算快照、worker及运行门槛见 [运行手册](../kol-platform-operations.md)。没有自动转账、任意金额补单或优惠规则编辑。
