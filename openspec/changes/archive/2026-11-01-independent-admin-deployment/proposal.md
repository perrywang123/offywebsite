## Why

管理后台需要在已有服务器 Git checkout 中独立更新；开发机 SSH 上传的 IP 参数和手动源码交付不符合日常部署方式。当前共用 app 容器会使后台更新同时重启主站。

## What Changes

- 新增服务器端 `deploy/update-admin.sh`，默认 Git fast-forward 更新并重载脚本，无服务器 IP 参数。
- 同一仓库、同一 Compose 项目增加独立 admin 镜像/容器，worker 调用 admin；主站与后台共用 SQLite 卷。
- 后台独立发布仅构建/替换 admin 和 worker，保留一致备份、校验、共享部署锁及 HTTPS 边界验证。
- 兼容现有整套发布，更新部署文档，以服务器 Git 更新为首选。

## Capabilities

### Modified Capabilities

- `deployment`: 独立 Git 后台发布及容器隔离。

## Impact

Compose、部署流水线、Nginx 上游、部署测试和运行文档；无业务 schema 或页面交互修改。首次启用 KOL 仍需同步主站归因代码；后续兼容的后台更新可独立发布。
