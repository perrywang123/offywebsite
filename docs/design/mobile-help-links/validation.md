# 手机侧栏帮助入口验收

日期：2026-11-11。范围：只移除手机侧栏 Help & Support 的 Shipping & returns 入口，保留 FAQ、Contact Us、底部国家入口、页脚与政策页面。

## 自动验证

- 先新增两链接断言，确认因旧 Shipping & returns 入口仍存在而失败，再删除该入口后通过。
- 剩余帮助链接继续覆盖目标地址与点击关闭侧栏。
- 全量 Vitest：149 个文件、935 项测试通过；本轮侧栏测试 8 项通过。
- `pnpm build` 完成，ESLint 和 Next.js 类型检查通过。

## 浏览器与发布范围

本地 standalone 已更新至 http://127.0.0.1:4317/，以 390×844、320×640 视口检查：帮助区仅有 FAQ、Contact Us，未出现 Shipping & returns；底部国家入口保留。分别点击 FAQ、Contact Us 后进入对应页面且侧栏关闭；点击底部国家按钮能打开选择器，再关闭而未变更国家。

截图：[390px](mobile-after.jpg)、[320px](mobile-320.jpg)。Git 同步供后续发布，生产不在本轮发布范围内。未修改 Shopify 配置、商品、结账或管理后台。

## 后续发布

2026-11-11 已随五屏轮播版本 `114cb56` 独立发布主站；原本的未发布表述是本项完成时的历史状态。当前生产验证见[五屏发布记录](../hero-live/validation.md)。
