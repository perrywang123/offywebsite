# 生产部署指南

> 想快速拿到一个**公网链接分享给同事**？先看
> [`public-deploy.md`](./public-deploy.md)（三档方案 + 决策矩阵：Cloudflare 快速隧道 /
> 云服务器 Docker / Fly.io·Railway 托管）。本文是选定「云服务器 + Docker/裸 Node」
> 路线后的详细运维手册。

目标环境：一台 Linux 云服务器（Ubuntu/Debian 均可），公网可达、有域名。

## 先决条件（服务器上）

- **路径 A（Docker，推荐）**：安装 Docker + Docker Compose 插件。
- ~~**路径 B（裸 Node）**：安装 Node.js ≥ 20 与 nginx。~~ **已弃用** —— 线上统一走 Docker,见下方「部署方式」。
- 域名解析到服务器 IP（A 记录）。

## 区域限定与币种(按访客国家)

**这一节决定两件事,不止一件**:首页「区域限定」那一栏展示哪些商品,**以及全站
价格用什么币种**。两者都来自同一个国家判定,配不好会同时错。

### 国家是怎么判定的

应用按以下顺序判定(见 `src/lib/geo.ts`):

```
cf-ipcountry → x-vercel-ip-country → x-country-code → x-geo-country
             → x-forwarded-country
             → 应用自己按客户端 IP 解析(geoip-lite)      ← 2026-10-11 新增
             → SHOPIFY_MARKET_COUNTRY(默认 US)
```

**前五级是请求头,第六级是应用自己解析。**一个头都拿不到时,`pickCountry` 会取
`x-forwarded-for` 的**第一个**地址(没有就退到 `x-real-ip`),用 `geoip-lite` 查
ISO 国家码,再走和请求头完全相同的归一化(`UK` → `GB`)与哨兵值过滤
(`XX`/`T1`/`EU` 之类不算国家)。

这一层是 **zero-config** 的:`geoip-lite` 的数据库打包在 npm 包里,所以

- **不用装 nginx GeoIP2 模块**(`libnginx-mod-http-geoip2` 是 Debian/Ubuntu 包名,
  OpenCloudOS / RHEL 系根本没有,硬开配置会让 `nginx -t` 报
  `unknown directive "geoip2"`);
- **不用注册 MaxMind 账号、不用 `geoipupdate`**;
- **不用把域名挂到 Cloudflare**。

部署完就能按访客地区展示,币种也跟着走。**唯一的硬要求是 nginx 必须把客户端 IP
传进来**(`deploy/nginx.conf` 里那两行 `X-Real-IP` / `X-Forwarded-For`),否则应用
只能看到回环地址,退回默认市场。

> 私有段 / 回环地址(`127.0.0.1`、`10.x`、`192.168.x`、`::1`)与畸形 IP 查不到
> 国家,此时**静默回落**到 `SHOPIFY_MARKET_COUNTRY`,不会报错、不会白屏 ——
> 从本机直连容器调试时看到 USD 是正常的。

> `UK` 不是 ISO-3166 码(`GB` 才是),但设计稿、文案和人工标注里都习惯写 UK。
> 所有来源(含 IP 解析)在返回前统一归一化成 `GB` —— Shopify Markets 只认
> alpha-2,传 `UK` 会让它落回默认市场(币种和区域限定同时失效)。

> 这一层判定最终来自**请求方自己声称的值**(头可以被伪造,`X-Forwarded-For`
> 的左侧也可能被伪造),它只影响展示币种与区域限定区块。真要按国家做价格/合规
> 判定,以后得在结算侧另行校验(当前结算是按 `pickCountry` 的结果下单,行为与
> 改造前一致)。

### 可选:用前置层覆盖判定

想让 CDN / nginx 指定国家(内网压测要伪装成某个国家、或想让判定收口到边缘),
再在下面三种里挑一种。**都不做也没关系** —— IP 解析这一层已经覆盖了裸机部署。

| 做法 | 说明 |
| --- | --- |
| **A. 域名挂 Cloudflare** | CF 自动注入 `cf-ipcountry`,优先级最高,什么都不用配 |
| **B. 裸 nginx + GeoIP2** | 需要 `libnginx-mod-http-geoip2` + MaxMind 账号,见 `deploy/nginx-geoip2.conf` |
| **C. 什么都不做(推荐)** | 应用自己按 IP 解析,币种与区域限定已经正确 |

