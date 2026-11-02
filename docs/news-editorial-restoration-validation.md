# NEWS 内置宣传图恢复验收

日期：2026-11-02。范围仅首页 The Latest from OFFY 的五张宣传图来源，不改变布局、文案、商品绑定和 Shopify 商业数据路径。

## 历史定位

- `9262e88` 将五张卡定义为宣传图、文案与商品 handle 的独立配置。
- `808d9b8` 在商品事实来源改造中，于首页以 `product.images[0]` 覆盖了这些宣传图，并将 Shopify 首图存在性作为区块展示条件。
- 对照 `808d9b8^:src/lib/content.ts`，原映射始终保留，五个原始图片文件仍在 `public/assets/news/`。逐一比较 Git blob，当前文件与误改前完全一致；本次没有重制或替换图片文件。

| 位置   | 恢复的内置图片 | 商品 handle    |
| ------ | -------------- | -------------- |
| 主卡   | `news-01.jpg`  | `warm-biscuit` |
| 右上左 | `news-04.jpg`  | `bunny-hug`    |
| 右上右 | `news-03.jpg`  | `ace`          |
| 右下左 | `news-08.jpg`  | `wander`       |
| 右下右 | `news-02.jpg`  | `offy_redrush` |

## 实现与回归

首页保留 Shopify 当前市场可售商品验证，向 NewsGrid 传递配置中的原图；不再用商品首图覆盖，也不要求 Shopify 有首图才显示本地宣传卡。缺失/不可售绑定和 Shopify 读取失败的处理保留，价格、库存、商品详情图和结账仍完全由 Shopify 提供。

- TDD：先复现远程图片覆盖以及 Shopify 无首图时区块消失的两项失败，再修复；增加不可售副卡仍隐藏的断言。
- 首页、NewsGrid、首页故障态相关19项测试通过。
- 全量 `pnpm test --maxWorkers=2`：98文件、622测试通过。
- `pnpm typecheck` 通过；`pnpm build` 通过，包含 ESLint 与 Next.js 内置类型检查。
- 文档、设计契约和 NEWS 主规范同步校准；不合并其他历史方案或商业数据回退。

## 浏览器证据

本地首页使用当前真实 Shopify 目录完成商品可售核验。五张 NEWS 图片均实际加载成功，`naturalWidth > 0`，DOM 图片 URL 解码后均为上述 `/assets/news/` 本地路径；五个商品链接与原配置一致。页面错误日志未发现错误。

截图来自 `pnpm build` 后本地生产服务的实际浏览器区块截图，没有替换 DOM、图片或商业数据：[桌面1440px](design/news-editorial-restoration/restored-1440.jpg)、[手机375px](design/news-editorial-restoration/restored-375.jpg)。360、375、768、1440、1920px 均检查图片加载与文档宽度，无横向溢出；切换尺寸时图片重新选取 srcset 的短暂加载状态已等待完成后复核。临时视口已恢复。它们证明本地改动生效，不代表已经更新生产服务器。
