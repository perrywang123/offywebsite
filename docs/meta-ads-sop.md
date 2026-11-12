# Offy 广告投放与看数：简练版

更新：2026-11-13。给投放同事和品牌管理员使用。操作与排障细节见[详细版](meta-ads-sop-detailed.md)。

1. **投放设置**：进入 [Meta Ads Manager](https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1301113714798915&business_id=837128189448656)，确认广告账户 `1301113714798915`。购买广告用 Sales → Website → 数据集 `1120625754196383` → Purchase。预算、素材、国家及发布由投放负责人确认。
2. **落地与参数**：网站地址可使用 `https://isoffy.com/`（首页）、`https://isoffy.com/products` 或真实商品页。在 Offy 后台 → 广告诊断 →「投放链接设置」复制 URL 参数，放入 Meta 广告的 **URL parameters** 栏，保留动态 ID。不要伪造 fbclid，不要将模板花括号作为真实访问测试。
3. **确认跳转**：用实际广告预览打开，确认落在 Offy、商品/币种正确，地址中的 campaign_id/adset_id/ad_id 被替换为数字。预览只能验链接，不能证明购买归因。
4. **日常看效果**：Ads Manager 选相同日期与归因窗口，列中加入花费、网站购买次数、购买成本、购买金额和购买 ROAS。事件接收/去重问题去 [Events Manager](https://eventsmanager.facebook.com/events_manager2/list/pixel/1120625754196383/overview?business_id=837128189448656)。
5. **看变化、查链路**：[Offy 广告诊断](https://isoffy.com:8443/admin/meta) 选日期（上海时间）、流量范围及广告 ID →「应用筛选」→ 看每日趋势与站内漏斗。切换浏览器数/事件次数，点击漏斗阶段或广告行「查看链路」下钻，再打开事件证据。出现结账异常看「结账诊断」；订单扫描完成后每 15 分钟检查。

**口径**：Offy 的“结账准备”只在站内记录；Shopify 官方负责 Meta 的 InitiateCheckout 和 Purchase。Offy 的 CAPI 仅补 AddToCart，并与浏览器使用同一事件 ID。后台“CAPI 已接收”不等于广告成交；浏览器标识不是人数；订单证据不是 Meta 最终归因。过去的重复结账历史不会被删除或重算。

**读图**：概览各阶段独立去重；漏斗只串联所选窗口内同一浏览器依次发生的访问、商品浏览、结账准备及对应订单，加购是可选路径。两者数量可能不同。0 表示没有匹配的保留记录；订单未接入、同步失败或过期显示“—”，先核对同步状态。付款历史包含后续退款，金额和退款在订单证据按币种核对；花费、CPA、ROAS 仍在 Meta 查看。

**投放前勾选**：

- [ ] 主站、加购、立即购买与托管结账可用，价格和币种一致。
- [ ] 数据集正确、URL 参数有动态广告 ID、未发布无关草稿。
- [ ] 内部测试使用 `utm_source=offy_validation&utm_medium=internal_test`；后台默认不包含这些记录。
- [ ] 如使用动态商品广告，另查 Meta 目录的商品匹配、国家价格与落地链接；不要擅自新增商品。
- [ ] 真实投放后，由投放负责人安排一次获授权的广告互动成交，核对 Shopify 订单与 Meta 购买归因/去重；不为测试反复付款。

2026-11-12 只读检查所见广告为已完成/已关闭及草稿，尚未找到可用的在投网站购买广告。代码模拟链路通过，不能据此宣称真实广告购买归因已验收。当前状态及生产验证见[本轮记录](meta-order-trace-validation.md)。

[既有飞书图文 SOP](https://my.feishu.cn/wiki/L0Ptw9zhHiVj7akJcG3cRwFenLy)。