> 有国家头时**以头为准**,IP 解析不会覆盖它 —— 这正是 A/B 能"覆盖"应用判定的原因。
> `deploy/nginx.conf` 里那行 `proxy_set_header X-Country-Code` 默认是**注释掉**的:
> 模块没装就打开它,`nginx -t` 会直接失败。

### 部署后必须验证

```bash
# 1. 不伪造任何国家头,只给一个公网 IP —— 应用应当自己解析出国家
curl -s -H "X-Forwarded-For: 210.128.0.1" http://127.0.0.1:3000/api/products | head -c 200
curl -s -H "X-Forwarded-For: 212.58.244.20" http://127.0.0.1:3000/api/products | head -c 200
#    期望:两个 IP 拿到**不同**币种(本店实测 JP→SGD、GB→GBP),而不是两边都 USD
#    (镜像里没有 curl,要在容器内自查就用 node 的 fetch:
#       docker compose -f docker-compose.prod.yml exec app node -e \
#         "fetch('http://127.0.0.1:3000/api/products',{headers:{'X-Forwarded-For':'212.58.244.20'}}).then(r=>r.json()).then(j=>console.log(j.products[0].price))")

# 2. 国家头仍然优先于 IP(优先级没被破坏)
curl -s -H "cf-ipcountry: GB" -H "X-Forwarded-For: 210.128.0.1" \
  http://127.0.0.1:3000/api/products | head -c 200
#    期望:GBP —— 头压过 IP

# 3. 换两个地区的网络访问首页,「区域限定」那一栏与价格币种应当不同
```

第 1 步如果两个 IP 都还是 USD,依次检查:(a) 反代有没有传 `X-Forwarded-For`;
(b) 容器里 `node_modules/geoip-lite/data/` 在不在(少了就会一律回落默认市场,
见下一条)。

> **打包侧的两个坑(都已在 `next.config.ts` 修好,别删那两行):**
>
> 1. `serverExternalPackages: ["geoip-lite"]` —— `geoip-lite` 用
>    `path.resolve(__dirname, "../data")` 找数据文件。被 Turbopack 打进 server
>    bundle 后 `__dirname` 变成虚拟路径(`/ROOT/node_modules/...`),**import 阶段
>    就 ENOENT,每个请求 500**。声明成外部依赖让它按真实路径 `require`。
> 2. `outputFileTracingIncludes: { "/**": ["node_modules/geoip-lite/**"] }` ——
>    standalone 的文件追踪只跟 import/require 走,看不到 `fs.openSync(*.dat)`,
>    不显式包含就不会被复制进镜像 —— 现象是"本地全对,容器里查谁都是 undefined"。
>    自查:`docker compose -f docker-compose.prod.yml exec app ls node_modules/geoip-lite/data`。
>
> 顺带一提,这个库在进程启动时同步读入约 115MB 数据(实测常驻内存约 +150MB),
> 换 IP 判定的准确性就是拿这点内存换的。它声明 `engines: node >= 24`,但实测在
> 镜像里的 Node 22 上工作正常(`geoip-lite@2.0.3` 没有用到 Node 24 专有 API)。


### 数据来源与缓存

Shopify 侧的区域限定不是 tag 也不是 metafield,而是**只把商品发布到某些
Market**,所以服务端会拿同一份 Storefront 查询换不同 `@inContext(country:)`
跑一遍再比对(实测该店 35 个商品里 6 个是限定款)。实现见
`src/server/catalog/regional.ts`,探测结果缓存 1 小时。

可选:`SHOPIFY_REGIONS` 指定要比对的国家(逗号分隔),留空用内置默认
`US,CA,GB,SG,HK,MY,AU,JP,KR,DE,FR,TW`。

> 注意:读请求头会让首页转为**按请求渲染**(不再走 ISR 静态缓存)。这是按国家
> 变化的必要代价;Shopify 的数据请求仍有各自的缓存窗口,所以不会每个请求都打
> Shopify。每个国家的 data cache 键是独立的,不会互相串味。

### 兜底表会漂移,用脚本盯住

