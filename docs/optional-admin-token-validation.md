# 可选 Shopify Admin 令牌验收

日期：2026-11-02。本地实现验证，不代表已向真实店铺申请权限、完成生产 Docker 部署或验证真实订单同步。

## 行为与范围

- `SHOPIFY_ADMIN_TOKEN` 保持服务器私密运行配置入口，不新增 Client ID/secret、自动获取或续期。
- 无令牌或空白令牌时允许 KOL 部署和登录，保留本地记录与结账诊断；远程连接/手动同步返回明确配置错误。
- worker 无令牌时不发送 Shopify 请求，不消费订单/发码队列、不推进扫描游标或最近成功扫描时间；仍清理本地过期记录、释放租约并标记 `shopify: not_configured`。
- 更换 Admin 令牌不要求同时更新运行中的主站；店铺、数据库卷和归因认证兼容检查保留。
- 配置令牌后的真实权限失败仍记录为错误，财务核验门槛不变。

## 自动化

按 spec-first + TDD，先验证可选配置、任务暂停、状态提示和令牌独立更新的失败用例，再实现。

- `pnpm test --maxWorkers=2`：98 文件、619 测试全部通过。
- 首次默认并发全量运行时，既有 BuildKit CPU 限额测试触发5秒超时，其余618项通过；降低测试并发后完整重跑通过，未放宽断言或超时门槛。
- `pnpm typecheck` 通过；`pnpm build` 通过，包含先行 ESLint 和 Next.js 内置类型检查，standalone 输出成功。
- 实际调用部署 Python 验证器和隔离的 shell 流水线：可缺省令牌、兼容旧 peer 令牌、仅替换 admin/worker，仍执行备份和 readiness；共享配置漂移仍拒绝。
- 内存 SQLite / 真实 API handler：无令牌登录、状态与诊断读取成功，连接及手动同步返回 `shopify_admin_not_configured`；无外部网络请求。注入虚构令牌后用模拟响应验证扫描恢复；`ACCESS_DENIED` 不会写入成功扫描。
- Node/Bash/Python 语法、改动文件格式、文档链接和 OpenSpec 验证通过。

## 浏览器

独立临时 SQLite、虚构管理员、本地4311/4312端口；没有使用生产管理员密码或真实 Shopify 凭据。验证后已停止临时服务并清理数据库，未在日常开发库中写入测试记录。

- 无令牌实际登录，进入合作记录及结账诊断，提示未配置 Shopify Admin。
- “连接与同步”以及“执行一轮同步”明确显示未配置错误，后台会话保持有效。
- 内部 worker 实际返回 `{"ok":true,"shopify":"not_configured"}`，没有假报订单同步成功。
- 1440px / 375px 检查提示、导航、诊断筛选；文档宽度分别等于1440/375，无横向溢出。临时视口设置已恢复。

截图：[桌面](design/kol-admin/optional-admin-token-1440.jpg)、[手机](design/kol-admin/optional-admin-token-375.jpg)。截图为空的隔离测试库，不能当作生产没有记录的证据。

服务器操作见 [部署手册](deployment.md#手动配置-shopify-admin-令牌可选)。线上需先拉取本次代码；如果原先误填 Storefront 令牌而暂不接入 Admin API，应将 `SHOPIFY_ADMIN_TOKEN` 清空后只发布后台，保持 `SHOPIFY_STOREFRONT_TOKEN` 原值。
