# 首页 SWAN QUEEN 主卡验证

2026-11-11。本次只修改 The Latest from OFFY 主卡，不实施移动顶栏原型，不部署生产。

## 实现

- 用户提供的 JPG 原样复制为 `public/assets/news/news-swan-queen.jpg`，源文件与仓库素材逐字节一致。
- Shopify Storefront 只读查询确认 `swan-princess` 对应 BUY 6 OFFY, GET A FREE LIMITED-EDITION SWAN QUEEN，核对时可售。
- 主卡改用该图片和商品路由，暂不传入可见标题；替代文字和链接名称取核验后的商品名。
- 保留原五卡网格与四张副卡。主图定位为 15% center，按钮略靠右，以避开图片左下角的限量标识。
- Shopify 缺失、售罄或读取失败时，沿用既有可售核验，不回退旧商品。

## 静态与自动验证

- OpenSpec 验证通过。
- 先运行更新后的测试确认失败，再实现并通过相关 23 项测试。
- 全量 Vitest：144 个文件、907 项通过。
- 独立 typecheck、ESLint、生产构建、Prettier 和 diff 空白检查通过。最终视觉定位调整后重新完成生产构建（含 lint 与类型检查）。

## 本地动态验证

独立 standalone 在 localhost:4316 运行，127.0.0.1:4317 为本地访问代理。Meta、CAPI 和 KOL 禁用，无生产 worker、订单或服务器变更。

- 在浏览器实际打开首页，五张本地图加载成功，旧标题不存在。
- 点击主卡，实际到达 `/products/swan-princess`，商品 H1 与 Shopify 名称一致，Add to Bag 正常显示；没有加购或下单。
- 360×800、390×844、768×1024、1440×1000、1920×1080 检查，均无横向溢出，保留五卡及正确主卡链接。
- 页面无可见应用错误，服务器启动正常。Chrome 日志存在与浏览器扩展 content.js 同时出现的通用 Object 错误，不能据此声明浏览器控制台零日志；本次未改动用户扩展。
- 已重置临时视口并保留首页预览标签。

截图：[桌面专区](desktop-section.jpg)、[手机](mobile.jpg)。用户可访问 http://127.0.0.1:4317/ 后查看 The Latest from OFFY。
