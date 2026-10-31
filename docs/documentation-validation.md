# 文档校准与展示原型验证

日期：2026-10-31。应用源码基线HEAD e450c46。本轮修改文档、规范、环境示例与独立HTML确认稿，未修改src/db/scripts、构建配置、依赖或真实.env。

## 自动检查

- Vitest：59文件/463测试通过；保留Node/jsdom localStorage实验警告，不构成失败。
- pnpm typecheck、pnpm lint通过。
- 五份主规范strict验证通过，文档变更和待确认行为提案strict验证通过。
- 当前文档本地链接已检查；历史原稿及旧OpenSpec证据保持当时上下文，不把其旧路径作为当前链接保证。
- Prettier用于当前文档/原型，git diff --check通过；历史原稿不批量重排。
- HtmlDesign静态审计通过，0警告。
- 生产build在前一轮相同应用源码上已通过；本轮无运行时代码变更，未重复构建或部署。

## 浏览器

五场景×五尺寸25组：无横向溢出、顾客区唯一H1、可见链接/按钮高度≥44px、已加载图片无损坏。重试禁用/失败重试/模拟成功、抽屉Tab圈闭/Escape/遮罩关闭和焦点恢复均检查。预览console error为空。详见design/shopify-unavailable/README.md与四张截图。

审阅画布有外部工具栏及宽度上限，该原型不等同于生产组件的端到端验收；也未测试真实Shopify故障、真实支付或生产环境。

## 状态

文档已与现有实现校准，旧草案有历史副本。旧2026-10-12变更用--skip-specs归档，不覆盖新规范且不冒记未完成事项。新2026-10-31-shopify-authoritative-catalog只完成设计与范围，用户确认和实现仍未完成。

用户已有未跟踪的SEO截图保留原样。新预览没有向Shopify发请求或创建支付会话。
