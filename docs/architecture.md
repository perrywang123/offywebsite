# Offy 架构说明

## 概览

Offy 是一个全栈 Next.js 应用，分三层：

```
浏览器 ──▶ Next.js (App Router) ──▶ 服务层 (src/server) ──▶ Drizzle ORM ──▶ 数据库
            页面 / API 路由           业务逻辑 + 校验          迁移管理      SQLite(本地)
                                                                             PostgreSQL(生产预留)
```

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `src/app/` | 页面、布局与 API 路由（App Router） |
| `src/components/` | 可复用 UI 组件（含客户端组件） |
| `src/lib/` | 纯函数（校验、工具）与 env 校验 |
| `src/server/db/` | Drizzle schema 与数据库客户端 |
| `src/server/newsletter/` | 订阅业务逻辑 |
| `db/` | 迁移文件、migrate / seed 脚本 |

## 数据层与 PostgreSQL 预留

本地开发使用 SQLite（`better-sqlite3`），零外部依赖。schema 定义在
`src/server/db/schema.ts`，与驱动无关。数据库客户端隔离在
`src/server/db/client.ts`，根据 `DATABASE_PROVIDER` 选择驱动。

切换到 PostgreSQL 时（生产）：

1. 依赖已含 `postgres`（`postgres-js`）与 `drizzle-orm/postgres-js`。
2. 在 `client.ts` 中新增 `postgres` 分支（`drizzle(postgres(url), { schema })`）。
3. 迁移需要针对 Postgres 重新生成一次（Drizzle 的 `dialect` 由 `drizzle.config.ts` 决定）。

> 注意：`better-sqlite3` 是同步 API，而 `postgres-js` 是异步 API；两者在
> `client.ts` 里分层后，上层业务代码（如 `subscribe.ts`）尽量通过薄封装避免耦合到具体驱动。

## API 路由

| 路由 | 方法 | 说明 |
| --- | --- | --- |
| `/api/health` | GET | 存活检查 |
| `/api/newsletter` | POST | 订阅（校验 → 归一化 → 去重入库） |

## 测试策略（TDD）

- **纯函数**：`src/lib/*.test.ts`，无副作用。
- **组件**：`src/components/*.test.tsx`，用 Testing Library + jsdom。
- **数据/服务**：`src/server/**/*.test.ts`，用内存 SQLite（`// @vitest-environment node`），
  不依赖真实文件数据库。

运行：`pnpm test`（单次）、`pnpm test:watch`（监听）、`pnpm test:coverage`（覆盖率）。

## 发布形态

- `next.config.ts` 设 `output: "standalone"`，产出可自托管的精简 server。
- [`Dockerfile`](../Dockerfile) 提供多阶段镜像构建。
- 亦可直接部署到 Vercel（无需 Docker）。
