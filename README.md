# Offy

品牌宣传 + 电商独立站。当前里程碑提供品牌展示与订阅能力，商城 / 支付为预留能力。

技术栈：**Next.js 15 (App Router) · TypeScript · React 19 · Tailwind CSS v4 ·
Drizzle ORM · SQLite（本地）/ PostgreSQL（生产预留）· Vitest**。

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
```

切换生产 PostgreSQL 时，改 `DATABASE_PROVIDER=postgres` 并设置 `DATABASE_URL`，
数据访问层隔离在 `src/server/db/client.ts`（详见 [`docs/architecture.md`](./docs/architecture.md)）。

## 部署

- **Vercel**（推荐）：直接导入本仓库即可，无需额外配置。
- **Docker / 自托管**：项目已含多阶段 [`Dockerfile`](./Dockerfile)（`output: "standalone"`）：

```bash
docker build -t offy .
docker run --rm -p 3000:3000 offy
```

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
