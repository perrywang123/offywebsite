# Offy Meta 站内漏斗与 CAPI 技术方案

2026-11-08。授权范围：先规划，再以 SDD/spec-first + TDD 实现两步，并进行隔离页面验收及 SOP 交付。本方案不等同生产已启用。

## 第一步：Pixel、来源与结账诊断

继续使用同一数据集 1120625754196383，由运行时 META_PIXEL_ID 配置，默认关闭。新增 MetaTracking 客户端模块，加载公开配置；复用 Shopify Customer Privacy，不依赖 Collabs 模式。只有 analyticsProcessingAllowed、marketingAllowed、saleOfDataAllowed 均明确允许且无 GPC 时加载 Pixel。许可变更时重新判定；不回放许可之前的加购，不在后台、支付回跳或 API 页面发送事件。

PageView 在初次加载及客户端路径变更后发送；ViewContent 在实时商品详情成功展示后发送；AddToCart 在本地购物袋成功增加后发送，数量为实际增量；InitiateCheckout 在原有服务器成功返回受校验 Shopify 跳转链接后、离站之前发送，故统计“结账准备成功”，不包含被库存/网络检查阻止的点击。当前无搜索功能，不虚构 Search。

使用统一浏览器 event_id，许可下的随机访问 ID，白名单 UTM/广告 ID；有真实 fbclid 时保留时间/匹配信息，复用合法 _fbp/_fbc，不伪造广告点击。来源仅保留允许字符及有限长度，页面仅记录 pathname，清除邮箱、完整 URL 查询、支付资料。商品值来自原目录；不在数据失败时恢复旧价。目录 ID 使用可选、逐商品审核的 JSON 映射（商品 code → Meta 目录实际 retailer ID），未配置则不发 content_ids 并在诊断标明；不猜 shopify_US 等模板。

服务器 /api/meta/events 同源校验、请求大小与速率限制、严格事件白名单；记录本地观察，浏览器 Pixel 调用只表示“尝试发送”，不冒认平台接收。结账成功响应可附加仅在有效营销许可下的匿名追踪关联，记录已有 attemptId 与 Shopify cart ID（从服务端 observer 读取）；不修改 cartCreate 参数、国家、折扣、价格或 checkoutUrl，不向 Shopify 塞未获官方支持的 Meta 参数。

## 第二步：关键事件 CAPI

仅 AddToCart、InitiateCheckout 进入 SQLite 持久 outbox。payload 包含 event_name、原始 event_time、event_id、action_source=website、清理后的 event_source_url、fbp/fbc、散列匿名 external_id、UA 及商品数据。没有真实依据不填 email、电话/IP；令牌仅存服务端运行时，不进入日志/构建/浏览器。匹配 payload 复用现有 AES-GCM 诊断密钥，管理 API 不解密返回。

独立 meta-worker 使用现有 app 镜像和内部 worker 认证，调用 /api/meta/worker。最多 5 条/轮，单请求 5 秒，独占租约 60 秒；网络/429/5xx 有限指数退避，永久错误终止，过期事件停止；保留 30 天并清理。worker 可使用 META_WORKER_SECRET，现有 KOL 环境可复用服务器私密 KOL_WORKER_SECRET；不调用 Shopify Admin、不依赖 KOL 开关。无 CAPI 令牌时只显示未配置，不阻断站点启动。

Pixel 与 CAPI 关键事件共用同一 event_id；同一事件的重试不换 ID、不改时间。此版本绝不自发 Purchase，以免与 Shopify 官方 Pixel/CAPI 重复计数。新增 /admin/meta 只读显示配置是否齐备、事件、来源、金额币种、目录映射、结账编号和本地送达状态；不展示 fbc/fbp/访问 ID/令牌，不计算广告应归因收入或 Collabs 佣金。

## 配置、发布与回退

META_TRACKING_ENABLED、META_CAPI_ENABLED 默认 false。Pixel ID 是公开标识；CAPI_ACCESS_TOKEN、META_WORKER_SECRET 只在私密服务器环境注入。META_GRAPH_API_VERSION 显式配置受支持版本，示例 v26.0（已核对官方 SDK 当前版本），发布前核对 Meta 控制台；META_CAPI_TEST_EVENT_CODE 仅用于明确测试，不用于正常投放。META_CATALOG_IDS 为可选 JSON 映射。新配置缺失只关闭对应能力并在诊断说明。

已有独立端口、Git 部署及数据卷保持；可先独立更新主站，再独立更新后台，最后用 --profile meta 启动无需编译的 worker。本轮不操作线上部署，不重置令牌、不投放/发布广告、不下真实订单。回退时关闭两个开关、停止 meta-worker，原有购买流程继续运行。

## 验收及边界

先用失败测试锁定许可、重复事件、币种、过滤、加密、租约/重试和交易失败隔离，再实现。浏览器使用独立临时 DB/模拟 Shopify/模拟 Pixel+CAPI，不向真实 Meta 发送伪购买；验证用户浏览 → 商品 → 加购 → 模拟托管结账及后台证据，拒绝许可和关闭追踪时不发。

真实平台另需 Meta Test Events 确认接收、目录匹配及去重；官方 Shopify Purchase 的跨域匹配必须用经授权的真实/测试店订单核验。CAPI 返回 events_received 不等于 Ads Manager 归因成功；资产关联、普通浏览测试与广告归因订单是三个不同验收层级。若官方购买衔接不成立，另拟单一 Purchase 发送方案并经用户确认，不擅自改支付或关闭官方集成。

## 依据

- [Shopify Analytics / destination](https://shopify.dev/docs/storefronts/hydrogen/analytics)
- [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy)
- [Shopify Meta data sharing](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-data-sharing)
- [Meta matching identifiers](https://github.com/meta/facebook-nodejs-business-sdk/blob/main/src/objects/serverside/user-data.js)
- [Meta event ID](https://github.com/meta/facebook-nodejs-business-sdk/blob/main/src/objects/serverside/server-event.js)
