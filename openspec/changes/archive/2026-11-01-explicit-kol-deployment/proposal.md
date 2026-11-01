## Why

服务器执行 `bash deploy/update.sh --kol` 时，旧流水线仍要求私密配置先设置 `KOL_ENABLED=true`，使明确选择后台发布的命令被模板默认的 `false` 阻止。生产模板还指向 `.env.production`，而脚本只默认读取 `.env`，造成配置文件选择不一致。

## What Changes

- 将 `--kol` 和后台独立发布解释为本次命令明确启用 KOL：在解析 Compose 前传入运行开关，并在 Git 更新后重载时保留。
- 配置选择顺序为显式 `--env-file`、现有 `.env`、仅在 `.env` 不存在时使用 `.env.production`；不合并或修改私密文件，不从模板生成真实配置。
- 缺少后台所需配置时一次报告缺少的键名及配置文件位置，仍在构建/服务替换前失败。
- 保持普通无参数部署的开关行为、结算开关、独立后台发布边界、共享卷与端口不变。

## Capabilities

### Modified Capabilities

- `deployment`: 显式启用和运行配置文件选择。

## Impact

部署脚本、配置校验、隔离命令测试与当前部署文档。无页面、商品、订单、数据库 schema 或真实服务器配置变更；真实 Shopify 凭据及 HTTPS 入口仍由服务器提供，禁止提交私密配置。
