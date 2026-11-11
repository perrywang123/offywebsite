# PDP Buy Now · 设计提案

状态：2026-11-11，设计已确认，真实商品页已本地实现并验证；原型仅保留作设计记录。

## 设计目标

让已选定单款的访客直接进入 Shopify 结账；保留继续选购的加购入口。延续 OFFY 的黑白摄影、系统字体与胶囊按钮，不改变导航、商品内容或推荐布局。

## 视觉契约

- 背景 #efefef，表面 #fff，主色 #1d1915，次字 #666，分隔 #e3e3e3，错误 #b3402f。
- 手机底栏上排价格 20px / 字重 550，右侧 11px 的「1 OFFY · USD」明确结算单位和币种；下排 Add to Bag 描边、Buy Now 黑底，两列等宽、间距 10px、高 48px。底栏约 110px（含正常底部留白，设备另加 safe-area）。
- 两个动作不争夺视觉主位。加购是选择继续逛，立即购买是当前款的快捷入口；不使用额外促销色或闪烁。
- 375px 采用左右 16px，320px 仍保证文字完整和至少 44px 命中区。价格不挤进三列按钮，也不重复占一整行说明文字。
- 桌面在原商品信息区并列显示两按钮，保留其上原价格，不新增桌面吸底栏。
- 原型采用 12/16/24px 间距；名称 28px（桌面 40px），正文 14px，辅助说明最低 11px。
- 实际实现沿用 StickyBuyBar 的 sticky bottom-0 与 safe-area 机制，避免现有带 transform 的页面祖先造成 fixed 失效。

## 已确认行为

1. Add to Bag：保留现有加购和打开购物袋的行为。
2. Buy Now：默认仅当前商品 1 件，直接创建 Shopify 结账；不合并、不清空已有购物袋。多件、多款和凑赠品继续通过购物袋操作。若后续另加数量选择，再明确是否沿用所选数量，本版不额外增加数量器。
3. 跳转中：Buy Now 显示 Opening… 与小型 spinner（读屏名称 Opening Shopify checkout），两按钮暂时禁用，阻止重复点击；不增加中间确认页。
4. 失败：留在当前 PDP，以短错误文案和 Try again 恢复重试，Add to Bag 仍可使用；不删除原购物袋、不假装支付完成。
5. 售罄：两个按钮禁用，主按钮显示 Sold out。预告/商品数据不可用沿用现有规则，不能创建结账。
6. 按用户最新指示，不针对 SWAN QUEEN 增加特殊分支、不修改 Shopify 标签或优惠配置。

## 实现边界

复用 useCheckoutRedirect / /api/payments/checkout，提交当前单款 1 件和 buy-now intent，仍由服务端核验市场与商品事实。保留 checkout diagnostics、Collabs 与 Meta 现有上下文。

Shopify 的 return_url attribute 对立即购买附加 source=buy-now；回站组件据此保留原购物袋，并用跳转前写入的 tab-local sessionStorage 标记兼容商家回站链接丢失 query 的情况。后续普通购物袋结账会覆盖此标记；Stripe/PayPal success 页沿用原有逻辑。标记不是付款凭证，回站页不验证支付成功。Shopify 不会仅因这个 attribute 自动回站，仍需要商家侧回站配置。

## 原型说明

index.html 为顾客视角，review.html 为评审控制台。可切换正常、跳转中、失败、售罄、赠品以及桌面布局。

按钮只模拟：Buy Now 最终弹窗解释将进入 Shopify，不创建真实 Cart、订单或付款；正式版不会出现这个演示弹窗。加购只改原型内存计数并打开模拟购物袋，不写真实站 localStorage，不上报埋点。关闭/刷新即清除模拟状态。

sample.json 和商品照片只用于设计复核，不是运行时商品或价格回退。原型服务仅接受 GET/HEAD，不能向真实站或 Shopify 提交支付请求。
