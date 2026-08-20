# 公网部署与分享方案

> 目标：给 Offy 网站一个**公网可访问的入口**，让同事直接点开链接就能浏览本次
> dogguo 还原改造后的效果。
>
> 本文是「分享导向」的决策 + 执行手册，与 [`deployment.md`](./deployment.md)
> 的「生产运维 runbook」互补：先在这里选路线，再到那边查细节命令。

---

## 0. 现状与约束

- 应用形态：Next.js 15 standalone 输出（`next.config.ts` 里 `output: "standalone"`）。
- 数据层：**SQLite + better-sqlite3**（原生模块），数据文件需落在**持久化目录**。
  - 影响：Vercel 等「无状态 Serverless」平台不适合直接跑（文件系统临时、无常驻卷）；
    要用 Vercel 必须先切 PostgreSQL（属后续 spec 变更，见 `architecture.md`）。
- 本地开发机：macOS，当前以生产模式跑在 `http://localhost:3002`。
- 支付：`.env` 内为 Stripe **测试 key**，浏览/加购正常，真实结算会因无效 key 报错（预期）。

---

## 1. 三档方案与决策矩阵

| 维度 | 方案 A：Cloudflare 快速隧道 | 方案 B：云服务器 + Docker + 域名 | 方案 C：Fly.io / Railway 托管 |
| --- | --- | --- | --- |
| 一句话 | 把本地 :3002 瞬间变成公网 HTTPS 链接 | 自购 VPS 长期托管，自有域名 | 平台托管 Docker + 持久卷，免运维服务器 |
| 上线速度 | 分钟级 | 半天（含购机/解析/证书） | 1–2 小时 |
| 成本 | 免费 | 服务器 + 域名（约 ¥40–100/月起） | 免费额度起，超量按用量 |
| 常驻性 | ❌ 依赖本机开机 + 进程存活 | ✅ 7×24 | ✅ 7×24 |
| HTTPS | ✅ 平台自带 | 需 certbot 自签/续签 | ✅ 平台自带 |
| 自有域名 | 可选（命名隧道） | ✅ | ✅（含平台子域，或绑自有域名） |
| 数据持久 | 本机文件 | Docker volume `/data` | 平台 Volume |
| 适用场景 | **临时给同事预览、演示、验收** | **正式对外、长期运营** | **想要长期在线但不想维护服务器** |

**推荐路线**：
- 只是**尽快分享给同事看效果** → 先走 **方案 A**（本文第 2 节，现在就能执行）。
- 需要**长期稳定对外** → 走 **方案 B**（本文第 3 节，复用现有 `deploy.sh` / Docker / nginx）。
- 想长期在线**又不想碰服务器** → 走 **方案 C**（本文第 4 节）。

三者不互斥：常见做法是「今天先 A 分享，验收通过后再上 B/C 固化」。

---

## 2. 方案 A：Cloudflare 快速隧道（最快，现在可执行）

原理：`cloudflared` 在本机与 Cloudflare 边缘之间建一条出站隧道，把公网请求回源到
`http://localhost:3002`。**无需公网 IP、无需开放入站端口、无需买域名**，自带 HTTPS。

### A.1 前置：确认本地服务在跑

```bash
curl -s -o /dev/null -w "health=%{http_code}\n" http://localhost:3002/api/health
# 期望：health=200；若无响应，先在项目根目录重新启动：
#   nohup pnpm start -- -p 3002 > /tmp/offy-3002.log 2>&1 &
```

### A.2 安装 cloudflared

```bash
# macOS（Homebrew）
brew install cloudflared
cloudflared --version
```

### A.3a 一次性临时链接（零配置，最快）

```bash
cloudflared tunnel --url http://localhost:3002
```

命令会打印一条形如 `https://<随机词>.trycloudflare.com` 的公网地址——**把它发给同事即可**。
注意：临时链接在进程关闭后失效，每次重启地址会变，适合一次性演示。

### A.3b 命名隧道（地址稳定，可绑自有域名，可选）

适合需要多次分享、地址不变的场景（需要一个已托管在 Cloudflare 的域名）：

```bash
cloudflared tunnel login                      # 浏览器授权，选择你的域名 zone
cloudflared tunnel create offy                # 创建隧道，生成凭据 json
cloudflared tunnel route dns offy offy.你的域名.com   # 绑定子域
# 写 ~/.cloudflared/config.yml：
#   tunnel: offy
#   credentials-file: /Users/<you>/.cloudflared/<uuid>.json
#   ingress:
#     - hostname: offy.你的域名.com
#       service: http://localhost:3002
#     - service: http_status:404
cloudflared tunnel run offy
```

之后 `https://offy.你的域名.com` 固定可用（只要本机 + 进程在线）。

### A.4 分享须知（务必告知同事 & 自己）

- 链接可用性 = **你的 Mac 开机 + 进程存活 + 网络在线**；合盖休眠/关机即断。
- 隧道对**任何拿到链接的人**开放，站点本身无登录。演示数据即可，勿放敏感信息。
- 想让链接更专业/加访问口令：命名隧道可叠加 Cloudflare Access（邮箱验证/一次性验证码）。

---

## 3. 方案 B：云服务器 + Docker + 域名 + HTTPS（长期稳定）

