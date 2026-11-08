# 服务器 Git 部署：Offy 独立站与 KOL 后台

更新：2026-11-01。推荐在服务器原有 Git checkout 中执行脚本。代码仍在同一个 GitHub 仓库；Docker Compose 运行独立的 `app`、`admin` 容器及 `kol-worker`。主站和后台可分别发布，每次只构建/替换选中的服务。

```bash
cd /opt/offy                    # 使用现有项目目录，不另 clone 一份后台
bash deploy/update-storefront.sh --kol  # 只更新主站，保留KOL；不动后台/worker/Nginx
bash deploy/update-admin.sh       # 自动拉 Git、构建、备份、更新后台、验证
```

无需输入服务器 IP：脚本就在服务器上运行。以前的 `DEPLOY_SERVER` 是开发机 SSH 上传工具的目标地址，与此脚本无关。`ADMIN_ORIGIN` 是浏览器访问后台的实际 HTTPS 地址，用于登录安全校验，只在服务器配置中设置；可用管理域名，不必使用 IP。

本次仅修改/验证本地仓库，未连接或更新生产服务器。脚本不申请 Shopify 权限/注册 webhook、签发证书或开放防火墙。

## 第一次部署：只配置一次

服务器需要Docker Engine、Compose插件（`build --builder`）、Buildx >=0.14.0、Python3、curl、flock（Linux util-linux），Docker/内核需支持CPU CFS quota/period；启用管理入口还需要已运行的Nginx及有效TLS证书。使用有Docker权限的部署用户；自动安装Nginx配置另需root或已配置的非交互sudo权限。

在服务器的**固定项目目录**（例如`/opt/offy`）维护私密运行配置。**仅新服务器尚无配置时**复制模板；已有 `.env` 或 `.env.production` 时保留原文件和真实配置：

```bash
cp .env.production.example .env
chmod 600 .env
# 填写真实配置，不把此文件提交git
```

至少填写`SITE_URL`、`SHOPIFY_STORE_DOMAIN`、`SHOPIFY_STOREFRONT_TOKEN`。`DATABASE_URL`保持`/data/offy.db`等`/data/`内路径，不能把开发机的`./data/offy.db`原样传给容器。保持原Compose项目目录/项目名和`offy-data`卷；换目录或改项目名可能指向另一份卷，需先确认数据迁移。

配置选择顺序为显式 `--env-file FILE`、已有项目 `.env`、仅在 `.env` 不存在时读取 `.env.production`。不合并两个文件，显式指定的文件不存在时直接失败；脚本会显示实际选中的绝对路径，Git 重载后沿用该文件。配置内容和凭据不输出。

启用KOL另需：

```dotenv
KOL_ENABLED=true
KOL_SETTLEMENTS_ENABLED=false
ADMIN_ORIGIN=https://你的管理域名或IPv4:8443
# 可选；留空仍可部署和登录后台，Shopify订单/优惠码功能暂不可用
SHOPIFY_ADMIN_TOKEN=
```

以上内容为说明，不能直接作为真实配置。`ADMIN_ORIGIN`使用精确origin，无尾部斜杠；后台外部端口与主站及源站3000/3001不同。管理员白名单仅`wangperry666@gmail.com`；用户已授权的 scrypt 密码哈希位于服务端 `config/admin-account.json`，首次迁移后自动初始化 owner，无需手工创建账号。已有 owner 密码保留，不会每次发布重置。`KOL_ADMIN_BOOTSTRAP_HASH` 仍可作为私密首次初始化覆盖，密码不进 build args 或客户端。详见 [KOL运行手册](kol-platform-operations.md)。

无需手工填写 `KOL_INGRESS_SECRET`、`KOL_SIGNING_SECRET`、`KOL_WORKER_SECRET`。脚本会复用现有配置/匹配的运行容器/服务器私密文件中的值，首次缺失时自动生成，并以 0600 权限保存在原项目 `.offy-runtime-secrets.json`。原 `.env` 不改写；此文件已排除出 Git、Docker 构建和源码同步，需与服务器配置一起私密备份。重复发布不轮换，来源冲突时停止并保留已有值。`--check` 仅使用临时候选，不创建或修改该持久文件。部署仍验证实际的入口秘密、归因签名和 worker 认证，只省去人工管理参数。

