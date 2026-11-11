## Why

用户希望商品详情页的 More from this series 展示完整同系列商品。数据层已读取 Shopify 完整分页，但页面仅渲染前六款。

## What Changes

- 移除详情页推荐区的六款上限，渲染所选市场下同系列全部其他商品。
- 保持 Shopify 返回顺序、当前商品排除规则、既有响应式网格及周边隔离。
- 无同系列其他商品或对应数据读取失败时，保持现有不展示推荐区的行为。
- 更新本地预览并截图，不部署生产，不修改 Shopify、库存、价格或结账。

## Capabilities

### Added Capabilities

- 无。

### Modified Capabilities

- `commerce`: 完整同系列推荐展示。

## Impact

商品详情页的一处数量截断、相邻回归测试、设计契约及验证记录；无需新增查询或依赖。
