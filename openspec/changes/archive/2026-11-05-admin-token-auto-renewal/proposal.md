# Why

管理后台已安装的自有 Shopify 应用通过 client credentials 获取的 Admin token 有效期约 24 小时。仅手动替换会让订单同步中断，需要一次配置后由后台自动续取。

# What Changes

- 增加后台专用 Client ID / Client Secret 运行时配置，使用已安装应用的权限换取令牌；不申请或修改 scope。
- 服务端内存缓存、提前续取、并发合并、失败退避及一次 401 恢复；保留手动令牌和未配置时的本地功能。
- 新应用凭据只进入 admin 容器，不进入主站、worker、镜像构建或客户端；支持后台单独发布。
- 更新运行手册、配置示例和隔离验证记录。

# Capabilities

- Modified: `kol-platform` — 可选 Shopify Admin 连接与自动认证。

# Impact

影响 Admin API 客户端、服务端配置、Compose 后台运行环境和管理错误提示。不改变商品、购物车、结账、归因、数据库结构、结算规则或线上 Shopify 配置。无需每日编辑环境文件或重启容器；应用撤销或密钥失效仍需管理员处理。
