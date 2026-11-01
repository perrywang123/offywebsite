# AGENTS.md — Offy 开发工作流

核心纪律：**spec-first + TDD**。文档基线：2026-10-31。

## 项目与当前边界

Offy 是 is.offy 品牌展示与跨境电商站。技术栈：Next.js 15 App Router、React 19、TypeScript、Tailwind CSS v4、next-intl、Shopify Storefront、Drizzle、SQLite、zod、Vitest。

- 当前对外英文单语、无默认语言前缀；中文代码和字典为保留资产。
- 商业数据主路径为 `src/server/catalog/live.ts` → Shopify。禁止本地商业事实回退；`lib/catalog/brand.ts` 仅存品牌内容与旧 handle 跳转配置。
- 商品、市场、库存、结账、主链路订单在 Shopify 维护。站内购物袋只持久化 `{code, quantity}`。
- UI 只提供 Shopify，购物袋直接跳托管结账。Stripe/PayPal 是保留路径且限制 USD。
- SQLite 已实现；PostgreSQL 仅预留，需要 schema、迁移、DAL 的独立改造。
- KOL后台、最小访问、Shopify验签/持久财务核对和账本/月结已实现，默认关闭；管理入口需可信代理+登录。全站埋点与CMS仍未实现。参考 `docs/kol-platform-operations.md`、`docs/current-state.md` 与 `docs/roadmap.md`。

**2026-10-31 已确认并实现**：商品事实只用 Shopify；读取失败使用品牌化重试展示，不显示旧价/假空袋、不创建支付会话。禁止重新引入本地商业快照；见 `docs/shopify-unavailable-design.md` 和当前commerce规范。

开始界面工作前读取根目录 `DESIGN.md`；本次故障展示原型另读 `docs/design/shopify-unavailable/DESIGN.md`。历史 PSD/方案与当前规范不一致时，先确认该资料的状态，不能自动恢复被删除的交互。

## 命令

| 命令                                                          | 用途                                              |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `bash deploy/update-admin.sh` / `bash deploy/update.sh --kol` | 服务器Git独立后台 / 整套Docker发布                |
| `bash deploy/update-storefront.sh --kol`                      | 服务器Git独立主站，保留KOL，不动后台/worker/Nginx |
| `pnpm dev`                                                    | 开发服务器，默认 localhost:3000                   |
| `pnpm build`                                                  | standalone 生产构建                               |
| `pnpm test` / `test:watch`                                    | 单次/监听 Vitest                                  |
| `pnpm typecheck` / `pnpm lint`                                | 类型/ESLint                                       |
| `pnpm format:check` / `pnpm format`                           | 检查/改写格式                                     |
| `pnpm db:generate` / `db:migrate` / `db:seed` / `db:studio`   | SQLite 工具；seed 仅订阅示例                      |

## Spec-first

1. `openspec/changes/<change-id>/` 写 `proposal.md`（Why / What Changes / Capabilities / Impact）、`tasks.md`、可选 `design.md`，行为变更写 `specs/<capability>/spec.md` delta（ADDED/MODIFIED/REMOVED）。
2. `pnpm exec openspec change validate <change-id>`。
3. 按 tasks 用 TDD 实现。
4. 验证后 `pnpm exec openspec archive <change-id>`，将 delta 合入主规范。

纯重构、工具或文档且无 spec delta 时，`.openspec.yaml` 设 `skip_specs: true`。文档纠错可以校准已存在的实现，但不得将待确认功能写成已实现。

`2026-10-12-owner-simplifications` 已以 --skip-specs 归档为被覆盖的历史记录，原未完成事项未冒记完成；不得再次合并其旧 delta 覆盖当前主规范。`openspec/changes/archive/` 是历史证据，不批量改写历史结论。

## TDD：Red → Green → Refactor

先写描述期望行为的失败测试，再最小实现，最后保持绿色重构。每次提交前 `pnpm test` 必须全绿；行为改动还需相关类型、lint、构建与浏览器验收。

- 纯逻辑：`src/lib/` 与相邻 `.test.ts`。
- React：组件/页面相邻 `.test.tsx`，Testing Library。
- 服务/数据：`src/server/**`，内存 SQLite，文件首行 `// @vitest-environment node`。
- jsdom 不验证真实布局、命中区、外部网关或支付到账；这些需独立集成/浏览器证据。
- 纯文档修订检查链接、格式和 OpenSpec，无须编写镜像实现的测试。

## 约定

- Conventional Commits：feat / fix / refactor / test / docs / chore。
- 新服务端配置经 `src/lib/env.ts` 校验；客户端仅 `NEXT_PUBLIC_*`。启动诊断/健康检查现有直接读取配置的少量特例见架构说明。
- 不打印或提交真实 `.env` 值；配置核对优先只检查是否已设置，文档使用 `.env.example`、`.env.production.example`。
- 2026-11-01 用户明确授权：唯一生产管理员的邮箱与 scrypt 密码哈希存于服务端 `config/admin-account.json`，禁止明文及客户端暴露；其余真实凭据仍不入库。内部认证由部署脚本在服务器私密生成并保留，Shopify webhook 可选。
- schema 集中于 `src/server/db/schema.ts`，迁移提交 `db/migrations/`。
- code/handle 是路由与购物袋标识；SKU 是商家维护的展示编码，不能互换。
- 市场金额和 currency 一起传递；不能把 GBP/HKD 金额标成 USD 或跨币种相加。
- 品牌内容、路由映射和商品事实分开维护；静态品牌素材不是商品同步机制。
- 原始 `resources/`、本地数据库、构建与缓存不入库；不要删除用户已有的未跟踪设计截图。

## 目录

`src/app/` 页面/API；`src/components/` UI；`src/lib/` 类型/纯函数/内容/env；`src/server/` Shopify/业务/DAL；`db/` 迁移；`openspec/` 规范与变更；`docs/` 当前说明、规划与历史索引；`public/assets/` 上线品牌素材。
