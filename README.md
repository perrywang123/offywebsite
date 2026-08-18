# Offy

PLAYCORE 凭空幻想（is.offy）品牌电商独立站：中英双语、品牌形象展示、商品目录、
Casetify 式「选款 → 购物车 → Stripe 支付」全流程。

技术栈：**Next.js 15 (App Router) · TypeScript · React 19 · Tailwind CSS v4 ·
next-intl（中英可扩展）· Drizzle ORM（SQLite/PostgreSQL 预留）· Stripe · Vitest**。

## 功能

| 能力 | 路由 |
| --- | --- |
| 品牌首页（hero/热门形象/系列/Lookbook/订阅） | `/zh` `/en` |
| 商品目录（29 形象 · 9 系列 · 筛选） | `/products` |
| 商品详情（大图/尺寸/情绪标签/形象选择器） | `/products/[code]` |
| 系列页 | `/collections/[series]` |
| 购物车（抽屉 + 独立页，localStorage 持久化） | `/cart` |
| 结算（Stripe Checkout，USD，服务端计价） | `/checkout` |
| 品牌宣传页（故事/团队/门店/未来 IP） | `/about` |

> ⚠️ 商品名 / 价格 / 图↔编码映射当前为**占位值**（源自品牌手册 PDF 提取，见
> [`docs/brand-brief.md`](./docs/brand-brief.md) §9）。修正只需改
> [`src/lib/catalog/products.ts`](./src/lib/catalog/products.ts) 一处。

## 快速开始

> 前置：Node.js ≥ 20（本地已验证 v24）、pnpm 10。

```bash
pnpm install
cp .env.example .env          # 首次需要，本地默认使用 SQLite
pnpm db:migrate               # 应用数据库迁移
pnpm db:seed                  # （可选）写入种子数据
pnpm dev                      # 打开 http://localhost:3000
```

> 说明：`.npmrc` 将 pnpm store 与缓存放到项目内（`.pnpm-store/` 等），便于在受限 /
> 沙箱环境中安装、也保证可复现。若你更想使用全局 store，可删除 `.npmrc` 中对应几行。

## 常用脚本

| 脚本 | 说明 |
| --- | --- |
| `pnpm dev` | 开发服务器（Turbopack） |
| `pnpm build` / `pnpm start` | 生产构建 / 运行生产构建 |
| `pnpm test` / `pnpm test:watch` | Vitest 运行 / 监听 |
| `pnpm test:coverage` | 覆盖率报告 |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm db:generate` / `db:migrate` / `db:seed` / `db:studio` | Drizzle 迁移与工具 |
| `pnpm sync:assets` | 从 `resources/` 同步图片到 `public/assets/` |

## 开发流程：spec-first + TDD

本项目遵循 **spec-first（OpenSpec）+ TDD** 工作流，详见 [`AGENTS.md`](./AGENTS.md)：

1. 先在 `openspec/changes/` 写变更提案与 spec delta；
2. 用 `pnpm test:watch` 按 Red → Green → Refactor 实现；
3. `openspec archive` 归档并把 spec 合并进 `openspec/specs/`。

## 环境变量

见 [`.env.example`](./.env.example)。本地默认：

```env
DATABASE_PROVIDER=sqlite
DATABASE_URL=./data/offy.db
STRIPE_SECRET_KEY=REPLACE_WITH_STRIPE_SECRET_KEY          # 换成你的 Stripe 测试 key 才能走通支付
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=REPLACE_WITH_STRIPE_PUBLISHABLE_KEY
```

切换生产 PostgreSQL 时，改 `DATABASE_PROVIDER=postgres` 并设置 `DATABASE_URL`，
数据访问层隔离在 `src/server/db/client.ts`（详见 [`docs/architecture.md`](./docs/architecture.md)）。

## 部署

三种方式，详见 [`docs/deployment.md`](./docs/deployment.md)：

- **云服务器一键（Docker，推荐）**：把源码同步到服务器并在服务器上构建/启动，原生模块按 Linux 编译：

  ```bash
  DEPLOY_SERVER=root@你的IP DEPLOY_DIR=/opt/offy \
    DEPLOY_ENV_FILE=.env.production pnpm deploy
  ```

- **自包含打包**：`pnpm package` 生成 `dist/offy-<版本>.tar.gz`，解包后 `./start.sh` 即跑（含自动迁移）。
- **Vercel**：直接导入仓库即可。

> 跨平台注意：`better-sqlite3` 是原生模块，macOS 本地打包的产物不能直接用于 Linux 服务器，
> 请用 Docker 路径或在服务器上执行 `pnpm package`。

## 目录结构

```
src/app/            App Router 页面与 API 路由
src/components/     UI 组件（含测试）
src/lib/            纯函数与 env 校验
src/server/         服务端业务逻辑与数据层（含测试）
db/                 迁移、种子与 migrate 脚本
openspec/           spec-first 工作流（specs + changes）
docs/               架构文档
```
