# KOL 落地访问与去重访客方案（待确认）

日期：2026-11-08。状态：本文的 dt_id 落地 PV 与匿名 UV 尚未实现；当前线上只有 Offy `/r/别名` 打开请求聚合，以及 Flow 新归属事件的官方累计快照。

## 链接身份与实际入口

`dt_id` 是 Collabs 官方推广链接的追踪标识，应从真实链接原样获取。官方设置模板使用 `affiliate_link_id`，不是由 Offy 在每次发邀请时生成；没有查到官方保证“同一 KOL 每次重新邀请一定更换 dt_id”，因此不能按这个假设分配或轮换标识。真实合作应将每位 KOL 的实际官方链接绑定到自己的 Offy 合作记录。

本次只读核对发现：内部测试的 `/r/perry-test`、`/r/peiyu`、`/r/perry6` 都指向 `dt_id=3689395`，这只是测试数据。新增合作应限制重复绑定；旧重复记录保留并提示，管理员核对后再整理，不能自动转给其他人。

只读 HEAD 实测 `https://ujc6x6-41.myshopify.com/OFFYTESTPERRY` 返回 301，目的地是 `https://ujc6x6-41.myshopify.com/products?dt_id=3689395`。整个过程没有经过 Offy；Offy 无法观测发生在 Shopify 域名里的浏览。此入口不应被假记为一次 Offy 打开。与之不同，`https://isoffy.com/products?dt_id=3689395` 确实进入 Offy，但目前没有把这类直达访问写入自己的统计库。

## 建议增加的两项指标

**推广落地浏览量（PV）**按官方 dt_id 汇总用户在 Offy 的实际落地页浏览，不再只看短链跳转。`/r/perry-test` 跳到商品页只产生一次落地 PV，不能将跳转请求与页面浏览相加。直接打开带相同 dt_id 的 Offy 商品页也计入该组。后续不带该参数的普通浏览不冒充新的推广落地。多个历史测试别名共用该标识时，显示同一个官方链接汇总，不能假装属于三个不同 KOL。

**去重访客数（UV）**用用户允许分析追踪后生成的第一方随机匿名浏览器标识，在所选时间范围内对同一 dt_id 去重。一个浏览器打开五次记 PV=5、UV=1；另一个浏览器打开一次则为 PV=6、UV=2。每日 UV 不能相加当作期间 UV。同一浏览器从两位 KOL 进入，可分别计入各自的 UV，但全站 UV 仍须另行去重。

这个指标应命名为“去重访客（浏览器）”，不能声称准确真人数。跨设备、无痕窗口、清除存储会导致重复识别；拒绝分析追踪或脚本被拦截时可能无法采集。建议标识和去重明细最多保留 90 天以覆盖当前最长筛选周期，之后清理；不存原始 IP、完整 User-Agent、姓名、邮箱，不做设备指纹，也不复用管理员登录或结账身份。

## 实现边界

沿用现有 Shopify 隐私选择，新增独立、异步的 Offy 落地观察器及只接收最小字段的限流接口。统计失败不阻断商品展示或导航，不修改购物袋、结账参数、Shopify Analytics 上报、官方归因窗口或佣金。后台将短链打开、dt_id 落地 PV/UV、Collabs 官方 Visits 和销售/佣金分别显示，注明来源、时区、采集开始时间与缺失范围；不拿本地 UV 重新计佣。

统计只能从上线后开始。若希望所有推广入口都能在 Offy 观察，需要先统一粉丝最终落地到 `isoffy.com`；Shopify 官方文档提供 Collabs 的 Storefront domain 配置，但这属于另一次明确的店铺配置操作，本轮不修改它，也不修改 DNS 或主店域名。只在 Shopify 域名完成浏览的用户，继续以其官方统计为准。

参考：[Shopify 自定义店面接入要求](https://help.shopify.com/en/manual/promoting-marketing/collabs/merchants/custom-storefronts)、[KOL 官方表现与推广链接](https://help.shopify.com/en/manual/promoting-marketing/collabs/creators/app)。