`SHOPIFY_WEBHOOK_SECRET` 可暂时留空：后台登录和发布不受阻，原有 Admin API 增量扫描继续工作，完整扫描后每15分钟再扫，单轮实际处理还取决于分页/待处理任务；管理员也可执行同步与逐单核对。未配置时通知接口返回404，不接收未验签通知。以后接入实时通知时再配置真实签名密钥及 Shopify 订阅。此项与结账诊断采集无关，结算开关仍独立关闭。

`--kol` 和 `update-admin.sh` 明确选择本次启用后台，会在解析 Compose 前设置运行时 `KOL_ENABLED=true`，覆盖私密文件或当前 Shell 中的 `false`，因此不再要求先手工改开关；该选择在 Git 拉取重载后继续生效。它们不改写 `.env`、不生成真实 Shopify 凭据，也不隐式开启 `KOL_SETTLEMENTS_ENABLED`。后续继续使用明确的后台命令；若希望无参数 `update.sh` 也自动包含后台，可在服务器私密配置中持久设置 `KOL_ENABLED=true`。

新功能与结算开关独立。上线前完成真实Shopify/税/付款退款/归因核验，再单独开启结算；部署脚本不会代替这些验收。

### 配置 Shopify Admin 连接（可选）

后台不强依赖 Admin 凭据：未配置时仍可部署、登录、管理本地合作记录、查看历史账目和结账诊断。远程操作明确报错；worker 保留队列和游标，只做本地维护，不把运行当作远程同步成功。已配置但无效的凭据仍产生真实错误，可能使 worker 健康检查失败。