这条路的**运维细节已在 [`deployment.md` 路径 A](./deployment.md#路径-adocker推荐一键)** 写全，
本节给「从零到公网」的**顺序清单**，逐步执行时对照勾选。

### B.1 采购与解析（人工，一次性）

1. 买一台 Linux VPS（Ubuntu 22.04+，1C1G 起步即可跑本站），拿到公网 IP。
2. 买/复用一个域名，在 DNS 处加一条 **A 记录**：`offy` → 服务器公网 IP。
3. 服务器安装 Docker + Compose 插件；放开安全组/防火墙的 **80、443** 入站。

### B.2 准备生产环境变量（本机）

```bash
cp .env.production.example .env.production
# 编辑 .env.production：
#   NEXT_PUBLIC_SITE_URL=https://offy.你的域名.com
#   DATABASE_URL=/data/offy.db        # 指向 Docker 持久卷，勿改成应用目录
#   STRIPE_* 暂用测试 key（对外演示足够）
```

### B.3 一键部署（本机执行，服务器上构建）

```bash
DEPLOY_SERVER=root@你的服务器IP DEPLOY_DIR=/opt/offy \
DEPLOY_ENV_FILE=.env.production \
  ./scripts/deploy.sh
```

`deploy.sh` 会：rsync 源码 → 上传 `.env` → 在服务器 `docker compose up -d --build`。
应用绑定在服务器 `127.0.0.1:3000`（见 `docker-compose.prod.yml`），下一步用 nginx 对外。

### B.4 配置 nginx 反代 + HTTPS（服务器上执行）

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /opt/offy/deploy/nginx.conf /etc/nginx/sites-available/offy
sudo sed -i 's/offy.example.com/offy.你的域名.com/' /etc/nginx/sites-available/offy
sudo ln -sf /etc/nginx/sites-available/offy /etc/nginx/sites-enabled/offy
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d offy.你的域名.com     # 自动签发证书并加 443 配置
```

完成后 `https://offy.你的域名.com` 即公网可访问，证书由 certbot 自动续期。

### B.5 更新与回滚

- 更新：改完代码在本机重跑 B.3 的同一条 `deploy.sh`（幂等，会重建镜像）。
- 回滚：服务器上 `cd /opt/offy && git checkout <上个提交> && docker compose -f docker-compose.prod.yml up -d --build`。
- 数据安全：SQLite 存于 Docker volume `offy-data:/data`，重建容器不丢；定期
  `docker run --rm -v offy-data:/data -v $PWD:/backup alpine tar czf /backup/offy-db-$(date +%F).tgz /data` 备份。

---

## 4. 方案 C：Fly.io / Railway 托管（免服务器，长期在线）

适合「想长期在线，但不想自己维护 VPS」。两者都能跑我们的 Dockerfile 并挂持久卷。

### C.1 Fly.io（推荐，支持挂卷 + 全球边缘）

```bash
brew install flyctl
fly auth login
fly launch --no-deploy            # 交互式生成 fly.toml；识别到 Dockerfile
fly volumes create offy_data --size 1 --region <就近区域>   # 持久卷给 SQLite
# 在 fly.toml 里挂载卷并设端口/环境：
#   [mounts]
#     source = "offy_data"
#     destination = "/data"
#   [env]
#     DATABASE_URL = "/data/offy.db"
#     NEXT_PUBLIC_SITE_URL = "https://<app>.fly.dev"
#   [http_service]
#     internal_port = 3000
fly deploy
```

上线后拿到 `https://<app>.fly.dev`（自带 HTTPS）；可再 `fly certs add offy.你的域名.com`
绑自有域名。

### C.2 Railway（网页操作为主）

1. New Project → Deploy from Repo（或 Empty → 关联仓库），Railway 自动识别 Dockerfile。
2. Variables 填 `DATABASE_URL=/data/offy.db`、`NEXT_PUBLIC_SITE_URL=<railway域名>`、`STRIPE_*`。
3. 加一个 Volume 挂到 `/data`（持久化 SQLite）。
4. Deploy → 在 Settings 生成公网域名（`*.up.railway.app`），或绑自有域名。

> 注意：C 方案下 `DATABASE_URL` 必须指向挂载卷路径（如 `/data/offy.db`），否则实例
> 重建会丢数据。

---

## 5. 安全与合规提醒（对外前必看）

- **站点无登录**：任何拿到链接者都能访问。演示数据 OK；上线运营前再评估是否加访问控制。
- **Stripe**：对外演示保持**测试 key**；真实收款前切 live key 且务必只放服务端环境变量，
  绝不进前端 / 不进仓库。
- **数据库**：SQLite 仅当前里程碑用；面向真实流量/多实例前按 `architecture.md` 切 PostgreSQL。
- **密钥管理**：`.env.production` 不入库（已在 `.gitignore`）；平台方案用平台的加密变量存储。

---

## 6. 执行选择与首步

| 你的诉求 | 选 | 现在的第一步 |
| --- | --- | --- |
| 今天就把链接发给同事看效果 | **A** | `brew install cloudflared` → `cloudflared tunnel --url http://localhost:3002` |
| 长期正式对外、已有/愿买服务器域名 | **B** | 采购 VPS + 域名解析（B.1），随后 `deploy.sh` |
| 长期在线但不想维护服务器 | **C** | `brew install flyctl && fly launch` |

选定后按对应章节逐步执行；每步以 `curl .../api/health` 返回 `200` 作为「这一步成功」的判据。
