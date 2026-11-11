## Why

用户希望缩短单款商品立即购买链路，要求先设计、截图确认，再实现。

## What Changes

- 仅制作独立的 PDP 双操作原型和设计说明，覆盖手机吸底栏、桌面信息区、跳转中、失败、售罄及赠品分支。
- 建议 Buy Now 直接结算当前款 1 件，保留购物袋；Add to Bag 保持现有语义。
- Shopify 当前说明 SWAN QUEEN 不单卖且 99 美元为占位价，赠品分支不建议新增独立立即购买。
- 不修改 src、真实支付、埋点、商品配置或主规范；用户确认后再创建实现变更。

## Capabilities

无运行时 capability 变更，skip_specs。

## Impact

仅 docs/design/buy-now 与本设计变更文档。原型按钮没有网络下单行为，样本来自只读 Shopify 查询。
