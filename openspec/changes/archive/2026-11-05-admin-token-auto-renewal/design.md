# Design

## Configuration and isolation

`SHOPIFY_ADMIN_CLIENT_ID` 与 `SHOPIFY_ADMIN_CLIENT_SECRET` 均为服务端可选字符串，只在后台容器运行时注入。完整 pair 优先于历史 `SHOPIFY_ADMIN_TOKEN`；没有 pair 时沿用手动令牌。只填一项时远程操作报配置不完整，不回退旧令牌；本地后台仍能登录和读诊断。两种模式都没有时维持同步暂停。既有主站 Storefront 配置与共享数据验证保持原样。

## Token lifecycle

通过 HTTPS 的店铺 `*.myshopify.com/admin/oauth/access_token` POST 表单交换，不发送 scope，不跟随重定向。沿用显式受保护的本地集成传输例外。按响应 `expires_in` 和请求开始时间计算硬截止；提前 min(5分钟, TTL 的10%) 续取。进程内单例缓存；并发请求共享一个交换任务，配置变化/进程重启不复用旧缓存。不落库、不改环境文件、不向 UI 返回 token。

交换失败使用固定脱敏错误；30秒退避以免请求风暴。提前续取暂时失败时，仍在硬有效期内且未被401拒绝的旧令牌可以继续使用；硬过期之后必须报错。401仅在自动模式下使被拒绝的令牌失效，合并续取并最多重放一次 Admin 请求；其他HTTP/GraphQL/网络错误不重放，避免写入歧义。权限不足不会触发扩大授权或无限续取。

## Verification

先用可注入时钟/网络的失败测试覆盖续期、并发、错误恢复和敏感信息隔离；再覆盖真实 Admin 客户端、worker、部署配置和本地 HTTP 模拟 Shopify 链路。测试不使用真实密钥，不修改线上商店或其令牌。生产构建与现有本地开发服务输出隔离。
