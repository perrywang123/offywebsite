# 05 · 后端架构设计（Server Spec）— PLAYCORE 凭空幻想电商

> 范围：品牌展示 + 电商独立站的后端架构。本文是 `openspec/specs/commerce/spec.md`
> 从「预留」落到「可实施」的设计依据（对应 spec-first 工作流中的 `design.md` 输入）。
>
> 技术约束：Next.js 15 App Router route handlers（`/api/*`）、Drizzle ORM + SQLite（本地）
> / PostgreSQL（生产预留）、Stripe Checkout（测试模式、USD）。

---

## 1. 架构总览

```
浏览器 ──▶ Next.js (App Router) ──▶ 服务层 (src/server) ──▶ Drizzle ORM ──▶ SQLite(本地)/PG(预留)
   │           页面 / API 路由            业务逻辑 + 校验        迁移管理          orders / checkout
   │                                              │
   │         ┌────────────────────────────────────┼──────────────────────────┐
   │         ▼                                    ▼                          ▼
   │   静态商品目录 src/lib/catalog          Stripe Checkout Session      Stripe Webhook
   │   (商品/系列/价格，构建期数据)        (服务端权威「购物车」)          (验签 → 落库订单)
   └────────▶ 商品页/购物车/直达结账（客户端，只读目录，不信任客户端价格）
```

分层职责：

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 静态目录 | `src/lib/catalog/` | 商品 / 系列 / 图片 / 价格，构建期数据（阶段 1 商品来源） |
| 服务层 | `src/server/checkout/`、`src/server/orders/`、`src/server/webhooks/` | 结账、订单落库、webhook 验签与幂等 |
| 数据层 | `src/server/db/` | Drizzle schema（`schema.ts`）与客户端（`client.ts`，隔离驱动） |
| API | `src/app/api/` | route handlers，薄封装，只做校验 + 调用服务层 |

---

## 2. 三个最关键决策（先读结论）

1. **商品目录用静态数据文件，订单/结算走数据库。** 商品是低频变更的小规模数据，静态文件
   类型安全、零查询延迟、随 git 走、构建期校验；运行时写入的订单/结算会话才是数据库的职责。
2. **购物车放客户端（localStorage），Checkout Session 是服务端唯一权威「购物车」。** 参考
   casetify「点形象 → 直达结账」，不强求登录与跨设备同步；结算金额一律以服务端目录为准，
   **忽略客户端传来的任何价格字段**。
3. **订单只在 Stripe webhook 验签成功后落库。** 以 `stripe_session_id` 唯一约束 + `event.id`
   幂等键双保险，保证同一笔支付绝不重复写单；success 页只做展示，不承担落库职责。

---

## 3. 决策一：静态数据文件 vs 数据库存商品

### 3.1 论证

| 维度 | 静态数据文件（`src/lib/catalog/`） | 数据库存商品（`products` 表） |
| --- | --- | --- |
| 数据规模 | Offy 目录约 29 个形象 + 若干系列，量级 ≤ 10² | 适合千级以上 SKU |
| 变更频率 | 低频（上新品 = 发版），品牌方离线提供 | 需要后台实时增删改 |
| 类型安全 | 直接 import TS 类型，编译期校验 | 运行期查库，需 zod/Drizzle 推断 |
| 构建复杂度 | 零迁移、零种子，纯模块 | 需迁移 + 种子 + 查询封装 |
| 查询延迟 | 0（构建期内联） | 每次请求打 DB |
| 多环境一致性 | 随代码仓库天然一致 | 需 seed 保证 |
| 结算可信度 | 服务端同一份源码，天然可信 | 需防篡改 + 服务端查询 |
| 未来扩展 | 商品量大 / 后台管理 / 库存 / 搜索时迁移到 DB | 天然支持 |

### 3.2 推荐

**阶段 1（本里程碑）：商品目录用静态数据文件。** 理由：

- 目录小、低频、品牌方离线提供（简报 §9 甚至还在等价格），静态文件最省事、最稳。
- 价格是「构建期资产」，不是「运行期状态」——没有库存、没有秒杀，不需要数据库事务。
- 客户端（商品页/购物车）与服务端（checkout 计价）**共享同一份 `src/lib/catalog`**，类型与
  数据天然一致，避免「DB 里的价」与「页面上的价」漂移。

