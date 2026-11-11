## Why

用户要求 SWAN QUEEN 主卡的 View Details 恢复居中、缩小并避开限量标识，优先保证手机端。核查发现此前用户已确认保留的紧凑手机工具栏和帮助侧栏仅交付了设计原型，尚未接入真实页面，本次补齐。

## What Changes

- 主卡按钮横向居中，缩小视觉尺寸并下移，保留原整卡商品链接。
- 手机接入已确认的 56px 单行工具栏、紧凑国家入口、图标购物袋及数量角标，44px 操作命中区。
- 手机侧栏接入 Help & Support，Series 子导航去除框线、保留 Shopify 名称和原链接。
- 保留黑色公告轮播和桌面导航，不恢复已取消的第二行主导航。
- 本地真实页面验收、截图、Git 同步，不部署生产；不改购物袋状态、国家判定或结账。

## Capabilities

### Modified Capabilities

- `brand-site`: Header behavior、News module。

## Impact

Header、CartButton、CountryTrigger 表现层、MobileNav、NewsGrid、双语字典与设计契约；现有市场和购物袋业务函数保持不变。
