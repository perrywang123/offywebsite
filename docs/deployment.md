# 服务器 Git 部署：Offy 独立站与 KOL 后台

更新：2026-11-01。推荐在服务器原有 Git checkout 中执行脚本。代码仍在同一个 GitHub 仓库；Docker Compose 运行独立的 `app`、`admin` 容器及 `kol-worker`。后台独立发布只替换 `admin` 和 worker，不重启主站。

```bash
cd /opt/offy                    # 使用现有项目目录，不另 clone 一份后台
bash deploy/update-admin.sh       # 自动拉 Git、构建、备份、更新后台、验证
```

无需输入服务器 IP：脚本就在服务器上运行。以前的 `DEPLOY_SERVER` 是开发机 SSH 上传工具的目标地址，与此脚本无关。`ADMIN_ORIGIN` 是浏览器访问后台的实际 HTTPS 地址，用于登录安全校验，只在服务器配置中设置；可用管理域名，不必使用 IP。

本次仅修改/验证本地仓库，未连接或更新生产服务器。脚本不申请 Shopify 权限/注册 webhook、签发证书或开放防火墙。

## 第一次部署：只配置一次

服务器需要Docker Engine、Compose插件、Python3、curl、flock（Linux util-linux）；启用管理入口还需要已运行的Nginx及有效TLS证书。使用有Docker权限的部署用户；自动安装Nginx配置另需root或已配置的非交互sudo权限。

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
SHOPIFY_ADMIN_TOKEN=实际服务端Admin令牌
```

以上内容为说明，不能直接作为真实配置。`ADMIN_ORIGIN`使用精确origin，无尾部斜杠；后台外部端口与主站及源站3000/3001不同。管理员白名单仅`wangperry666@gmail.com`；用户已授权的 scrypt 密码哈希位于服务端 `config/admin-account.json`，首次迁移后自动初始化 owner，无需手工创建账号。已有 owner 密码保留，不会每次发布重置。`KOL_ADMIN_BOOTSTRAP_HASH` 仍可作为私密首次初始化覆盖，密码不进 build args 或客户端。详见 [KOL运行手册](kol-platform-operations.md)。

无需手工填写 `KOL_INGRESS_SECRET`、`KOL_SIGNING_SECRET`、`KOL_WORKER_SECRET`。脚本会复用现有配置/匹配的运行容器/服务器私密文件中的值，首次缺失时自动生成，并以 0600 权限保存在原项目 `.offy-runtime-secrets.json`。原 `.env` 不改写；此文件已排除出 Git、Docker 构建和源码同步，需与服务器配置一起私密备份。重复发布不轮换，来源冲突时停止并保留已有值。`--check` 仅使用临时候选，不创建或修改该持久文件。部署仍验证实际的入口秘密、归因签名和 worker 认证，只省去人工管理参数。

`SHOPIFY_WEBHOOK_SECRET` 可暂时留空：后台登录和发布不受阻，原有 Admin API 增量扫描继续工作，完整扫描后每15分钟再扫，单轮实际处理还取决于分页/待处理任务；管理员也可执行同步与逐单核对。未配置时通知接口返回404，不接收未验签通知。以后接入实时通知时再配置真实签名密钥及 Shopify 订阅。此项与结账诊断采集无关，结算开关仍独立关闭。

`--kol` 和 `update-admin.sh` 明确选择本次启用后台，会在解析 Compose 前设置运行时 `KOL_ENABLED=true`，覆盖私密文件或当前 Shell 中的 `false`，因此不再要求先手工改开关；该选择在 Git 拉取重载后继续生效。它们不改写 `.env`、不生成真实 Shopify 凭据，也不隐式开启 `KOL_SETTLEMENTS_ENABLED`。后续继续使用明确的后台命令；若希望无参数 `update.sh` 也自动包含后台，可在服务器私密配置中持久设置 `KOL_ENABLED=true`。

新功能与结算开关独立。上线前完成真实Shopify/税/付款退款/归因核验，再单独开启结算；部署脚本不会代替这些验收。

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
bash deploy/update.sh --kol --check
bash deploy/update.sh --kol
```

首次整套发布将 KOL 归因/Shopify webhook 代码更新到主站，并建立独立后台容器，Nginx 管理上游切换到 loopback3001。主站升级会有短暂重启窗口；后续兼容的后台更新才使用独立脚本。不能只启动后台就让尚未改造的旧主站自动拥有 KOL 归因能力。

服务器无需安装 Node/pnpm：Git、Python3、Docker、curl、flock 即可执行部署。已有 checkout 的 Git upstream 和服务器 GitHub 访问权限应可正常 `git pull`；脚本不切分支、不强制覆盖本地改动。首次还没有 checkout 时，用原仓库地址 `git clone` 到固定项目目录，随后按前述步骤配置，不另建后台仓库。

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

## 容器、端口与数据互通

| 服务       | 镜像             | 宿主机源站端口 | 职责                                        |
| ---------- | ---------------- | -------------- | ------------------------------------------- |
| app        | offy-app:local   | 127.0.0.1:3000 | 独立站、推广入口、checkout、Shopify webhook |
| admin      | offy-admin:local | 127.0.0.1:3001 | 管理页面/API、内部 worker API               |
| kol-worker | offy-admin:local | 不发布         | 调用 http://admin:3000/api/kol/worker       |

