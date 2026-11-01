## Why

生产服务器为2核、约4GB内存，发布构建时 Next.js 主进程和内部 worker 合计占满CPU，可能影响仍在运行的主站。用户选择仅限制 Docker 构建 CPU，不迁移 CI、不限制业务容器运行资源。

## What Changes

- 统一部署流程使用项目专属的 docker-container BuildKit 构建器，默认合计1 CPU的CFS配额；主站/后台共用同一配额而非各1 CPU。
- 使用 BuildKit 的单任务并行配置与本地镜像加载，保留构建缓存、不更改全局默认 builder；环境可通过宿主 `DEPLOY_BUILD_CPUS` 调整额度。
- 实际构建前核验 Buildx/Compose 支持、Docker CPU配额能力、builder声明与实际容器配置；失败不回退至无限额构建。
- `--check` 仅只读校验，不创建/启动构建器；保留既有数据库备份、独立后台边界、端口与持久卷。

## Capabilities

### Modified Capabilities

- `deployment`: Docker构建CPU隔离和可验证的资源配额。

## Impact

仅部署工具、宿主Compose元数据、测试与文档。首轮需要拉取官方BuildKit镜像并建立独立缓存；构建可能更慢。CPU限制不提供内存上限、不保证追踪异常自行消失、不影响已启动的宿主机或旧构建器任务。
