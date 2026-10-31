# Offy 文档导航

文档基线：2026-10-31。阅读顺序：当前状态 → 架构/开发规范 → 相关专项。

| 内容                           | 入口                                                                                                             | 状态                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 项目事实、验证记录与已知限制   | [current-state](current-state.md)                                                                                | 当前实现                      |
| 架构、数据流、API 与数据库     | [architecture](architecture.md)                                                                                  | 当前实现                      |
| 产品、交互、视觉、前后端、测试 | [specs](specs/README.md)                                                                                         | 当前实现                      |
| 开发纪律 / 设计契约            | [AGENTS](../AGENTS.md) / [DESIGN](../DESIGN.md)                                                                  | 执行约束                      |
| 运行、发布、恢复               | [deployment](deployment.md) / [独立后台验收](admin-deployment-validation.md) / [public-deploy](public-deploy.md) | 当前脚本与边界                |
| Shopify 接入与市场配置         | [integration](shopify-integration-guide.md) / [regional](shopify-regional-config.md)                             | 当前实现                      |
| Shopify 失败展示               | [方案](shopify-unavailable-design.md) / [HTML 原型](design/shopify-unavailable/index.html)                       | 已确认并实现                  |
| 待做事项与依赖                 | [roadmap](roadmap.md)                                                                                            | 规划                          |
| SEO                            | [seo-plan](seo-plan.md)                                                                                          | 已完成与待办分列              |
| 分析与后台                     | [analytics](analytics-mvp.md) / [admin](admin-console.md)                                                        | 全站分析待实施；KOL后台已实现 |
| KOL 合作、优惠与分成后台       | [V2.1完整方案](kol-admin-proposal.md) / [复核](kol-admin-review.md) / [交互原型](design/kol-admin/index.html)    | 已批准并实现，默认关闭        |
| KOL运行与验证                  | [运行手册](kol-platform-operations.md) / [验收](kol-platform-validation.md)                                      | 本地隔离通过，生产未部署      |
| 历史设计、品牌手册、迁移草案   | [历史索引](history/README.md)                                                                                    | 不作为现行行为规范            |
| 法务/品牌文案提取与截图        | `qa-source-final.md`、`our-story-source.md`、`design/seo-batch*/`                                                | 来源证据，不是当前运行快照    |

主规范在 `openspec/specs/`。未确认行为在 `openspec/changes/`；历史归档在 `openspec/changes/archive/`。遇到数量/价格/市场差异，以当前 Shopify 查询为事实，不从旧文档恢复商业数据。

本轮文档和预览的校验范围见 [documentation-validation](documentation-validation.md)。
