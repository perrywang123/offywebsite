# KOL 落地访问与去重访客

日期：2026-11-08。状态：负责人已批准，代码、隔离测试及生产分步部署已完成；详见[验收记录](collabs-landing-validation.md)。短链请求、落地PV/UV与Flow官方快照分开呈现。

## 链接身份与实际入口

`dt_id` 是 Collabs 官方推广链接的追踪标识，应从真实链接原样获取。官方设置模板使用 `affiliate_link_id`，不是由 Offy 在每次发邀请时生成；没有查到官方保证“同一 KOL 每次重新邀请一定更换 dt_id”，因此不能按这个假设分配或轮换标识。真实合作应将每位 KOL 的实际官方链接绑定到自己的 Offy 合作记录。

本次只读核对发现：内部测试的 `/r/perry-test`、`/r/peiyu`、`/r/perry6` 都指向 `dt_id=3689395`，这只是测试数据。新增合作应限制重复绑定；旧重复记录保留并提示，管理员核对后再整理，不能自动转给其他人。

只读 HEAD 实测 `https://ujc6x6-41.myshopify.com/OFFYTESTPERRY` 返回 301，目的地是 `https://ujc6x6-41.myshopify.com/products?dt_id=3689395`。整个过程没有经过 Offy；Offy 无法观测发生在 Shopify 域名里的浏览。此入口不应被假记为一次 Offy 打开。与之不同，`https://isoffy.com/products?dt_id=3689395` 确实进入 Offy；本次已为这类直达访问加入许可后采集，不要求先经过 Offy 短链。

## 两项新增指标

**推广落地浏览量（PV）**按官方 dt_id 汇总用户在 Offy 的实际落地页浏览，不再只看短链跳转。`/r/perry-test` 跳到商品页只产生一次落地 PV，不能将跳转请求与页面浏览相加。直接打开带相同 dt_id 的 Offy 商品页也计入该组。后续不带该参数的普通浏览不冒充新的推广落地。多个历史测试别名共用该标识时，显示同一个官方链接汇总，不能假装属于三个不同 KOL。

**去重访客数（UV）**用用户允许分析追踪后生成的第一方随机匿名浏览器标识，在所选时间范围内对同一 dt_id 去重。一个浏览器打开五次记 PV=5、UV=1；另一个浏览器打开一次则为 PV=6、UV=2。每日 UV 不能相加当作期间 UV。同一浏览器从两位 KOL 进入，可分别计入各自的 UV，但全站 UV 仍须另行去重。

这个指标命名为“去重访客（浏览器）”，不能声称准确真人数。跨设备、无痕窗口、清除或限制Cookie会影响识别；拒绝分析追踪或脚本被拦截时可能无法采集。标识和去重明细最多保留90天以覆盖当前最长筛选周期，之后清理；不存原始IP、完整User-Agent、姓名、邮箱，不做设备指纹，也不复用管理员登录或结账身份。

Cookie由服务器签名并设置HttpOnly、Secure、SameSite=Lax，固定90天到期，不因每次访问无限续期；数据库只保留独立用途的HMAC摘要。请求只包含版本、dt_id、随机事件号、公共路径与分析许可声明，不发送其他URL参数。重复事件不累加；撤回许可会清除Cookie并移除该摘要对应的UV明细，已有不含访客标识的PV汇总保留。清理失败不会阻断页面，Cookie仍清除，后台按保留期继续清理。

## 实现边界

沿用现有 Shopify 隐私选择，新增独立、异步的 Offy 落地观察器及只接收最小字段的限流接口。统计失败不阻断商品展示或导航，不修改购物袋、结账参数、Shopify Analytics 上报、官方归因窗口或佣金。后台将短链打开、dt_id 落地 PV/UV、Collabs 官方 Visits 和销售/佣金分别显示，注明来源、时区、采集开始时间与缺失范围；不拿本地 UV 重新计佣。

统计只能从上线后开始。若希望所有推广入口都能在 Offy 观察，需要先统一粉丝最终落地到 `isoffy.com`；Shopify 官方文档提供 Collabs 的 Storefront domain 配置，但这属于另一次明确的店铺配置操作，本轮不修改它，也不修改 DNS 或主店域名。只在 Shopify 域名完成浏览的用户，继续以其官方统计为准。

参考：[Shopify 自定义店面接入要求](https://help.shopify.com/en/manual/promoting-marketing/collabs/merchants/custom-storefronts)、[KOL 官方表现与推广链接](https://help.shopify.com/en/manual/promoting-marketing/collabs/creators/app)。

当前KOL对外合作邮箱统一为 **contact@whimcoreofficial.com**；不改变管理员登录、KOL本人账号或佣金收款身份。
