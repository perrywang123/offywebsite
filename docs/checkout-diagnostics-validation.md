# 结账诊断实现与验收

2026-11-01，用户授权“先规划后实现然后测试验证”。本轮只实现匿名结账记录和后台查看；没有实现国家选择器或新增购买拦截。

## 实现

- OpenSpec 先写 proposal/tasks/design 与 checkout-diagnostics delta，校验后先写失败测试，再实现。
- 新增 0007 迁移及 checkout_attempts/checkout_attempt_events；主站/后台共用原数据库，采集不依赖 KOL 开关。
- 购物袋点击前登记，单次回执关联 API；国家判定解释、服务端商品快照、Shopify HTTP/GraphQL/网络结果、warnings、原始生成链接及浏览器观察留存。
- 后台第五页：按编号/商品名/handle、国家、结果、日期筛选，分页、详情时间线、默认脱敏、有审计的解密/复制。
- 30 天元数据、7 天加密原文、到期拒绝与清理；自动共享 0600 密钥、部署备份带密钥；可选环境密钥经 env 校验。

## 自动化回归

最终回归：93 个测试文件、562 个测试全部通过；类型、lint、生产构建通过；格式、文档链接与 OpenSpec 已检查，规范已归档。

命令：`pnpm test --maxWorkers=4`、`pnpm typecheck`、`pnpm lint`、`pnpm build`、变更文件 Prettier、`git diff --check` 和 OpenSpec 校验。限为 4 个测试 worker 避免同时构建时既有部署测试触发 5 秒超时；构建和全量测试分开执行。

覆盖：原国家判定行为保持、回执伪造/重放/不匹配、无邮箱/直接 API、前置失败与重复提交、Shopify HTTP/GraphQL/网络/非 JSON 错误和警告、记录写失败不阻断、明文脱敏/密文/AAD/跨实例共享密钥/0600 权限、7/30 天生命周期、敏感存储不可用、服务端结果不被客户端覆盖、分页/搜索、可信入口/会话/CSRF/审计、后台失败状态与复制/焦点。

## 隔离链路

运行 `scripts/kol-integration.ts` 与 `scripts/checkout-diagnostics-integration.mjs`，仅使用 127.0.0.1:3901/3902/3903 和临时数据库，脚本不读取项目 .env。

| 场景                 | 观察                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| 正常创建，国家 GB    | start 与 checkout 关联同一编号；Shopify 返回 GB；HTTP 200，redirect_ready |
| Shopify 地区警告     | warnings 和返回空行可查；原有生成链接行为保留                             |
| Shopify HTTP 429     | 服务端 502；保留上游 429 和返回体                                         |
| Shopify GraphQL 错误 | 服务端 502；保留 GraphQL errors                                           |
| 目录 503             | catalog_checked 记录失败；未创建 Shopify Cart                             |
| 无回执直接请求       | 自动新建并记录服务端全链路                                                |
| 浏览器前置失败       | started → client_verification_failed；无 Shopify Cart 请求                |

同时核对：管理员可解密得到原始生成 URL；数据库字段不含链接明文或 Cart key；查看有审计；公共入口 404、管理未登录 401、缺少 CSRF/Origin 403；SQLite integrity_check=ok。原始执行结果只含模拟记录，见 [集成证据](design/checkout-diagnostics/integration-results.json)。

## 浏览器操作与视觉

实际操作 Offy 模拟商品“Add to Bag → Checkout”到模拟 Shopify 页面，数据库事件包含 started/server_received/catalog_checked/shopify_request/shopify_response/server_result/redirect_requested；没有点击付款。另在点击前注入目录错误，页面保留购物袋并提供 Try again，数据库只有登记与前置验证失败事件；恢复模拟器后重试恢复。

后台实测国家筛选、空筛选、查看详情、原始链接解密与复制、Esc 和返回原按钮焦点。360/768/1440/1920 无页面或导航横溢出，截图与复审记录见 [界面验收](design/checkout-diagnostics/README.md)。

## 真实 Storefront schema 只读核验

使用已配置店铺的 2026-07 Storefront API，仅查询类型字段，核对 9 个类型及新增选择字段全部存在；服务返回的 API 版本同为 2026-07，没有创建购物车/订单。证据见 [字段核验](design/checkout-diagnostics/shopify-schema-check.json)。这证明查询字段兼容，不等同真实购买或付款验收。

## 边界

未部署生产、未运行真实 Docker daemon、未请求真实 Shopify 写接口、未创建真实订单或付款；隔离数据不进入正常发布。无法监听 Shopify 跨域页上的 Sold out 弹窗，已生成链接不等于页面到达/付款。不能恢复历史记录；网络未送达或磁盘不可写仍可能缺记录。备份的保留期限由运维单独管理。
