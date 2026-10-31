# 支付产品边界

当前基线：2026-10-31。早期“默认PayPal、可切Stripe”的产品方案已退出当前UI，历史原文见 [历史索引](../history/README.md)。

当前购物袋直接创建Shopify Cart，随后顾客在Shopify托管结账完成地址填写、支付、订单确认；可用支付方式由商家在Shopify配置，本站不承诺特定网关已开通或已通过真实支付。

备用/checkout页仍存在，并固定选择Shopify。保留Stripe/PayPal代码不等于已在UI开放，也不是Shopify失败后的自动独立支付备用通道。

Shopify订单、退款、发货由Shopify管理；本地orders是旧Stripe/PayPal数据。可选KOL模块已有独立webhook/主动核对与财务账本，真实店铺联调尚未完成；return_url只是Cart attribute，回站需商家另配。

商品fallback已取消；所有provider在Shopify校验失败时返回503并禁止建单。不同时扩展新支付渠道或执行真实付款。
