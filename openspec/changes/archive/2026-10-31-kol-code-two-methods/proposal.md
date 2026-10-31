## Why

用户确认同时支持绑定Shopify已有码与Offy生成新码同步；此前V2只读首版取舍需要在方案、权限与原型中统一替换。

## What Changes

- 方案升为V2.1，增加向Shopify已有活动追加代码的发码流程及write_discounts边界。
- 明确异步任务完成/具体代码回读、超时核对、幂等重试、活动共享规则与本地绑定失败恢复。
- 静态原型增加双入口、来源列与同步中/成功/失败/超时演示；更新复核/导航/验收。

## Capabilities

仅文档及静态原型，skip_specs: true。正式后台、Shopify写入或访问权限均未实现/变更；不合并未实施业务delta。

## Impact

影响docs/与本次文档记录；不修改src/、数据库迁移、Docker/Nginx或生产Shopify。后续正式实现需独立行为OpenSpec及TDD。
