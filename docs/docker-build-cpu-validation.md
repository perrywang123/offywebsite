# Docker 构建 CPU 限制验证

验证日期：2026-11-01。范围是发布时的镜像构建资源隔离；没有连接或更新生产服务器，没有调用 Shopify 商业接口或写入业务数据库。

## 实现与自动化检查

`deploy/update.sh` 和独立后台入口共用项目专属的 BuildKit 构建器。默认 `cpu-period=100000`、`cpu-quota=100000`，主站和后台构建共享 1 CPU 预算；OCI `max-parallelism=1`。不修改运行中 app/admin/worker 的资源配置。

先补充失败测试，再实现并验证：

- 专属构建器创建、实际配额核验、重复发布复用、默认构建器不被切换。
- `--check` 不创建或启动构建器；0.5 CPU 可用，非法额度拒绝。
- Buildx/Compose 版本能力、内核配额能力缺失，或构建器 driver/实际配额/并行度漂移时中止。
- 整套发布为 app/admin 显式传入同一 builder；独立后台发布保留原有范围、备份和健康检查。

检查结果：

| 检查                            | 结果                                   |
| ------------------------------- | -------------------------------------- |
| `pnpm test --maxWorkers=2`      | 96 个文件、583 项测试通过              |
| `pnpm typecheck` / `pnpm lint`  | 通过                                   |
| `pnpm build`                    | standalone 生产构建通过                |
| Shell/Python 语法、Compose 解析 | 通过；额度不进入业务容器的运行资源字段 |
| OpenSpec 变更校验               | 通过                                   |

## 隔离 Linux Docker 实测

使用本地独立 Colima VM（2 CPU、4 GiB，Linux ARM64、cgroup v2），与生产和原本 Docker context 隔离。真实 Docker 引擎报告支持 CFS quota/period，发布辅助程序成功创建并核验 `docker-container` builder：

- Docker HostConfig：`CpuPeriod=100000`、`CpuQuota=100000`。
- 构建器 cgroup `cpu.max`：`100000 100000`。
- 实际 `/etc/buildkit/buildkitd.toml`：`[worker.oci] max-parallelism=1`。
- 在一个 Dockerfile `RUN` 中启动两个 `yes` 计算进程，持续 20 秒。稳定负载的 Docker CPU 样本约 98%–101%，合计约 1 个核心；Docker 的单核 100% 不等于两核宿主机总量 100%。
- 未额外传 `--load` 的构建结果成功载入本机镜像仓库，随后一次性容器运行成功，验证 `default-load=true`。
- 使用独立 Compose 项目同时请求 app/admin 两个计算探针镜像，显式传入同一 builder。两段 12 秒计算按 OCI 并行度限制依次执行，稳定 CPU 样本约 98%–100%；两个镜像均自动加载并成功运行。
- 真实修改测试构建器配额为 0.5 CPU 后，辅助程序识别实际配额漂移并拒绝构建；恢复后核验通过。只检查模式未重启构建器，默认 builder 选择保持原样。

本地 Docker Hub 网络不可达，因此实测使用从 **Moby 官方 GitHub v0.30.0 Linux ARM64 发布包**提取的 BuildKit 二进制，配合隔离 VM 的最小公共运行文件制作测试镜像；未配置第三方镜像源。生产脚本仍使用 Docker Buildx 的官方默认 BuildKit 镜像。本轮没有完成生产 Dockerfile 的完整 Linux 镜像构建，生产应用构建证据来自本机 `pnpm build`；以上计算探针用于验证真实嵌套构建进程的 CPU 限制与镜像加载。

## 使用边界

更新脚本后，新构建默认受限；已经运行的旧构建、宿主机直接执行的 `pnpm build`、其他 builder，以及构建器 cgroup 之外的 Docker daemon 工作不受此额度追溯限制。CPU 限制不会降低内存需求，也不能据此认定此前 `Collecting build traces` 长耗时的根因已经消除。首次下载 BuildKit 和建立独立缓存，以及 CPU 限速本身，都可能使首次部署耗时增加。
