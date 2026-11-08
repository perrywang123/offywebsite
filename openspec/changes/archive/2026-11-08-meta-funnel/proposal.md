# Why

Shopify 已绑定 Meta，但 Next.js 独立站没有 Meta 浏览/商品/加购事件。跨域购买是否进入官方 CAPI 未实测，不能将资产绑定当成归因成功。

# What Changes

- 第一步：同一 Pixel 的许可控制浏览/商品/加购/开始结账；UTM、广告点击与匿名访问关联；后台只读诊断。
- 第二步：加购和开始结账持久队列，通过独立低资源 worker 发 CAPI，使用与浏览器相同 event_id，限时、限批、租约及有限重试。
- 不额外发送 Purchase，不改变支付、Markets、折扣或 Collabs 计佣。购买官方交接保留为真实环境验收项。
- 追踪默认关闭，运行时注入；所有追踪失败不得阻断交易。补部署配置、操作 SOP 和隔离浏览器验收。

# Capabilities

## New Capabilities

- `meta-funnel`: consent-aware Meta funnel and operational evidence.

# Impact

`src/components/marketing/`、购物袋/商品页/结账可选观察器、`src/server/meta/`、新增 SQLite 迁移、管理后台广告诊断、Compose 可选 worker、文档。保留原有线上端口及独立发布，不执行生产发布或付款。
