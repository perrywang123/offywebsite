# 商品详情页立即购买验收

> 后续状态：2026-11-11 已完成生产发布和上线验收，见 [生产记录](pdp-buy-now-production-validation.md)。下文保留本地阶段证据。

2026-11-11。范围：真实 Next.js 商品页实现、本地 standalone 部署和 Git 同步；未发布生产。

## 实现

手机在原 sticky bottom-0 购买条中，上排显示 Shopify 市场价格和 `1 OFFY · 币种`，下排等宽 Add to Bag / Buy Now，48px 高、10px 间隔。桌面在原商品信息区并列两按钮；保留顶部公告、导航、图集与完整系列推荐。

Add to Bag 仍加入一件并打开购物袋。Buy Now 仅提交当前商品一件和 buy-now intent，不合并或改写本地袋子。服务端拒绝该 intent 的多款、多件和非 Shopify 请求；商品、价格、市场仍由原接口核验。重用诊断、Collabs 和 Meta 上下文，不另建支付管线；结账准备不代表支付成功。

跳转中两按钮禁用，显示 Opening…；失败原地提示并提供 Try again。目的地冲突、商品被拒绝提供刷新复核。售罄禁用，预告保留原提示。遵照用户后续指示，SWAN QUEEN 不作特殊处理，不添加 Shopify 标签，不改价格、优惠或库存。

直接购买的 Cart return_url 附带 `source=buy-now`。回站页根据此标记或 tab-local sessionStorage 保留袋子；下一次普通购物袋结账覆盖 tab 标记，沿用普通回站清袋。legacy success 仍沿用原行为。标记只用于购物袋清理，不作支付、身份或归因凭证。Shopify 不会因 return_url attribute 自动回站，商家侧回站配置仍是独立事项。

## 自动验证

- Red：新增测试首先证明缺少组件、直购 intent 未传递、非法数量/提供商未拒绝。
- Green：完整 `pnpm test --maxWorkers=4`，149 个文件、935 项通过。
- `pnpm build` 通过，包括 ESLint 与 Next.js 类型检查。
- 测试覆盖单款请求、Add to Bag、pending、失败重试、冲突、不可售/预告、intent 转发、商品与国家核验、诊断/追踪上下文、storage 拒绝、直接/普通/legacy 回站。

## 浏览器验证

在 Chrome 实际 standalone 页面操作，临时 4318 QA 入口将 UI 状态与 4317 体验页的 localStorage 分开；Cookie 按主机共享，结束时已将目的地还原 US。4318 只在本地代理层注入短暂 503 测试错误，未添加运行时代码开关。

1. Add to Bag 加入 CARAMEL RÊVE 一件，抽屉正常打开。
2. 转到 LITTLE HEIRESS，Buy Now 打开真实 Shopify 托管结账。订单摘要只包含 LITTLE HEIRESS 一件、USD 45.90，收货国家 US，没有合并 CARAMEL RÊVE。
3. 不填写联系人、不提交付款，手动模拟无 query 的回站，原 CARAMEL RÊVE 一件仍在袋子；验证 tab 标记的兼容保护。
4. 注入本地 503，pending 两按钮禁用；失败后显示提示，Try again 再次进入 pending，Add to Bag 恢复可用。
5. 普通购物袋 Checkout 仍到达 Shopify；手动模拟普通回站清袋，测试袋恢复为空。
6. UK 市场显示 CARAMEL RÊVE GBP 33.90，Buy Now 后 Shopify 也显示 GBP 33.90、国家 GB。
7. 320×740、360×800、390×844、768×1024、1440×1000、1920×1080 无横向溢出。320px 按钮各 139×48px，390px 各 174×48px；手机购买条 115px（不含额外设备 safe-area），桌面隐藏它并只显示信息区双按钮。
8. 商品图初次读取出现过 CDN 超时，随后加载恢复；最终截图图集全部成功加载，未更改图集实现。浏览器仍可见扩展注入的泛化 Object 日志，未据此宣称控制台零日志。

本地预览使用独立 `/tmp/offy-buy-now-preview.db`，完成现有迁移；UK 直购的匿名诊断已记录为 redirect_ready，当前商品 warm-biscuit 一件、GB、商品页来源。未将测试数据写入 Git 或服务器。Meta/CAPI/KOL worker 在此预览关闭；生产归因及支付到账本轮未实测，追踪参数转发由自动测试覆盖。

## 体验与截图

真实商品页：[本地体验](http://127.0.0.1:4317/products/warm-biscuit)。旧 8841 原型仅作设计历史。

- [手机默认](design/buy-now-live/mobile-product.jpg)
- [320px](design/buy-now-live/mobile-320.jpg)
- [桌面](design/buy-now-live/desktop-product.jpg)
- [跳转中](design/buy-now-live/mobile-pending.jpg)
- [失败重试](design/buy-now-live/mobile-failure.jpg)
- [英国币种](design/buy-now-live/mobile-gbp.jpg)
- [Shopify 单款摘要](design/buy-now-live/shopify-one-item.jpg)
- [直接回站保留原袋](design/buy-now-live/return-preserves-bag.jpg)
