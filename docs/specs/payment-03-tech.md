# 支付技术实现

基线：2026-10-31；见 [服务规格](05-server-spec.md)。

PaymentProvider定义createCheckout/capture/parseCallback；registry注册Stripe/PayPal/Shopify。/api/payments/checkout校验最多50行、clamp数量，provider缺省Stripe；购物袋明确提交shopify，country来自请求头/GeoIP，locale影响结账语言。

Shopify：handle实时解析到首variant，检查可售与quote-only，Cart buyerIdentity与inContext采用访客country，附加return_url；不使用本地DB、不capture、不解析订单callback。缺配置503，Cart异常502，商品问题400且逐件说明。解析失败统一503，不创建Cart/支付会话；结算前重新读取Shopify。

Stripe：USD-only Checkout Session、服务器商品金额、行快照入checkout_sessions；webhook验签且payment_status=paid后finalizeOrder。PayPal：OAuth token缓存、createOrder、批准链接、回跳capture前核对USD金额、幂等订单写入。它们没有在当前UI提供。

orders/checkout_sessions已含currency和provider列；缺少单事务、并发订单号和PayPal异步webhook补偿。恢复多币种或新网关应单独spec/TDD，不能仅移除守卫。

严格数据失败保护见 [已实现变更](../../openspec/changes/archive/2026-10-31-shopify-authoritative-catalog/design.md)。本轮未执行真实付款。