**但数据库侧仍预留 `products` / `product_images` / `variants` / `categories` 表 schema**
（见 §4），并在 `src/lib/catalog` 暴露一个窄接口（`getProductByCode` / `listProducts` /
`toStripeLineItem`）。未来切到 DB 时，**只换 catalog 的实现（从静态数组换成 DB 查询）**，
上层页面与 API 签名不变。这就是「静态先行、DB 预留、接口隔离」的渐进策略。

### 3.3 静态目录结构建议

```
src/lib/catalog/
  types.ts        # Category / Product / Variant / Price 类型
  products.ts     # 静态商品数据（数组，code 唯一）
  categories.ts   # 静态系列数据
  index.ts        # 查询函数 + Stripe line_item 转换（纯函数，可测试）
```

`products.ts` 示例（占位价格，真实价格来自简报 §9 后续补齐）：

```ts
import type { Product } from "./types";

export const products: Product[] = [
  {
    code: "PCOF1-F0",
    slug: "pcpf1-f0",
    categoryCode: "bag-charm",
    name: { en: "Offy Fashionable Bag Charm", zh: "Offy 时尚包挂" },
    description: { en: "...", zh: "..." },
    priceCents: 3999,            // USD 39.99，以「分」为整数单位
    currency: "usd",
    dimensions: { heightCm: 18, lengthCm: 7.5, headCm: 24, armCm: 3.5, legCm: 3.5 },
    images: [{ src: "/products/<file>.png", alt: "Offy bag charm" }],
    available: true,
  },
  // ...
];
```

> 约定：价格一律存整数 `priceCents`（USD 分），避免浮点；展示层再 `/100`。

---

## 4. 数据模型（Drizzle schema）

沿用 `src/server/db/schema.ts` 的 `sqlite-core` 写法（与现有 `newsletter_subscribers` 一致），
字段类型选择 SQLite/PostgreSQL 通用子集（`integer` / `text` / `integer(timestamp)`），降低未来
切 PostgreSQL 的迁移成本。现有 `newsletter_subscribers` 保留不动。

### 4.1 目录类（阶段 1 预留，暂由静态文件承载）

```ts
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

/** 系列（对应品牌手册 §5.2 的系列）。阶段 1 由静态 categories.ts 承载。 */
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),      // "bag-charm" | "signature-plush" | ...
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** 商品 = 一个 Offy 形象/款式（可购买单元，1:1 对应一个 Stripe Price）。 */
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),      // "PCOF1-F0"（品牌手册编码）
  slug: text("slug").notNull().unique(),
  categoryId: integer("category_id").references(() => categories.id),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh").notNull(),
  descriptionEn: text("description_en"),
  descriptionZh: text("description_zh"),
  priceCents: integer("price_cents").notNull(), // 整数分，USD
  currency: text("currency").notNull().default("usd"),
  // 经典 18cm 尺寸规格（PCOF1 通用，可空）
  heightCm: integer("height_cm"),
  lengthCm: integer("length_cm"),
  headCm: integer("head_cm"),
  armCm: integer("arm_cm"),
  legCm: integer("leg_cm"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const productImages = sqliteTable("product_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  src: text("src").notNull(),                 // "/products/<file>.png"（public/ 内路径）
  alt: text("alt"),
  position: integer("position").notNull().default(0),
});

/**
 * 变体（形象/款式维度：尺寸、材质、配色）。阶段 1 通常 1 个商品 = 1 个变体，可空表预留。
 * priceCents 为 NULL 时继承 product.priceCents；stripePriceId 用于预建 Price（可选）。
 */
export const variants = sqliteTable(
  "variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    nameEn: text("name_en").notNull(),
    nameZh: text("name_zh").notNull(),
    size: text("size"),                       // "18cm" | "large" | null
    material: text("material"),               // "eco-recycled" | "metal" | null
    priceCents: integer("price_cents"),       // NULL = 继承 product
    stripePriceId: text("stripe_price_id"),   // 可选：预建 Price，否则用内联 price_data
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);
```

