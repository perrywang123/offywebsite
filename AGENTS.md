# AGENTS.md — Offy 开发工作流

面向人类开发者与 AI 编码助手。核心纪律：**spec-first + TDD**（参考 OpenSpec 与
Superpowers 的 `test-driven-development` / `writing-plans` 技能）。

## 项目速览

Offy 是一个品牌宣传 + 电商独立站（中英双语）。已实现：品牌展示、订阅、商品目录、
购物车、Stripe 结算（测试模式）。商品目录用静态数据源 `src/lib/catalog/`；订单/结算
会话走数据库（`src/server/db/schema.ts`）。

技术栈：Next.js 15 (App Router) + TypeScript + React 19 + Tailwind CSS v4 +
next-intl + Drizzle ORM（本地 SQLite / 生产 PostgreSQL 预留）+ Stripe + zod + Vitest。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` / `pnpm start` | 生产构建 / 运行生产构建 |
| `pnpm test` / `pnpm test:watch` | 运行 / 监听测试（Vitest） |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm db:generate` | 由 schema 生成迁移 |
| `pnpm db:migrate` | 应用迁移 |
| `pnpm db:seed` | 写入种子数据 |
| `pnpm db:studio` | 打开 Drizzle Studio |

## 工作流一：spec-first（OpenSpec）

任何行为变更，先写 spec，再写代码：

1. **提案**：在 `openspec/changes/<change-id>/` 新建提案 —— `proposal.md`
   （Why / What Changes / Capabilities / Impact）+ `tasks.md` + 可选 `design.md`，
   以及 `specs/<capability>/spec.md` 的 **delta**（`## ADDED|MODIFIED|REMOVED Requirements`）。
2. **校验**：`pnpm exec openspec change validate <change-id>`。
3. **实现**：按 `tasks.md` 逐条用 TDD 完成。
4. **归档**：`pnpm exec openspec archive <change-id>`，把 delta 合并进
   `openspec/specs/`，文件夹移入 `archive/`。

纯重构 / 工具 / 文档类变更（无 spec delta）在 `.openspec.yaml` 中置
`skip_specs: true`。示例：`openspec/changes/archive/2026-08-19-add-newsletter/`。

## 工作流二：TDD（Red → Green → Refactor）

1. **Red**：先写一个失败的测试，明确描述期望行为。
2. **Green**：写最小实现让测试通过。
3. **Refactor**：在测试保持绿色的前提下重构。
4. 每次提交前 `pnpm test` 必须全绿。

放置规则：

- 纯逻辑 → `src/lib/*.ts` 与同名 `.test.ts`。
- React 组件 → `src/components/*.tsx` 与同名 `.test.tsx`（Testing Library）。
- 数据 / 服务 → `src/server/**`，测试用内存 SQLite，并在文件首行标注
  `// @vitest-environment node`。

## 约定

- 提交信息用 Conventional Commits：`feat` / `fix` / `refactor` / `test` / `docs` / `chore`。
- 环境变量只在服务端读取，统一经 `src/lib/env.ts`（zod 校验）。客户端只用 `NEXT_PUBLIC_*`。
- 数据库 schema 只写在 `src/server/db/schema.ts`；`db/migrations/` 提交进仓库。
- 商品名/价格/图↔编码映射目前是**占位值**，只改 `src/lib/catalog/products.ts` 一处。
- 库存 / 管理后台 / 真实支付联调属后续里程碑，实现前先写 spec delta，不要直接堆代码。
- 数据访问层隔离在 `src/server/db/client.ts`，切 PostgreSQL 只改这一处。

## 关键目录

```
src/app/            App Router 页面与 API 路由
src/components/     UI 组件（含测试）
src/lib/            纯函数与 env 校验
src/server/         服务端业务逻辑与数据层（含测试）
db/                 迁移、种子与 migrate 脚本
openspec/           spec-first 工作流（specs + changes）
docs/               架构文档
```