`app` 与 `admin` 是同一个 Next.js 工程的两个 Docker 实例，镜像标签和容器生命周期独立；不是两个仓库。两者挂载**同一个原有** `offy-data:/data`，使用相同的 `/data/offy.db`、店铺与 KOL 配置。数据库 WAL 与 busy timeout 支持进程间访问，后台直接读取主站已提交的记录，不通过公开端口传数据库或额外 RPC。保留原 Compose 项目名/目录，避免意外创建空卷。

独立脚本在构建前私密检查实际运行中的 app 容器：必须健康，数据库卷真实名称/路径、KOL 开关、店铺、密钥和管理 origin 必须与声明配置一致；不一致先执行整套发布。不要在独立后台发布时顺便轮换共用密钥或切换数据库。

共库意味着数据库升级须兼容仍在运行的主站。当前迁移为增量扩展；未来删除/重命名共享字段等不兼容迁移需专门安排整套协调升级，不能承诺任意版本后台都可独立更新。整套脚本先启动并确认 app 健康，再启动 admin，避免两个 entrypoint 同时迁移。

## 可选旧工具

开发机远程上传仍可用 `DEPLOY_SERVER=user@服务器 DEPLOY_DIR=/opt/offy pnpm deploy:kol`，**只有这种 SSH 模式**才需要目标地址；这不是日常 Git 更新的必需步骤。源码归档 `pnpm package:source` 与 `--skip-pull` 保留用于离线交付，不是推荐生产流程。原 `pnpm package` 是同 OS/架构的裸 Node 包，不能替代 Docker 构建。

## 实际执行顺序

1. 检查 Docker/Compose 和配置，私密解析 Compose JSON，不将 `.env` 当 Shell 执行。Git 更新后重新检查，并保留部署锁。
2. 独立后台发布先核对运行中主站的实际设置/卷，再**只构建 admin 镜像**；整套发布构建 app、admin。旧容器在构建阶段继续服务。
3. 使用本次目标镜像的一次性容器，对共享 `/data` 做 SQLite 在线 backup、完整性校验，保存在卷内私密 `deploy-backups/`。失败不替换服务；首次无 DB 时跳过备份。
4. 独立发布只启动 admin，健康后更新 worker；均使用 `--no-deps`，不会由依赖隐式启动/替换 app。后台 entrypoint 执行兼容迁移与首次 owner 初始化。整套发布则先启动 app 并等待健康，再按此顺序启动后台。
5. 检查后台 3001 健康、worker 容器运行、owner/店铺匹配，以及本次发布后的成功 worker 心跳。
6. 明确选择了 Nginx 配置目标时安装/校验并 reload，否则验证现有配置。共享 Nginx 的 reload 仍会执行；不会重启主站容器。检查主站 admin/API 为404、后台登录200、未登录管理API401；正常校验 TLS。
7. 全部通过才报告成功。不删除持久卷、不全局清理镜像。无显式后台选项且配置关闭 KOL 的整套发布会停止旧 worker；独立后台脚本显式启用 KOL，但仍要求运行中主站的配置一致，不会替旧版或关闭 KOL 的主站偷偷启用功能。

运行设置可用`DEPLOY_WAIT_ATTEMPTS`（默认40）、`DEPLOY_WAIT_SECONDS`（默认3）调整等待；这些是部署工具选项，不进入浏览器/应用。KOL心跳失败可能是Shopify权限或连接问题，需查看admin/worker日志；脚本不会把它当成功，也不会自动向Shopify发测试付款。

## 失败与恢复

旧版 `KOL_ENABLED=true is required by --kol` 已在 2026-11-01 修复。服务器先 `git pull --ff-only` 获取新脚本，再运行 `bash deploy/update.sh --kol --check`。新脚本将显式模式作为本次启用，不要求修改文件中的默认 `false`。三个内部认证值自动准备，通知签名可选，首次 owner 从服务端哈希配置初始化。若仍有缺失配置，会列出后台键名，并指明实际运行文件；真实 Shopify Admin token 和后台 HTTPS 地址仍须在服务器提供。检查通过后执行 `bash deploy/update.sh --kol`。

备份在持久卷中，与迁移前状态一致。配置备份/源码排除规则不会让业务卷被rsync删除。回退应用前确认新旧schema兼容；需要恢复DB时停写、保留当前卷、从经过完整性校验的备份恢复到新文件，再确认财务合计和只读数据。脚本不自动回滚数据库或撤销Shopify外部操作。

Nginx恢复只针对显式管理的站点文件。健康检查失败时可能已有新容器在运行，不能把非零退出误认为已经完成整套应用回滚。部署完成也不等于真实支付、税或本店优惠权益已验收。

## 本次验证边界

源码包实际生成并检查了私密文件/DB/缓存排除；通过隔离命令替身执行部署、上传、备份失败中止、worker失败、只检查和Nginx恢复分支。生成的Nginx配置另用真实本地Nginx和独立CA做HTTPS边界测试。Compose配置和应用生产build均另行校验。

本机Docker daemon未运行，未执行真实容器构建/启动；本轮没有SSH连接或修改生产服务器。独立 Git 后台发布的补充验证见 [独立后台验收](admin-deployment-validation.md)。前一轮记录见 [一键部署验收](deployment-validation.md)。

## 2026-11-01 匿名结账诊断

主站采集和后台第五页需一起更新，执行 `bash deploy/update.sh --kol`；SQLite 启动迁移新增表，不导入本地测试数据。主站/后台共用原持久卷和端口。可选 `CHECKOUT_DIAGNOSTICS_KEY` 留空会在数据库同目录自动创建 0600 密钥，两容器共用；在线部署备份同时保存已有密钥文件，恢复需使用对应密钥。保留期、权限与完整步骤见 [结账诊断](checkout-diagnostics.md)。
