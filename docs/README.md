# Offy 文档导航

基础文档基线：2026-10-31；Collabs 运行、复验与 SOP 更新于2026-11-07。阅读顺序：当前状态 → 架构/开发规范 → 相关专项。

| 内容                           | 入口                                                                                                                        | 状态                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 项目事实、验证记录与已知限制   | [current-state](current-state.md)                                                                                           | 当前实现                                      |
| 架构、数据流、API 与数据库     | [architecture](architecture.md)                                                                                             | 当前实现                                      |
| 产品、交互、视觉、前后端、测试 | [specs](specs/README.md)                                                                                                    | 当前实现                                      |
| 开发纪律 / 设计契约            | [AGENTS](../AGENTS.md) / [DESIGN](../DESIGN.md)                                                                             | 执行约束                                      |
| 运行、发布、恢复               | [deployment](deployment.md) / [独立后台验收](admin-deployment-validation.md) / [public-deploy](public-deploy.md)            | 当前脚本与边界                                |
| Shopify 接入与市场配置         | [integration](shopify-integration-guide.md) / [regional](shopify-regional-config.md)                                        | 当前实现                                      |
| 匿名结账诊断                   | [运行说明](checkout-diagnostics.md) / [验收](checkout-diagnostics-validation.md) / [最新复验](collabs-flow-revalidation.md) | 已部署，线上可读                              |
| Shopify 失败展示               | [方案](shopify-unavailable-design.md) / [HTML 原型](design/shopify-unavailable/index.html)                                  | 已确认并实现                                  |
| 待做事项与依赖                 | [roadmap](roadmap.md)                                                                                                       | 规划                                          |
| SEO                            | [seo-plan](seo-plan.md)                                                                                                     | 已完成与待办分列                              |
| 分析与后台                     | [analytics](analytics-mvp.md) / [admin](admin-console.md)                                                                   | 全站分析待实施；KOL后台已实现                 |
| KOL 合作、优惠与分成后台       | [V2.1完整方案](kol-admin-proposal.md) / [复核](kol-admin-review.md) / [交互原型](design/kol-admin/index.html)               | 已批准并实现，默认关闭                        |
| KOL运行与验证                  | [运行手册](kol-platform-operations.md) / [验收](kol-platform-validation.md)                                                 | 旧 Offy 模式兼容资料，以 Collabs 当前说明为准 |
| Collabs 官方计佣与核对         | [运行说明](collabs-operations.md) / [流程复验](collabs-flow-revalidation.md)                                                | 已部署，真实 KOL 归因/到账仍需试点            |
| 管理员与 KOL 操作 SOP          | [管理员](collabs-admin-sop.md) / [KOL](collabs-kol-sop.md)；[飞书链接与页面验收](collabs-flow-revalidation.md#发布与交付)   | 两份飞书文档已保存                            |
| 本地基本代码审查               | [SmartCR 项目规则](../.smartcr/README.md)                                                                                   | 本地工具，不影响线上运行                      |
| 历史设计、品牌手册、迁移草案   | [历史索引](history/README.md)                                                                                               | 不作为现行行为规范                            |
| 法务/品牌文案提取与截图        | `qa-source-final.md`、`our-story-source.md`、`design/seo-batch*/`                                                           | 来源证据，不是当前运行快照                    |

主规范在 `openspec/specs/`。未确认行为在 `openspec/changes/`；历史归档在 `openspec/changes/archive/`。遇到数量/价格/市场差异，以当前 Shopify 查询为事实，不从旧文档恢复商业数据。

本轮文档和预览的校验范围见 [documentation-validation](documentation-validation.md)。

## Meta 广告追踪

- [两步技术方案](meta-technical-plan.md)
- [投放、数据查看与发布 SOP](meta-ads-sop.md)
- [本轮验证与边界](meta-validation.md)