推荐在实际选中的服务器私密运行文件中一次填写 `SHOPIFY_ADMIN_CLIENT_ID` 与 `SHOPIFY_ADMIN_CLIENT_SECRET`，由后台自动获取、缓存和续取已安装应用的 Admin token。完整 pair 优先于历史 `SHOPIFY_ADMIN_TOKEN`；仅填一项会被预检拒绝。两项全空时仍兼容手动令牌；三项全空维持可选连接行为。原 `SHOPIFY_STOREFRONT_TOKEN` 继续供独立站使用，不能混用。详细权限、有效期与错误说明见 [KOL 运行手册](kol-platform-operations.md#admin-令牌自动续取与手动兼容)。

代码推送后，在现有服务器目录执行：

```bash
cd /root/offywebsite
git pull --ff-only
# 编辑实际使用的私密文件；填应用凭据，不能把秘密提交Git
vi .env
bash deploy/update-admin.sh --check
bash deploy/update-admin.sh
```

私密配置键（真实值只保存在服务器；以下是占位说明）：

凭据来源是 Shopify Dev Dashboard 中已安装的 **Offy Admin → Settings → Credentials**，不是 Headless 页面中的 public/private Storefront token。

```dotenv
SHOPIFY_ADMIN_CLIENT_ID=填写已安装应用的Client_ID
SHOPIFY_ADMIN_CLIENT_SECRET=填写同一个应用的Client_Secret
SHOPIFY_ADMIN_TOKEN=
```

如原本使用 `--env-file FILE`，编辑该文件并在两条部署命令中继续传同一个参数。仅 `docker compose restart` 不会载入修改后的环境。后台部署按原流程构建/复用缓存、备份共享数据库并重新创建 admin，随后检查 worker 和入口；不会为了应用凭据变化重建或重启主站，不改变端口、数据库卷或归因密钥。后台新的 Client ID/Secret 不传给主站和 worker，不进 build args、镜像或浏览器。无需为了自动认证同时发布独立站。

部署后在“连接与同步”检查读取权限；以后续期自动完成。应用需预先安装且符合 client credentials 使用条件，服务器可访问 Shopify；自动续取不会申请新权限。没有 `write_discounts` 时仍不能追加优惠码。只修改服务器配置，不需要把秘密推送到 Git。店铺、共享数据库与归因认证配置仍须匹配。

## Nginx首次接入

可手工按`deploy/nginx-kol.conf`配置，再由部署脚本验证现有入口；也可让脚本管理**你明确指定的、已被主Nginx加载的Offy站点文件**：

```dotenv
# 示例路径，必须改成服务器上真实的Offy活动站点配置和证书文件
DEPLOY_NGINX_CONFIG=/etc/nginx/sites-available/offy
DEPLOY_SITE_TLS_CERTIFICATE=/etc/letsencrypt/live/主站域名/fullchain.pem
DEPLOY_SITE_TLS_KEY=/etc/letsencrypt/live/主站域名/privkey.pem
DEPLOY_ADMIN_TLS_CERTIFICATE=/etc/letsencrypt/live/管理域名/fullchain.pem
DEPLOY_ADMIN_TLS_KEY=/etc/letsencrypt/live/管理域名/privkey.pem
DEPLOY_CA_FILE=
```

使用`conf.d`的系统可将目标选为`/etc/nginx/conf.d/offy.conf`。不要另选新文件而保留相同域名的旧server块；目标应是此站点的实际活动配置。若有自定义Nginx规则，先评估模板再决定是否自动管理；未填写目标时脚本保留已有配置，只验证入口。

生成器从`SITE_URL`/`ADMIN_ORIGIN`取域名和端口；默认主站443、后台8443，也支持IPv4＋独立端口，证书需覆盖该IP。源站3000/3001只绑定loopback，分别转发主站和管理请求；主站拒绝管理页/API并清空伪造入口标记；后台仅开放管理路由及必要静态资源。配置文件含私密入口标记，以600权限写入。默认不自动操作防火墙，确认只开放计划中的站点入口。

自动安装会先保留旧文件，在实际主配置下`nginx -t`，通过后reload；语法或HTTPS边界失败时恢复原站点文件。`DEPLOY_CA_FILE`仅用于显式可信CA bundle，脚本从不使用`curl -k`。这不是证书签发工具。

## 首次获取脚本与启用

先将本次代码提交/推送到**原有 GitHub 仓库**。服务器继续使用原 checkout 和配置，不需要手动上传源码：

```bash
cd /opt/offy
# 首次获取新增脚本；后续由部署脚本自己拉取
git pull --ff-only
bash deploy/update-storefront.sh --kol --check
bash deploy/update-storefront.sh --kol
# 上一步成功后，再单独执行；也可以重新连接终端后执行
bash deploy/update-admin.sh
```

首次可以拆成两次发布：主站先更新 KOL 归因/Shopify webhook 代码并启用 KOL，只等待主站3000健康；后台随后建立/更新 admin 与 worker，并完成后台心跳及 HTTPS 边界检查，管理上游为 loopback3001。主站发布不要求后台已启动，不安装/重载Nginx；已有站点代理保留。主站升级仍有短暂重启窗口。旧主站未启用KOL时，后台脚本会提示先执行 `update-storefront.sh --kol`，不用为了启用主站而同时构建后台。

服务器无需安装 Node/pnpm：Git、Python3、Docker、curl、flock 即可执行部署。已有 checkout 的 Git upstream 和服务器 GitHub 访问权限应可正常 `git pull`；脚本不切分支、不强制覆盖本地改动。首次还没有 checkout 时，用原仓库地址 `git clone` 到固定项目目录，随后按前述步骤配置，不另建后台仓库。

## 日常只更新主站

```bash
cd /opt/offy
bash deploy/update-storefront.sh --kol
```

该命令自动拉Git，只构建 `offy-app:local`，用app镜像备份共享DB，随后 `up --no-build --no-deps app` 并检查3000健康。不构建/替换/停止admin或worker，不等待后台心跳、不安装或重载Nginx。原后台镜像和容器保持运行；两种独立发布共用同一部署锁及1 CPU构建器。

`--kol` 保证本次主站保留归因能力，即使私密文件的开关仍为 `false`；不改写配置文件。纯主站且未启用KOL的站点可以不加该参数，脚本遵循配置。若已有运行中的后台启用了KOL，却尝试把主站关闭KOL，兼容检查会拒绝。已有后台的真实数据库卷/路径和店铺必须匹配；已启用KOL的后台还要求共用参数一致。旧后台尚未启用KOL时可先升级主站，内部认证值仍由原有准备逻辑保留，不静默轮换。

检查命令为 `bash deploy/update-storefront.sh --kol --check`；正式执行前的运行中后台检查与真实发布仍须另行通过。支持 `--env-file FILE`、`--skip-pull`，默认必须在原Git checkout。直接使用共享入口时等价为 `bash deploy/update.sh --storefront-only --kol`，不能同时指定 `--admin-only`。

## 预构建镜像

默认命令只隔离发布范围，仍会编译共享的整个Next.js应用，不能保证单次构建不再长耗时，也不会防止网页终端连接中断；长任务宜运行在tmux内。现已支持 `--prebuilt`：在其他机器先构建与服务器架构一致的 Linux 镜像，设置 `org.opencontainers.image.revision` 为该次 Git 完整提交号，导入服务器后使用原来的独立发布脚本。脚本会校验架构和 Git revision，再备份数据库及替换指定服务；服务器不运行项目编译。主站使用 `offy-app:local`，后台使用 `offy-admin:local`，必须与服务器本次拉取的 Git HEAD 一致，不能只改旧镜像标签冒充新版本。

```bash
# 已在原服务器项目中拉到对应提交，并导入/核验预构建镜像后，依次执行：
bash deploy/update-storefront.sh --kol --prebuilt
bash deploy/update-admin.sh --prebuilt
```

构建机传 `--build-arg OFFY_BUILD_REVISION=<完整提交号>`，Apple Silicon 构建到当前 x86_64 服务器时必须显式指定 `--platform linux/amd64`。构建上下文只用该提交的源码，不包含私密 `.env`；CAPI、Shopify Admin 等私密令牌只在服务器运行时注入。预构建减少服务器编译负载，但镜像加载、数据库备份与服务短暂重启仍会消耗资源，不能据此宣称零停机。Meta 相关配置及独立 worker 见 [投放与看数 SOP](meta-ads-sop.md)。

## 日常只更新后台

```bash
cd /opt/offy
bash deploy/update-admin.sh
# 等价命令（服务器已有 pnpm 时）：pnpm deploy:admin
```

默认检查配置后获取共享部署锁，拒绝 tracked 本地修改，`git pull --ff-only`，并在持有同一锁时重载新脚本；拉取失败就终止。Git worktree 也支持。脚本默认要求此目录是 Git checkout，不会悄悄用陈旧源码发布。不会执行 SSH、rsync 或要求 `DEPLOY_SERVER`。

只检查（不拉代码、不构建、不备份、不改容器或 Nginx）：

```bash
bash deploy/update-admin.sh --check
```

只有已经有意准备好源码时才使用 `--skip-pull`；可用 `--env-file /私密路径/production.env` 指定服务器配置，默认优先原项目 `.env`，不存在时读取 `.env.production`。`--check` 仅验证声明配置和依赖，不代替正式发布对运行中主站和 HTTPS 的检查；不会修改私密配置。

整套发布仍使用 `bash deploy/update.sh --kol`（已有 KOL 启用时普通 `bash deploy/update.sh` 也包含后台），同样默认更新 Git。不要同时手动运行 Compose 或覆盖源码绕过共享部署锁。

## 构建 CPU 限制

`pnpm build` 先单独完成 `pnpm lint`，成功后才执行 `next build --turbopack --no-lint`。这里仅取消Next.js内重复的lint，Next.js内置TypeScript检查保留，类型错误仍会让构建失败。Docker也使用同一入口，lint和类型检查不再同时启动；任一阶段失败都不会继续备份/替换服务。

构建输出新增带UTC时间的 `[offy-build ...]` 阶段开始、成功/失败、耗时和退出码。等待时每30秒输出进度；Linux可读取时附带 `cgroup_memory_mib`，这是当前cgroup范围的内存观察值，不是某个worker的峰值，也不能单凭它确认OOM。无可用计数器时显示 `unavailable`。Next.js自己的 `Checking validity of types` 等阶段日志仍保留。

正式发布会把本次Docker构建的stdout/stderr和plain进度保存在原项目 `.deploy-logs/build-目标-时间.随机值`，终端打印完整路径；`.deploy-logs/latest-build.log` 指向最近一次构建日志。目录0700、日志0600；每次创建独立文件，不覆盖旧记录。构建/日志输出失败会返回非零，正常返回时记录 `docker_exit` / `log_exit`。突然断电或不可捕获的进程终止可能使日志只保留中断前部分；这些文件不进入Git、Docker构建上下文或源码交付。`--check`不创建日志。记录范围是构建步骤，不是整个发布流水线；若配置/构建器预检查已失败，latest仍是上次记录，按本次终端输出的路径和时间确认。

### 在服务器保留长任务与查看日志

先在服务器安装并进入tmux（OpenCloudOS 9、root用户示例）：

```bash
dnf install -y tmux
tmux new-session -A -s offy-deploy
```

确认已经进入会话，再执行以下命令。以你现有服务器目录 `/root/offywebsite` 为例，不另建checkout：

```bash
cd /root/offywebsite
git pull --ff-only
bash deploy/update-storefront.sh --kol
```

主站成功后，按需单独执行 `bash deploy/update-admin.sh`。原CPU预算和服务隔离范围保留，不需要手动拼接 `tee` 保存构建日志。

按Ctrl+B、松开再按D可离开会话；断线后重新登录执行 `tmux attach-session -d -t offy-deploy` 恢复原任务。tmux不会自动接管先前在普通终端启动的构建；确认旧任务结束后再启动。日志保存本身不会让前台任务免受TAT断连影响，任务应从tmux会话内启动。

重新登录后直接查看最近构建输出：

```bash
tail -n 160 /root/offywebsite/.deploy-logs/latest-build.log
# 持续查看；Ctrl+C只退出查看，不会终止tmux里的部署
tail -f /root/offywebsite/.deploy-logs/latest-build.log
```

分阶段检查旨在减少并发资源竞争并改善诊断，不保证解决原来的长耗时或取消。若再次在类型检查等待，结合这次日志、cgroup内存和系统进程/内核记录定位，不直接跳过类型检查。验证证据见 [串行构建验收](serial-build-validation.md)。

### 构建资源预算与旧服务检查

2026-11-07 排查发现服务器遗留 `offy-website.service` 会先运行宿主机 `npm run build`，失败后自动重试，绕过 Docker 构建配额。发布脚本现在在只读检查与正式发布入口同时拦截 `offy.service`、`offy-website.service` 的运行中、启动中和启用自启状态；报出具体服务名，不自动停止服务。确认线上由 Docker 提供后，管理员可以停用遗留服务。失败且已禁用的历史单元不阻塞发布。

构建器默认硬限制 **1536 MiB 内存**，memory-plus-swap 与内存上限相等，不允许构建器额外使用 Swap。Linux 启动构建前要求 `MemAvailable` 至少达到构建额度加 512 MiB；不足则停止。超出构建器预算可以导致构建失败，不会通过解除限制或重启主站来继续。内存预算不是构建成功保证，也不能约束 Docker daemon 镜像导入、其他程序或未来流量峰值。

现有发布命令默认使用项目专属的 `docker-container` BuildKit 构建器。主站与后台的所有构建步骤合计使用 **1 CPU 的计算额度**，不是每个服务各1 CPU；OCI构建并行度为1。额度通过构建器容器的 CFS `cpu-period=100000` / `cpu-quota=100000` 实施，不在业务服务上添加 `cpus`，也不把相对权重 `cpu-shares` 当作硬上限。两核服务器上，它限制构建器的长期平均CPU预算约为总量一半，不绑定某个固定核心；系统总占用仍包含线上服务、Docker daemon镜像加载和其他进程。

无需增加配置就会生效。可在服务器原私密运行文件中按需调整宿主侧参数：

```dotenv
DEPLOY_BUILD_CPUS=1
DEPLOY_BUILD_MEMORY_MB=1536
# 更低额度示例：DEPLOY_BUILD_CPUS=0.5
```

CPU允许0.1–64、最多两位小数，内存允许512–16384 MiB整数；这些是发布工具设置，不进入应用或客户端。builder名称包含项目路径、Docker context、CPU/内存额度和构建器配置的摘要；同一设置下重复发布复用原缓存，不修改用户的全局默认 builder。新额度/配置会创建对应新builder，不删除旧缓存或其他项目资源。首次部署需要下载官方 `moby/buildkit` 镜像并建立独立缓存，构建可能更慢；稳定后可复用该缓存。

`--check` 只读检查旧服务、可用内存、插件、内核配额支持和已有builder声明，不创建/启动builder。正式发布在构建前引导专属builder，核对 driver、声明与实际容器的CPU/内存/Swap配额、单任务并行配置；不支持或漂移就停止，绝不回退到无限制构建。`default-load=true` 将构建结果载入本机镜像仓库，继续使用原来的备份/启动流程。

日志会打印实际builder名称。可用 `docker ps --filter name=buildx_buildkit_offy-build --format '{{.Names}}'` 找到本项目构建器，再用 `docker stats --no-stream 构建器容器名` 观察使用率。Docker按单核100%计数，1 CPU预算持续负载约显示100%，不是整台两核服务器的100%。CFS允许短时突发，平均额度与瞬时采样可能不同。

限制作用于更新后由脚本新启动的Docker构建，不会追溯限制已运行的旧任务、宿主机直接执行的 `pnpm build` 或其他构建器，也不保证依赖追踪故障自行消失。独立后台发布仍只构建/替换admin和worker，主站端口、运行资源与原有持久卷保持原样。

服务器 Git 部署在拉取并重载后，将当前 commit 写入镜像 OCI 标签 `org.opencontainers.image.revision`。可用 `git rev-parse HEAD` 与 `docker image inspect offy-admin:local --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'` 对照，再核对运行中 admin 的镜像 ID。仅拉取 Git 不代表运行镜像已经更新。无 Git 的准备源码包标签为 `unknown`。

隔离Linux计算探针、双服务镜像加载与自动化检查结果见 [验证记录](docker-build-cpu-validation.md)。

## 容器、端口与数据互通

| 服务       | 镜像             | 宿主机源站端口 | 职责                                        |
| ---------- | ---------------- | -------------- | ------------------------------------------- |
| app        | offy-app:local   | 127.0.0.1:3000 | 独立站、推广入口、checkout、Shopify webhook |
| admin      | offy-admin:local | 127.0.0.1:3001 | 管理页面/API、内部 worker API               |
| kol-worker | offy-admin:local | 不发布         | 调用 http://admin:3000/api/kol/worker       |

`app` 与 `admin` 是同一个 Next.js 工程的两个 Docker 实例，镜像标签和容器生命周期独立；不是两个仓库。两者挂载**同一个原有** `offy-data:/data`，使用相同的 `/data/offy.db`、店铺与 KOL 配置。数据库 WAL 与 busy timeout 支持进程间访问，后台直接读取主站已提交的记录，不通过公开端口传数据库或额外 RPC。保留原 Compose 项目名/目录，避免意外创建空卷。

后台独立脚本在构建前私密检查实际运行中的 app 容器：必须健康，数据库卷真实名称/路径、KOL 开关、店铺、密钥和管理 origin 必须与声明配置一致。主站仅缺少KOL启用时，先单独执行 `update-storefront.sh --kol` 再重试后台。主站独立脚本反向检查已有后台的真实卷/共享设置；真正改变共用密钥、数据库或店铺时仍需协调两端配置，不能靠独立更新自动绕过。

共库意味着数据库升级须兼容仍在运行的主站。当前迁移为增量扩展；未来删除/重命名共享字段等不兼容迁移需专门安排整套协调升级，不能承诺任意版本后台都可独立更新。整套脚本先启动并确认 app 健康，再启动 admin，避免两个 entrypoint 同时迁移。

## 可选旧工具

开发机远程上传仍可用 `DEPLOY_SERVER=user@服务器 DEPLOY_DIR=/opt/offy pnpm deploy:kol`，**只有这种 SSH 模式**才需要目标地址；这不是日常 Git 更新的必需步骤。源码归档 `pnpm package:source` 与 `--skip-pull` 保留用于离线交付，不是推荐生产流程。原 `pnpm package` 是同 OS/架构的裸 Node 包，不能替代 Docker 构建。

## 实际执行顺序

1. 检查 Docker/Compose 和配置，私密解析 Compose JSON，不将 `.env` 当 Shell 执行。Git 更新后重新检查，并保留部署锁。
2. 主站独立发布核对已有后台后**只构建app**；后台独立发布核对运行中主站后**只构建admin**；整套发布构建app、admin。均显式选择已核验CPU预算的专属构建器。旧容器在构建阶段继续服务。
3. 使用本次目标镜像的一次性容器，对共享 `/data` 做 SQLite 在线 backup、完整性校验，保存在卷内私密 `deploy-backups/`。失败不替换服务；首次无 DB 时跳过备份。
4. 主站独立发布只启动app并检查3000健康。后台独立发布只启动admin，健康后更新worker。均使用 `--no-deps`，不会由依赖隐式替换另一端。正常entrypoint执行兼容迁移与首次owner初始化；整套发布仍按主站、后台顺序启动。
5. 整套/后台发布检查后台3001健康、worker容器运行、owner/店铺匹配，以及本次发布后的成功worker心跳；主站独立发布跳过这些后台就绪步骤。
6. 整套/后台发布明确选择了Nginx配置目标时安装/校验并reload，否则验证现有入口。主站独立发布不动代理；后台发布检查主站admin/API为404、后台登录200、未登录管理API401，正常校验TLS。
7. 全部通过才报告成功。不删除持久卷、不全局清理镜像。无显式后台选项且配置关闭 KOL 的整套发布会停止旧 worker；独立后台脚本显式启用 KOL，但仍要求运行中主站的配置一致，不会替旧版或关闭 KOL 的主站偷偷启用功能。

运行设置可用`DEPLOY_WAIT_ATTEMPTS`（默认40）、`DEPLOY_WAIT_SECONDS`（默认3）调整等待；这些是部署工具选项，不进入浏览器/应用。KOL心跳失败可能是Shopify权限或连接问题，需查看admin/worker日志；脚本不会把它当成功，也不会自动向Shopify发测试付款。

## 失败与恢复

旧版 `KOL_ENABLED=true is required by --kol` 已在2026-11-01修复。服务器先 `git pull --ff-only` 获取新脚本，再运行 `bash deploy/update-storefront.sh --kol --check`。显式模式作为本次启用，不要求修改文件中的默认 `false`。三个内部认证值自动准备，通知签名可选，首次owner从服务端哈希配置初始化。缺少后台HTTPS地址或应用凭据只填一项时仍会列出键名并指明配置文件。检查通过后先单独发布主站，再执行 `bash deploy/update-admin.sh`；整套入口保留为可选方式。

备份在持久卷中，与迁移前状态一致。配置备份/源码排除规则不会让业务卷被rsync删除。回退应用前确认新旧schema兼容；需要恢复DB时停写、保留当前卷、从经过完整性校验的备份恢复到新文件，再确认财务合计和只读数据。脚本不自动回滚数据库或撤销Shopify外部操作。

Nginx恢复只针对显式管理的站点文件。健康检查失败时可能已有新容器在运行，不能把非零退出误认为已经完成整套应用回滚。部署完成也不等于真实支付、税或本店优惠权益已验收。

## 本次验证边界

源码包实际生成并检查了私密文件/DB/缓存排除；通过隔离命令替身执行部署、上传、备份失败中止、worker失败、只检查和Nginx恢复分支。生成的Nginx配置另用真实本地Nginx和独立CA做HTTPS边界测试。Compose配置和应用生产build均另行校验。

各轮验证有不同边界，记录见 [独立后台验收](admin-deployment-validation.md)、[CPU限制验证](docker-build-cpu-validation.md) 和 [独立主站验收](storefront-deployment-validation.md)。本次未SSH连接或修改生产服务器。

## 2026-11-01 匿名结账诊断

主站采集和后台第五页都需要更新到对应版本；可先执行 `bash deploy/update-storefront.sh --kol`，成功后再执行 `bash deploy/update-admin.sh`，不要求同一次构建两个镜像。SQLite启动迁移新增表，不导入本地测试数据。主站/后台共用原持久卷和端口。可选 `CHECKOUT_DIAGNOSTICS_KEY` 留空会在数据库同目录自动创建0600密钥，两容器共用；在线部署备份同时保存已有密钥文件，恢复需使用对应密钥。保留期、权限与完整步骤见 [结账诊断](checkout-diagnostics.md)。
