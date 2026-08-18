# 生产部署指南

目标环境：一台 Linux 云服务器（Ubuntu/Debian 均可），公网可达、有域名。

## 先决条件（服务器上）

- **路径 A（Docker，推荐）**：安装 Docker + Docker Compose 插件。
- **路径 B（裸 Node）**：安装 Node.js ≥ 20 与 nginx。
- 域名解析到服务器 IP（A 记录）。

## 数据库说明

当前里程碑用 **SQLite**。生产部署务必把数据放在**持久化目录**（Docker 用
volume `/data`，裸 Node 用 `/var/lib/offy/offy.db`），不要放在应用目录里，
否则重新部署会覆盖数据。

切 **PostgreSQL**（后续商城阶段建议）：见
[`docs/architecture.md`](./architecture.md)「数据层与 PostgreSQL 预留」。
schema 需改为 `pg-core` 并重新生成迁移，属后续 spec 变更。

---

## 路径 A：Docker（推荐，一键）

本机（macOS/Linux）执行：

```bash
# 1. 准备生产环境变量（首次）
cp .env.production.example .env.production
#    编辑：把 NEXT_PUBLIC_SITE_URL 改成你的域名；DATABASE_URL 保持 /data/offy.db

# 2. 同步源码到服务器并在服务器上构建/启动（原生模块按 Linux 编译）
DEPLOY_SERVER=root@你的IP DEPLOY_DIR=/opt/offy ./scripts/deploy.sh
```

`deploy.sh` 会：rsync 源码 → 上传 `.env` → 在服务器上 `docker compose up -d --build`。
之后每次更新只需重跑同一条命令（幂等）。

也可直接在服务器上操作：

```bash
cd /opt/offy
docker compose -f docker-compose.prod.yml up -d --build
```

### 配置 HTTPS（nginx + certbot）

应用已绑定 `127.0.0.1:3000`，用 nginx 反代并加 TLS：

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/offy
sudo sed -i 's/offy.example.com/你的域名/' /etc/nginx/sites-available/offy
sudo ln -s /etc/nginx/sites-available/offy /etc/nginx/sites-enabled/offy
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 你的域名      # 自动签发证书并加 443 配置
```

---

## 路径 B：裸 Node + systemd

> 注意：`better-sqlite3` 是原生模块，**必须在 Linux 服务器上构建**。
> 请把源码同步到服务器后，在服务器上执行打包；不要用 macOS 本地打包的产物直接上传。

在服务器上：

```bash
# 1. 同步源码（或用 git clone）
rsync -az --exclude node_modules --exclude .next --exclude .git ./ root@服务器:/opt/offy/

# 2. 安装依赖并打包
cd /opt/offy
corepack enable && pnpm install --frozen-lockfile
pnpm package                        # 生成 dist/offy-x.y.z.tar.gz

# 3. 解包到运行目录
sudo mkdir -p /opt/offy-run && sudo chown -R offy:offy /opt/offy-run
tar -xzf dist/offy-*.tar.gz -C /opt/offy-run
sudo cp .env.production /opt/offy-run/.env   # 其中 DATABASE_URL=/var/lib/offy/offy.db

# 4. 数据目录 + systemd
sudo useradd -r -s /usr/sbin/nologin offy
sudo mkdir -p /var/lib/offy && sudo chown -R offy:offy /var/lib/offy
sudo cp deploy/offy.service /etc/systemd/system/offy.service
#    按需修改 service 里的 WorkingDirectory=/opt/offy-run
sudo systemctl daemon-reload && sudo systemctl enable --now offy
```

`offy.service` 会在启动前自动 `node db/migrate.mjs` 应用迁移，然后 `node server.js`。
HTTPS 同上（nginx + certbot，反代到 127.0.0.1:3000）。

---

## 手工打包产物说明

`pnpm package` 生成的 tarball 是**自包含**的：

```
server.js            # Next standalone 入口
node_modules/        # 已裁剪的运行时依赖（含 better-sqlite3）
.next/static/        # 静态资源
public/
db/migrations/       # 迁移文件
db/migrate.mjs       # 迁移执行器
start.sh             # 启动脚本（加载 .env → 迁移 → server.js）
.env.example
```

在解包目录直接 `PORT=3000 ./start.sh` 即可运行（`start.sh` 会自动迁移）。

## 常见问题

- **端口冲突**：默认 3000，用 `PORT=xxxx` 覆盖。
- **数据丢失**：SQLite 文件必须放持久化目录（volume 或 `/var/lib/offy`）。
- **原生模块不匹配**：跨平台部署请走 Docker 或在目标服务器上构建。
