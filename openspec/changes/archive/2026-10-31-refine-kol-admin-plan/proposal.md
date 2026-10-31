## Why

用户要求佣金自定义、优惠规则归Shopify，并在整体复核后取得完整方案确认；此前草案/原型仍有固定档位和重复优惠引擎，需要统一修订。

## What Changes

- 重写KOL完整方案V2，保留当次session、独立访问端口与共库要求。
- 将佣金改为自定义百分比、checkout快照；优惠码改为Shopify只读校验与绑定。
- 增加方案复核和真实联调门槛，同步静态演示原型与文档导航。

## Capabilities

无正式应用行为变更，skip_specs: true。原型仅演示，不操作真实Shopify；本次不提前合并待确认业务delta。

## Impact

仅docs/及本次文档变更记录；不修改src/、数据库迁移、Docker/Nginx运行配置或生产服务。用户确认后另建行为OpenSpec与TDD实现。
