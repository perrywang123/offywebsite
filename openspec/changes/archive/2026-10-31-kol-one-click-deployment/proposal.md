## Why

KOL功能已有Docker配置，但旧部署脚本只启动app、上传后绕过配置/健康检查，手动上传源码还会被git pull前置阻断；私密env及缓存/原始资源排除也不完整。用户要求补充可操作的一键部署。

## What Changes

- 统一服务器部署入口，兼容git更新/已上传源码，按KOL开关启动app与worker。
- 源码上传与平台无关源码包共用排除规则，不传私密env/数据库/缓存/原始资源。
- 部署前校验Compose生效配置，构建后在线备份持久DB再更新；检查app、owner与worker。
- 可选由显式配置路径安装双入口Nginx，备份/语法检查/失败恢复，并验证HTTPS边界。
- 增加本机一键KOL命令、只检查/预演模式和首次配置说明；不连接生产。

## Capabilities

### New Capabilities

- `deployment`: 安全源码交付、Docker一键发布、代理与运行检查。

## Impact

部署脚本、只读就绪检查、Compose部署元数据与Docker脚本打包、文档和隔离测试；不改商品/归因/财务规则，不实际发布线上。
