# Why

Collabs 模式的 `/r/<alias>` 当前只跳转，没有持久化短链打开次数；管理后台也没有对应统计入口。官方佣金/付款核对依赖 CSV，管理员希望减少手动导入。

# What Changes

本方案待用户确认，尚未实现或部署。

- 在「Collabs 核对」增加「短链访问」与「自动转化记录」，现有「报告与账单核对」继续承载官方快照、佣金及付款核对。
- 为每条启用短链统计按日打开请求数、累计打开次数、最近打开时间及采集起点。明确重复打开计次、机器人/预取排除、不是去重人数，也不是 Collabs Visits。
- 使用官方 Shopify Flow 的 Collabs `Order Attributed` 事件接收新转化，读取 Shopify 订单事实补充付款/退款状态；不根据本地打开次数重新决定归因或佣金。
- 自动事件只保存实际可用字段。先检查 Flow 的实际变量契约，再决定是否可同步官方佣金金额；没有金额字段时显示未提供。历史、完整官方账单及最终出款继续导入核对。

# Capabilities

## New Capabilities

- `collabs-observation`: 来源明确的短链打开统计、官方归属事件接收与订单事实核对。

# Impact

- 需追加 SQLite 表、管理员只读接口和现有工作台展示，并在主站短链响应后安排统计；需要分别发布后台及独立站。
- 需要安装 Shopify 官方 Flow、确认实际安装权限，并新增一个只传送所需归属信息的工作流；不自动审批KOL、不发邮件、不修改优惠、计佣和付款。
- 2026-11-08只读检查：店铺为 Advanced，满足 Flow Send HTTP request 的套餐要求；Flow 尚未安装。没有更改套餐或点击安装。
- 用户此前要求核心链路修改先确认；短链响应路径及 Shopify 工作流配置须取得本次范围确认后实施。

# Evidence

- [Shopify 员工对公共 Collabs API 与 Flow 替代方案的答复](https://community.shopify.dev/t/best-way-to-extract-data-from-a-shopify-app-installed-on-our-store/35861)：2026-07-08明确表示无公共 Collabs API，Flow可传出事件，订单API不能复刻全部佣金/付款信息。本次未查到后续公开的完整报表API。
- [官方 Collabs Flow 连接器](https://help.shopify.com/en/manual/shopify-flow/reference/connectors/apps#collabs)包含 Order Attributed。
- [官方 HTTP 动作要求](https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-http-request)支持 Grow、Advanced、Plus。
- [官方 Collabs 报表](https://help.shopify.com/en/manual/promoting-marketing/collabs/merchants/managing-creators)支持导出；不能把部分事件同步称为完整报表同步。
