# 独立后台 Git 部署验收

日期：2026-11-01。只在本地工作区和隔离临时目录验证，没有连接或更新生产服务器。

## 设计与实现

- 同 GitHub 仓库、同服务器固定 checkout、同 Compose 项目及原命名卷。新增 `deploy/update-admin.sh`，默认 fast-forward pull，无 SSH/IP 输入和源码上传。
- app/admin 独立镜像和容器，宿主 loopback3000/3001；worker 复用 admin 镜像并调用 Docker 内网 admin。
- admin-only 不构建/替换/停止 app。共享部署锁跨 Git 更新重载；拒绝 tracked 编辑与 Git 失败；备份先于服务替换。
- 独立发布前私密检查运行中 app 的健康、配置及真实挂载卷；共用配置改变需先整套更新。共库迁移必须兼容现有主站；整套发布顺序启动，避免同时启动迁移。

## 隔离验证

- 真实本地 Git bare upstream + 第二 checkout：推送新部署脚本，发布端自动 pull 并执行新版代码，重载后仍只更新 admin；tracked 修改与不可达 upstream 在构建前失败。未访问 GitHub 或生产。
- Docker/HTTP 命令替身记录实际部署调用：只构建 admin，使用 admin 一次性容器备份，再 `--no-deps` 启动 admin、worker；就绪检查运行在 admin。独立发布所有容器变更命令均无 app。
- 配置用例拒绝不同 DB 路径/卷、店铺、签名密钥、公开源站端口、与主站重复的镜像标签，以及运行中主站设置漂移；错误仅输出配置键名。
- 真实 Docker Compose CLI 解析生产 YAML，确认锚点继承后的环境/卷一致、镜像独立、worker 仅依赖 admin，源站端口只绑定 loopback。
- 真实本地 Nginx 测试生成的配置：独立 CA 正常 TLS 校验，13 项入口边界与正式入口探针通过，不改系统配置。生成配置的主站/后台分别指向3000/3001；此项运行时将两上游映射到既有隔离 Next 测试应用，不冒充两容器实测。

## 验证结果与边界

全量84文件、535项测试通过，其中22项部署专项；类型检查、ESLint、生产standalone build、Bash/Python语法与OpenSpec校验通过。首轮全量测试与构建并行时，本地Git集成用例超过单测默认5秒；该真实Git多进程集成项改用60秒时限，随后重跑全量全部通过。Docker CLI 可用，但本机 daemon 未运行；未实测 Linux Docker 镜像构建、两容器启动、Linux flock 互斥和目标服务器证书/防火墙。首次正式发布需按 [部署手册](deployment.md) 配置，再执行完整流水线；不能把本地命令替身测试视为生产部署成功。