> 领域建模说明：Offy 的「每个形象/款式」天然是独立 SKU（独立价格 + 独立图），所以**推荐把
> 「形象/款式」映射到 `products`**（与 Stripe Price 1:1），`variants` 只留给真正的变体维度
> （尺寸 / 材质 / 配色）。若未来某个形象要出「18cm vs 大号」两种，则用 `variants` 表达，不新增
> product。这是与用户「variants(形象/款式)」表述的对齐 + 澄清。

### 4.2 交易类（阶段 1 落库，本里程碑核心）

```ts
/** 每次 Checkout Session 创建即记一行，覆盖「已创建未支付」态。 */
export const checkoutSessions = sqliteTable("checkout_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | completed | expired
  currency: text("currency").notNull().default("usd"),
  amountTotalCents: integer("amount_total_cents"), // webhook 回填
  customerEmail: text("customer_email"),
  clientReferenceId: text("client_reference_id"),  // 服务端生成的幂等/追踪键
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

/** 订单：仅在 webhook 验签成功后写入。 */
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(), // "OF-2026-000001"
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  email: text("email").notNull(),
  customerName: text("customer_name"),
  currency: text("currency").notNull().default("usd"),
  subtotalCents: integer("subtotal_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("paid"), // paid | refunded | failed
  paidAt: integer("paid_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

/** 订单行：对下单时点的商品信息做快照（编码、名称、单价），与静态目录解耦。 */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productCode: text("product_code").notNull(),   // 快照，回链静态目录
    variantCode: text("variant_code"),
    nameEn: text("name_en").notNull(),
    nameZh: text("name_zh").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);
```

### 4.3 关系图

```
categories 1 ──── n products 1 ──── n product_images
                        │
                        └──── n variants

checkoutSessions (stripe_session_id 唯一)   ──1:1──▶ orders (stripe_session_id 唯一)
                                                       │
                                                       └── 1:n ── order_items
```

### 4.4 购物车：客户端 vs 服务端

**推荐：客户端购物车（localStorage），不建 `cart` 表。**

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| 客户端 localStorage | 零后端、零登录、直达结账贴合 casetify 交互 | 换设备/浏览器不同步 |
| 服务端 cart 表 | 跨设备同步、库存预留、弃单分析 | 需要会话/用户、复杂度上升 |

阶段 1 无登录、无库存、单页直达结账，购物车只是「选中形象 + 数量」的短暂浏览器状态，
Stripe Checkout Session 本身就是服务端权威购物车。**未来**若要做多设备同步或弃单挽回，再加
`cart` / `cart_items`（含 `sessionToken`、`expiresAt`）——届时走 spec-first 提 delta。

---

## 5. API 设计

统一约定：JSON body；错误结构 `{ "error": "<machine_code>", "message": "<human text>" }`；
服务端所有 route handler 置 `export const dynamic = "force-dynamic"`（与 newsletter 一致，
避免被静态化/缓存）。

### 5.1 `GET /api/products` — 商品列表

从静态目录读取，支持可选过滤。

请求：无 body；可选 query `?category=bag-charm&locale=zh`（阶段 1 可先忽略 locale，目录同时带中英）。

响应 `200`：

```json
{
  "products": [
    {
      "code": "PCOF1-F0",
      "slug": "pcpf1-f0",
      "name": { "en": "Offy Fashionable Bag Charm", "zh": "Offy 时尚包挂" },
      "description": { "en": "...", "zh": "..." },
      "price": { "currency": "usd", "amountCents": 3999 },
      "category": { "code": "bag-charm", "name": { "en": "...", "zh": "..." } },
      "dimensions": { "heightCm": 18, "lengthCm": 7.5, "headCm": 24 },
      "images": [{ "src": "/products/x.png", "alt": "..." }],
      "available": true
    }
  ],
  "categories": [
    { "code": "bag-charm", "name": { "en": "...", "zh": "..." } }
  ]
}
```

### 5.2 `GET /api/products/[code]` — 单个商品

响应 `200`（同上单个 product 对象）；`404 { "error": "product_not_found" }`。

### 5.3 `POST /api/checkout/session` — 创建 Stripe Checkout

