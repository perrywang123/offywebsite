# 支付交互现状

基线：2026-10-31。

购物袋Checkout是动作按钮：disabled+aria-busy防重复，成功同标签整页跳转Shopify。4xx原地指名商品并允许重试；网络/5xx/缺URL留在当前页面提示并允许重试，购物袋记录保留。备用页仍有联系/地址表单和单一Shopify卡，不提供支付方式切换。

旧PayPal回调可能带cancelled/failed返回备用页；旧Stripe/PayPal成功页查询高熵凭证，未查到时显示确认中。正常Shopify购买不经过本地success页。

/checkout/return清空袋子，文案条件式说明Shopify邮件，没有声称本地已验付。缺少商家端回站配置时，Cart attribute本身不会自动使浏览器返回。

[已实现故障展示](../shopify-unavailable-design.md)在验证失败时隐藏商品事实、小计与结算入口；重试期间禁用按钮，成功再恢复。
