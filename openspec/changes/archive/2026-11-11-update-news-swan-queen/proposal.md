## Why

用户要求首页 The Latest from OFFY 主卡使用其提供的 SWAN QUEEN 宣传照，指向对应商品，并暂时隐藏 ROMANTICIZING EVERYDAY LIFE。

## What Changes

- 新增用户提供的本地宣传图，主卡绑定 Shopify `swan-princess`。
- 首页不传入主卡可见标题；替代文字使用当前市场核验后的 Shopify 商品名称，保留整卡链接与 VIEW DETAILS。
- 保留四张副卡、原网格、其他首页模块及 Shopify 可售核验。
- 启动本地预览并提供截图；不部署生产、不实施待确认的移动导航原型。

## Capabilities

### Modified Capabilities

- `brand-site`: NEWS 主卡的图片、商品绑定与标题显示。

## Impact

`src/lib/content.ts`、`src/components/home/NewsGrid.tsx`、首页与相邻测试、`public/assets/news/`、`DESIGN.md`。没有商品配置、价格、库存、结账或服务器配置改动。