`src/lib/catalog/products.ts` 是 Shopify 不可达时的兜底。商家改价/改名后它会
过时,所以:

```bash
pnpm check:catalog      # 比 handle / 名称 / 价格 / 系列归属,有漂移则退出非零
```

建议放进部署流程 —— 兜底表显示错价(尤其 0 价)比整站降级更难被发现。

---

## 数据库说明

当前里程碑用 **SQLite**。生产部署务必把数据放在**持久化目录**（Docker 用
volume `/data`，裸 Node 用 `/var/lib/offy/offy.db`），不要放在应用目录里，
否则重新部署会覆盖数据。

切 **PostgreSQL**（后续商城阶段建议）：见
[`docs/architecture.md`](./architecture.md)「数据层与 PostgreSQL 预留」。
schema 需改为 `pg-core` 并重新生成迁移，属后续 spec 变更。

---

## 部署方式：Docker(唯一推荐路径)

> **2026-10 起,线上统一走 Docker。** 之前是「裸 Node + systemd + 手工
> `npx next build`」,那条路有两个问题:(1) 绕过了 `docker-compose.prod.yml`
> 里固定下来的构建期参数(见 `build.args`),预渲染拿到的是占位域名;(2) systemd
> 服务会和容器**抢 3000 端口**,谁先起来谁占住。旧的 `deploy/offy.service`
> 保留只为回滚参考,不要再启用。

### 服务器上更新(日常)

```bash
cd /opt/offy        # 或你的 DEPLOY_DIR
./deploy/update.sh
```

`deploy/update.sh` 按顺序做六件事,**任何一步不过就停下并说明原因**:

1. 检查 docker / compose 可用
2. **如果 systemd 的 `offy` 服务还在跑就直接失败** —— 它占着 3000,容器起不来
3. 校验 `.env` 存在且 `SHOPIFY_*` / `SITE_URL` 不是占位值
4. `git pull --ff-only`
5. `docker compose -f docker-compose.prod.yml up -d --build`
6. 等 `/api/health` 通过,并检查它的 `config` 块

### 为什么第 3 步和第 6 步要这么较真

**缺 `SHOPIFY_*` 不会让站点报错。** 站点会正常 200、容器会 healthy,但商品目录
**静默退回本地兜底表** —— 商品数量、名字、价格全是快照值。这个坑在本项目上已经
真实踩过两次(容器与本地各一次),从页面上完全看不出来,所以现在:

- `deploy/update.sh` 在部署前就拦住(占位值也拦)
- 部署后检查 `/api/health` 的 `config.shopify` 是否为 `configured`
- `pnpm check:catalog` 可以随时比对兜底表与线上是否漂移

### 从旧的裸 Node 部署切过来

```bash
systemctl stop offy && systemctl disable offy    # 必须先做,否则容器抢不到端口
cd /opt/offy && ./deploy/update.sh
```

### 从本地推送到服务器

```bash
DEPLOY_SERVER=root@1.2.3.4 DEPLOY_DIR=/opt/offy ./scripts/deploy.sh
```

`scripts/deploy.sh` 用 rsync 把源码同步过去再在服务器上构建(原生模块要按 Linux
编译)。

**配置默认不经过这个脚本**:它只同步源码(rsync 明确排除 `.env`),服务器上那份
`.env` 由你自己维护 —— 手工粘贴或其他方式都行,`deploy/update.sh` 会在部署前
校验它。想临时从本地推一次配置时显式指定:

```bash
DEPLOY_ENV_FILE=.env.production ./scripts/deploy.sh
```

**真实配置永远不进 git。** `.gitignore` 覆盖 `.env` / `.env.production` /
`.env.*.local`;仓库只跟踪 `.env.example` 与 `.env.production.example` 两个模板,
内容全是 `REPLACE_WITH_*` 占位符。可以随时自查:

```bash
git ls-files | grep -i env      # 只应看到两个 *.example 和 src/lib/env.ts
```

### 配置 HTTPS(nginx + certbot)

同下节,反代配置见 `deploy/nginx.conf`(国家判定默认由应用按 IP 自行解析,不需要
nginx 模块;想让 nginx 覆盖时才看 `deploy/nginx-geoip2.conf`)。

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