请求：

```json
{
  "items": [
    { "code": "PCOF1-F0", "quantity": 1 },
    { "code": "PCOF1-A3", "quantity": 2 }
  ],
  "locale": "zh"
}
```

服务端行为：

1. zod 校验：`items` 非空、`code` 字符串、`quantity` 为 1–99 整数（`locale` 可选）。
2. 对每个 `code` 调 `getProductByCode` 取**服务端**价格与名称；未知 code → `400 invalid_items`。
3. 以服务端价格构建 Stripe `line_items`（`price_data` 内联，`unit_amount` = priceCents 整数分）。
4. 生成 `client_reference_id`（如 `session_<uuid>`），调用 Stripe `checkout.sessions.create`。
5. 在 `checkoutSessions` 记一行（status=pending，幂等/追踪用）。
6. 返回跳转 URL。

响应 `200`：

```json
{ "url": "https://checkout.stripe.com/c/pay/cs_test_..." }
```

错误：`400 { "error": "invalid_request" }`、`400 { "error": "invalid_items" }`、
`503 { "error": "payment_not_configured" }`（未配置 Stripe key）、`502 { "error": "stripe_error" }`。

### 5.4 `POST /api/webhooks/stripe` — Stripe 事件回调

请求：Stripe 原始 body（`application/json`）+ 头 `stripe-signature`。响应 `200 { "received": true }`；
验签失败 `400 { "error": "invalid_signature" }`。详见 §6.4。

### 5.5 `GET /api/orders/by-session/[sessionId]` — success 页回查订单

用于 success 页确认订单是否已由 webhook 落库（应对「webhook 未到但用户已跳回 success」的竞态）。

响应 `200 { "order": { "orderNumber": "OF-2026-000001", "status": "paid", "totalCents": 3999 } }`
或 `404 { "error": "order_not_found" }`（尚未落库 → 前端轮询重试）。

> API 清单汇总：`GET /api/products`、`GET /api/products/[code]`、
> `POST /api/checkout/session`、`POST /api/webhooks/stripe`、`GET /api/orders/by-session/[sessionId]`。

---

## 6. Stripe 集成

### 6.1 依赖

`dependencies` 新增 `stripe`（官方 SDK）。初始化放在 `src/server/stripe/client.ts`：

```ts
import Stripe from "stripe";
import { env } from "../../lib/env";

export function getStripe(): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
}
```

### 6.2 Checkout Session 创建流程（时序）

```
客户端                     POST /api/checkout/session                  Stripe
  │  items:[{code,qty}]  ─────────────────▶ 校验 + 服务端计价            │
  │                                           getProductByCode           │
  │                                           line_items(price_data)     │
  │                                           checkout.sessions.create ──▶│
  │  { url }  ◀──────────────────────────────────────────────────────────│
  │  location.href = url ───────────────────────────────────────────────▶│
  │  (支付成功后)  success_url?session_id=... ◀──────────────────────────│
  │                              + 异步 webhook checkout.session.completed
```

关键参数：

