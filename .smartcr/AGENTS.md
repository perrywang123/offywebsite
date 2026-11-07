# Offy review context

## Context

Offy uses Next.js 15, React 19, TypeScript, Shopify Storefront/Admin, SQLite and Drizzle. This is a project-authored SmartCR library derived from the current repository contracts, not a downloaded corporate rule pack. Production deployments must preserve the live storefront and real customer records.

## Review Focus

Review behavior and concrete failure paths before style. Shopify is the only authority for products, prices, markets, stock and checkout. In Collabs mode, official attribution, commission and automatic payment are authoritative; imported reports are administrator-supplied evidence, not direct API or bank confirmation. Missing report values remain unknown, and currencies must stay separate. Administrator endpoints require the existing private ingress, login and write protections. Tracking errors must not break ordinary shopping. Tests and documentation are evidence, not substitutes for real creator attribution and actual payouts.

## Domain Critical Paths

- [CRITICAL][commerce] 商品事实只能来自 Shopify；读取失败不得展示本地价格或创建支付会话，国家和真实 checkoutUrl 必须保留。
- [CRITICAL][money] 金额使用明确币种和最小货币单位；缺失不等于零，不能跨币种相加或声称未核实的付款已完成。
- [CRITICAL][collabs] Collabs 模式不得新建本地佣金应付、手动付款或发码；报告导入保留来源、粒度、历史和审计。
- [CRITICAL][access] 管理 API 需私有入口、登录和写入防护；凭据、完整结账链接及客户敏感信息不得公开或入库到 Git。
- [CRITICAL][tracking] 外部链接限定官方 Shopify 主机，站内跳转拒绝协议相对地址和管理入口；跟踪参数精确传递且失败隔离。
- [CRITICAL][deployment] 后台单独更新不得重建或重启主站；预构建校验真实源 revision，备份共享数据库且保留运行配置。
