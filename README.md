# Offy / is.offy

is.offy 品牌展示与跨境电商站。当前公开英文，采用 Next.js 15.5.23、React 19、TypeScript、Tailwind CSS v4、next-intl、Shopify Storefront API 和 Drizzle/SQLite。

> 文档基线：2026-10-31。入口见 [文档导航](docs/README.md) 和 [当前状态](docs/current-state.md)。
> Shopify 是唯一商品事实来源；读取失败时显示已确认的品牌化重试界面，不显示旧商品、旧价或假空袋。见 [展示方案](docs/shopify-unavailable-design.md)。

## 当前能力

| 能力                                                    | 公开地址/来源                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| 品牌首页、资讯、最新造型、区域限定、名册、订阅与未来 IP | `/`；品牌内容与 Shopify 混合                                          |
| 全量商品与三大系列                                      | `/products`、`/collections`、`/collections/[series]`                  |
| 商品详情、多图切换、同系列推荐、手机吸底加购            | `/products/[code]`；code 为 Shopify handle                            |
| 购物袋抽屉和独立页                                      | `/cart`；`offy.cart.v1` 保存 code/quantity                            |
| Shopify 托管结账                                        | 购物袋直接建 Shopify Cart 并跳转；`/checkout` 保留旧回调/直接访问入口 |
| 品牌故事与包挂预告                                      | `/about`、`/bag-charm`；预告图支持 quick view                         |
| FAQ、政策目录与联系信息                                 | `/faq`、`/policies`、`/policies/[handle]`                             |
| KOL合作后台（默认关闭）                                 | 独立入口`/admin`；合作、双方式码、当次归因、佣金及人工月结            |
| SEO                                                     | 独立 canonical、首页语义 H1、JSON-LD、robots、sitemap                 |

当前只有 `en` 进入路由表，公开 URL 不带语言前缀。`/en/*` 307 去前缀，旧 `/zh/*` 308 去前缀。中文代码保留并不代表中文站已开放。

商品唯一主路径是 `src/server/catalog/live.ts` 实时读取 Shopify；旧本地商品快照、富化器和漂移脚本已删除。商品数随市场和后台发布变化，不固定为 19/29/38。名称、价格、库存、商品图在 Shopify 维护。

## 本地运行

```bash
pnpm install
cp .env.example .env
# 填写 SITE_URL、SHOPIFY_STORE_DOMAIN、SHOPIFY_STOREFRONT_TOKEN
pnpm db:migrate
pnpm dev
```

默认访问 `http://localhost:3000`。依赖本地 Node/pnpm 与原生 `better-sqlite3`；Dockerfile 固定 Node 22。按 `packageManager` 使用 pnpm 10.26.2。

`SITE_URL` 是服务端 metadata/sitemap/回跳使用的地址。`NEXT_PUBLIC_SITE_URL` 不能替代它。未填 Shopify 凭据时，商品区域提供重试入口，商品 API/结算返回 503；品牌页面仍可使用。

## 常用命令

| 命令                                            | 用途                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `pnpm test` / `test:watch` / `test:coverage`    | Vitest + Testing Library                                    |
| `pnpm typecheck` / `pnpm lint`                  | 类型和 ESLint                                               |
| `pnpm format:check` / `pnpm format`             | 格式检查/全仓格式化；后者会改文件                           |
| `pnpm build`                                    | 生产构建，配置为 standalone                                 |
| `pnpm db:generate` / `db:migrate` / `db:studio` | SQLite schema 迁移与检查                                    |
| `pnpm db:seed`                                  | 可选：向订阅表写两条示例邮箱；不是商品同步                  |
| `pnpm sync:assets`                              | 从本地原始资源同步图片；会重写产物，勿用于日常 Shopify 同步 |
| `pnpm package` / `pnpm deploy`                  | 打包/远程部署；见部署说明                                   |

## 开发纪律

遵循 [AGENTS.md](AGENTS.md)：行为变更先写 OpenSpec proposal/tasks/delta 并校验，再以 Red → Green → Refactor 实现。纯文档变更使用 `skip_specs: true`，无须编造行为测试。主规范记录已实现行为，未批准方案留在 `openspec/changes/`。

## 边界与部署

- 公开购买路径只使用 Shopify；Stripe/PayPal provider 和 API 仍在，且仍限制 USD，不是当前 UI 的支付选项。
- Shopify拥有主链路订单；可选KOL平台已实现独立webhook/财务核对与后台，默认关闭；全站行为分析/CMS未实现。
- KOL运行、管理员初始化和隔离测试见 [手册](docs/kol-platform-operations.md)，验证证据及真实联调门槛见 [记录](docs/kol-platform-validation.md)。
- 已实现数据库只有 SQLite。PostgreSQL 分支、pg schema、迁移和异步 DAL 尚未实现，不能只改环境变量切换。
- 生产主路径为 Docker Compose + nginx + 持久化 `/data`。standalone 用 `node server.js` 启动；`pnpm start` 保留为 Next CLI 入口，不是推荐的生产操作手册。

详见 [架构](docs/architecture.md)、[部署](docs/deployment.md)、[路线图](docs/roadmap.md)。

## 服务器 Git 部署

代码继续保存在原 GitHub 仓库。将改动推送到仓库后，在服务器**原有固定 checkout**执行；脚本自动 `git pull --ff-only`，无需上传源码或填写服务器 IP：

```bash
cd /opt/offy
bash deploy/update-storefront.sh --kol  # 只更新独立站，保留KOL，不动后台/worker/Nginx
bash deploy/update-admin.sh       # 仅更新独立 admin 容器与 worker，不重启主站
# bash deploy/update.sh --kol     # 整套更新；内部认证自动准备，首次 owner 从服务端哈希配置初始化
```

以上两个独立命令按需执行；首次启用KOL可以先单独更新主站，成功后再单独更新后台。两套应用使用不同镜像与loopback端口，共用原Compose项目中的SQLite持久卷。首次需要配置服务器 `.env`、Shopify权限和HTTPS入口；后台外部访问地址只需在 `ADMIN_ORIGIN` 配置一次。独立发布会核对共享数据库及运行中另一端的共用设置；密钥/数据库真正变更仍需协调升级。每次选中的镜像仍会编译共享Next.js应用，不能保证解决构建耗时或终端断连。

详见 [部署手册](docs/deployment.md)。`pnpm deploy` / `deploy:kol` 保留为可选的开发机 SSH 上传工具，仅这类远程工具需要指定服务器。当前改动没有发布到生产。