```ts
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  currency: "usd",
  line_items: items.map((i) => ({
    quantity: i.quantity,
    price_data: {
      currency: "usd",
      unit_amount: i.priceCents,          // 整数分
      product_data: {
        name: i.name.en,                  // 或按 locale 选语言
        // metadata: { code: i.code }     // 便于对账
      },
    },
  })),
  client_reference_id,                     // 幂等/追踪键
  customer_email: undefined,               // 阶段 1 不预设，让 Stripe 收集
  success_url: `${env.SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${env.SITE_URL}/checkout/cancel`,
  metadata: { source: "offy-store", locale },
});
```

### 6.3 价格：USD 分（cents）

- Stripe `unit_amount` 是**最小货币单位的整数**：USD 用「分」。`USD 39.99` → `3999`。
- 全链路统一 `priceCents: integer`（目录、schema、订单快照、Stripe），**绝不使用浮点 `number`**。
- 展示层（前端）用 `amountCents / 100` 格式化，仅作显示。

### 6.4 Webhook：验签 + 幂等

```ts
// src/app/api/webhooks/stripe/route.ts
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();            // 必须 raw body，勿用 request.json()
  const signature = request.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  await handleEvent(event);                        // 幂等处理
  return NextResponse.json({ received: true });
}
```

**验签要点**：

- 用 `request.text()` 取原始字节；`request.json()` 会重序列化、破坏 HMAC 验签。
- `STRIPE_WEBHOOK_SECRET`（`REPLACE_WITH_STRIPE_WEBHOOK_SECRET`）必须来自 Stripe Dashboard，本地用 `stripe listen`
  转发的临时 secret。
- 只信任验签通过的 event；验签失败一律 `400`，不得落库。

**幂等要点（双保险）**：

1. **event.id 去重**：`handleEvent` 先查 `checkoutSessions` / `orders` 是否已处理该
   `stripe_session_id`，已存在则直接 `return`（重复投递安全）。
2. **唯一约束兜底**：`orders.stripeSessionId` 与 `checkoutSessions.stripeSessionId` 均
   `unique`；插入用 `onConflictDoNothing()`，即使并发重投也只落一行。

处理的事件类型（阶段 1 最小集）：

| 事件 | 处理 |
| --- | --- |
| `checkout.session.completed` | 落库订单（§7），更新 checkoutSessions → completed |
| `checkout.session.expired` | checkoutSessions → expired |
| `payment_intent.payment_failed` | （可选）checkoutSessions 标记失败，发告警 |

---

## 7. 订单模型（webhook 落库）

`checkout.session.completed` 到达且验签通过后，在一个事务内：

1. 从 `session` 读取：`id`（= stripe_session_id）、`customer_details.email`、
   `amount_total`（总价分）、`currency`、`payment_status`（须为 `paid` 才落单）、
   `line_items`（用 `expand: ["line_items"]` 或单独 `listLineItems` 拉取）。
2. 生成人类可读 `orderNumber`：`OF-<yyyy>-<6位自增>`（用 `orders` 计数 + 唯一重试，或
   `nanoid` 前缀，保证唯一）。
3. 写入 `orders` 一行：金额、货币、`stripe_session_id`、`status=paid`、邮箱、`paid_at`。
4. 展开 `line_items` 写 `order_items` 多行：对每个 item 记 `productCode`（取自
   `price.product.metadata.code` 或映射）、名称快照、`unit_price_cents`、`quantity`、
   `line_total_cents`。
5. 更新 `checkoutSessions` → `completed` + `completedAt` + `customerEmail`。

**快照原则**：`order_items` 保存下单时点的商品名与单价快照，不回查静态目录——目录未来变更
不影响历史订单的真实性。

**金额校验**：`orders.totalCents` 一律取自 Stripe webhook 的 `amount_total`（Stripe 是资金
事实源），仅用于对账比照服务端预期；**绝不**用客户端提交值。

**伪代码**：

```ts
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;
  const db = getDb();
  db.transaction((tx) => {
    const inserted = tx
      .insert(orders)
      .values({
        orderNumber: nextOrderNumber(tx),
        stripeSessionId: session.id,
        email: session.customer_details?.email ?? "unknown@offy.dev",
        currency: session.currency ?? "usd",
        subtotalCents: session.amount_subtotal ?? session.amount_total ?? 0,
        totalCents: session.amount_total ?? 0,
        status: "paid",
        paidAt: new Date(),
      })
      .onConflictDoNothing()                       // 幂等：已存在则不重复
      .returning({ id: orders.id })
      .get();

    if (!inserted) return;                         // 重复 webhook，直接跳过
    // 写 order_items（快照）...
    tx.update(checkoutSessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(checkoutSessions.stripeSessionId, session.id));
  });
}
```

---

## 8. 环境变量

新增 Stripe 相关变量；遵循「服务端密钥只在服务端、客户端只用 `NEXT_PUBLIC_*`」约定。

### 8.1 `.env.example` 追加

```dotenv
# ---------------------------------------------------------------------------
# Stripe (test mode). STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET 只在服务端读取；
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 才会暴露给浏览器。
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY=REPLACE_WITH_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=REPLACE_WITH_STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=REPLACE_WITH_STRIPE_PUBLISHABLE_KEY

# Stripe 重定向地址以服务端 SITE_URL 为准（success/cancel 跳转），
# 不依赖客户端可篡改的 NEXT_PUBLIC_SITE_URL。
SITE_URL=http://localhost:3000
```

`.env.production.example` 同理追加，`SITE_URL=https://offy.example.com`、key 换成 live（现阶段
仍测试模式则保持 test key）。

### 8.2 `src/lib/env.ts` 扩展（zod）

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_PROVIDER: z.enum(["sqlite", "postgres"]).default("sqlite"),
  DATABASE_URL: z.string().default("./data/offy.db"),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  STRIPE_SECRET_KEY: z.string().optional(),        // 缺省时 checkout 返回 503
  STRIPE_WEBHOOK_SECRET: z.string().optional(),    // 缺省时 webhook 拒绝
});
```

> `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 由 Next 直接注入客户端，无需进 `env.ts`（服务端逻辑不用它）。

---

## 9. 安全与边界

1. **金额以服务端为准**：`POST /api/checkout/session` 只接受 `{ code, quantity }`，
   **不接收任何客户端价格**；`unit_amount` 一律来自 `src/lib/catalog` 的服务端计价。
2. **数量/输入白名单**：`quantity` clamp 到 1–99；`code` 必须命中目录白名单；未知 code 拒绝。
3. **Webhook 验签**：raw body + `constructEvent` + `STRIPE_WEBHOOK_SECRET`；失败即 `400`，不落库。
4. **幂等**：`event.id` / `stripe_session_id` 去重 + 唯一约束 + `onConflictDoNothing`，重复投递安全。
5. **密钥隔离**：`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` 仅服务端；客户端只用
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`。
6. **固定币种**：全站 `usd`，`currency` 写死默认值，避免币种混淆。
7. **不信任 success 页**：落库只由 webhook 完成；success 页通过 `GET /api/orders/by-session/...`
   轮询确认，处理「webhook 迟到」竞态。
8. **HTTPS**：Stripe 回调与重定向强制 HTTPS（部署层保证）。
9. （可选）对 `checkout` / `webhook` 加轻量限流与请求体大小上限。

---

## 10. 测试策略（TDD 切入点）

按 AGENTS.md 放置规则：

| 目标 | 位置 | 说明 |
| --- | --- | --- |
| 目录计价/转换 | `src/lib/catalog/*.test.ts` | `toStripeLineItem`、`getProductByCode` 纯函数 |
| 结账服务 | `src/server/checkout/*.test.ts` | 注入 mock Stripe，断言服务端计价、忽略客户端价格 |
| webhook 幂等 | `src/server/webhooks/*.test.ts` | 内存 SQLite（`// @vitest-environment node`），重复 event 只落一行 |
| 订单落库 | `src/server/orders/*.test.ts` | 事务 + 快照 + 唯一约束 |

关键用例：① 客户端传 `price=1` 被忽略、仍按目录价；② 同一 `stripe_session_id` 两次 webhook 仅
生成 1 单；③ 验签失败不落库；④ 未知 code 返回 400。

---

## 11. 实施路线（与 spec-first 对齐）

1. **提案**：`openspec/changes/add-commerce-server/`，delta 更新
   `openspec/specs/commerce/spec.md`（把 4 条 `Reserved` 落成 `ADDED Requirements`：
   catalog / checkout session / webhook order capture / payment abstraction）。
2. **TDD 实现顺序**：静态目录与计价 → `GET /api/products` → `POST /api/checkout/session`
   （Stripe 测试模式）→ `POST /api/webhooks/stripe` 落库 → success 页回查。
3. **DB 迁移**：`pnpm db:generate` 生成 orders / checkoutSessions / orderItems（预留目录表），
   `pnpm db:migrate` 应用。
4. **本地联调**：`stripe listen --forward-to localhost:3000/api/webhooks/stripe` 转发事件。
5. **归档**：全绿后 `pnpm exec openspec archive add-commerce-server`。

> 本里程碑商品目录用静态文件，故 products/categories/variants/product_images 暂不建迁移
> （或按需建空表预留），避免「DB 与静态文件双源」漂移。等目录迁入 DB 时再生成迁移。
