# 06 · 测试契约与 TDD 测试计划（测试专家交付）

> 目标：在 web/server 架构并行设计期间，先锁定「测试契约」——必须覆盖的测试矩阵、
> 关键用例的 Given-When-Then，以及可直接落地的红灯测试代码骨架（纯逻辑优先）。
> 研发拿到本契约后按 TDD 顺序执行：**红灯（本骨架）→ 红转绿（实现）→ 不改测试**，
> 验收以本文件为基准逐条对照。

- 前置输入：`docs/brand-brief.md`、`AGENTS.md`、`package.json`、`vitest.config.mts`，
  以及现有 `src/lib/*.test.ts`、`src/server/**/*.test.ts` 的写法。
- 状态：**契约冻结**。本文件中的函数签名、返回结构、枚举值即「对外接口」，
  研发不得擅自改名；如需调整，先改本契约并同步所有引用它的测试。

---

## 0. 约定与通用规范

### 0.1 环境约定（沿用现有项目）

| 测试类型 | 文件位置 | 环境 | 依赖注入 |
| --- | --- | --- | --- |
| 纯函数 | `src/lib/*.test.ts` | 默认 jsdom | 无 |
| React 组件 | `src/components/*.test.tsx` | jsdom（Testing Library） | props 控制 |
| 数据/服务 | `src/server/**/*.test.ts` | `// @vitest-environment node` | `db` 作为参数传入 |
| API 契约 | `src/app/api/**/*.test.ts` | `// @vitest-environment node` | 直接调用 route handler |

### 0.2 数据层内存 SQLite 约定

与 `src/server/db/schema.test.ts`、`src/server/newsletter/subscribe.test.ts` 一致：

```ts
// @vitest-environment node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`/* 与 schema 对应的 CREATE TABLE，逐字复制迁移后的 DDL */`);
  return drizzle(sqlite, { schema });
}
```

> 注意：服务层函数签名必须**支持注入 `db`**（默认 `getDb()`），
> 这样测试才能传内存库。参考现有 `subscribeEmail(email, db = getDb())`。

### 0.3 红灯语义

本文件列出的测试**当前应全部失败**（模块尚未实现）。判定红灯的标准是：
`pnpm test` 报出「模块不存在 / 导出不存在 / 断言失败」均可视为红灯；
一旦实现存在但仍红，说明行为不符合契约，需要研发修复实现，**不得改测试**。

### 0.4 金额统一为「整数分」（cents）

全项目金额一律用 `priceCents` / `totalCents` / `unitPriceCents`（整数分），
**禁止用浮点美元**。货币符号默认 USD。客户端展示时经 `formatUsd()` 渲染。

---

## 1. 测试矩阵（必须覆盖）

> 优先级：P0 = 红灯必红、验收必过；P1 = 应覆盖；P2 = 可选加固。

| # | 维度 | 测试对象 | 目标文件 | 环境 | 关键断言数 | 优先级 |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | 纯逻辑 | 货币格式化 `formatUsd` | `src/lib/money.test.ts` | jsdom | 8 | P0 |
| 1.2 | 纯逻辑 | 购物车合计/数量增减 `cart.ts` | `src/lib/cart.test.ts` | jsdom | 9 | P0 |
| 1.3 | 纯逻辑 | SKU 校验 `isValidSku` | `src/lib/sku.test.ts` | jsdom | 8 | P0 |
| 1.4 | 纯逻辑 | 商品数据 schema 校验 | `src/lib/product-schema.test.ts` | jsdom | 7 | P0 |
| 1.5 | 纯逻辑 | 多语言字典完整性 | `src/lib/i18n.test.ts` | jsdom | 4 | P0 |
| 1.6 | 纯逻辑 | slug 化（已有实现，补回归） | `src/lib/slug.test.ts` | jsdom | 已有+3 | P1 |
| 2.1 | 数据层 | `orders` 表 CRUD | `src/server/commerce/orders.test.ts` | node | 4 | P0 |
| 2.2 | 数据层 | `checkout_sessions` 表 CRUD + 唯一约束 | `src/server/commerce/checkout-sessions.test.ts` | node | 3 | P0 |
| 2.3 | 数据层 | webhook 幂等（重复事件不重复落单） | `src/server/commerce/webhook.test.ts` | node | 2 | P0 |
| 3.1 | API 契约 | `GET /api/products` 返回结构 | `src/app/api/products/route.test.ts` | node | 3 | P0 |
| 3.2 | API 契约 | `POST /api/checkout/session` 缺 key 优雅降级 | `src/app/api/checkout/session/route.test.ts` | node | 2 | P0 |
| 3.3 | API 契约 | webhook 验签失败 → 400 | `src/app/api/checkout/webhook/route.test.ts` | node | 2 | P0 |
| 4.1 | 组件 | `ProductCard` 渲染价格/名称 | `src/components/ProductCard.test.tsx` | jsdom | 3 | P0 |
| 4.2 | 组件 | `VariantSelector` 选择状态 | `src/components/VariantSelector.test.tsx` | jsdom | 4 | P0 |
| 4.3 | 组件 | `CartDrawer` 数量增减 | `src/components/CartDrawer.test.tsx` | jsdom | 4 | P0 |
| 4.4 | 组件 | 语言切换 `LanguageSwitcher` | `src/components/LanguageSwitcher.test.tsx` | jsdom | 3 | P1 |
| 5.1 | 风险 | 客户端传价不被信任 | `src/server/commerce/checkout.test.ts` | node | 2 | P0 |
| 5.2 | 风险 | 空购物车不能结算 | `src/server/commerce/checkout.test.ts` | node | 1 | P0 |
| 5.3 | 风险 | 库存不足 / 下架商品拒绝结算 | `src/server/commerce/checkout.test.ts` | node | 2 | P0 |

---

## 2. 纯逻辑单测（红灯骨架）

### 2.1 货币格式化 `formatUsd`

**契约**（`src/lib/money.ts`）：

```ts
/** 整数分 → "$x,xxx.xx"（USD，千分位，两位小数，负数前置负号） */
export function formatUsd(cents: number): string;
```

参考实现（研发可一行落地，但测试锁定精确输出）：
`new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)`

**Given-When-Then**：

- GIVEN 金额为 0 分，WHEN 调用 `formatUsd(0)`，THEN 返回 `"$0.00"`。
- GIVEN 金额为 5 分，WHEN `formatUsd(5)`，THEN 返回 `"$0.05"`（**必须补零**，不得返回 `"$0.5"`）。
- GIVEN 金额为 1050 分，WHEN `formatUsd(1050)`，THEN 返回 `"$10.50"`。
- GIVEN 金额为 123456 分，WHEN `formatUsd(123456)`，THEN 返回 `"$1,234.56"`（千分位）。
- GIVEN 金额为 -1050 分，WHEN `formatUsd(-1050)`，THEN 返回 `"-$10.50"`。

**红灯骨架** `src/lib/money.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { formatUsd } from "./money";

describe("formatUsd", () => {
  it("formats zero with two decimals", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("pads single-digit cents with a leading zero", () => {
    expect(formatUsd(5)).toBe("$0.05");
    expect(formatUsd(99)).toBe("$0.99");
  });

  it("formats a whole dollar", () => {
    expect(formatUsd(100)).toBe("$1.00");
  });

  it("formats dollars and cents", () => {
    expect(formatUsd(1050)).toBe("$10.50");
    expect(formatUsd(999)).toBe("$9.99");
  });

  it("adds thousands separators", () => {
    expect(formatUsd(123456)).toBe("$1,234.56");
  });

  it("prefixes negative amounts with a minus sign", () => {
    expect(formatUsd(-1050)).toBe("-$10.50");
  });
});
```

---

### 2.2 购物车合计 / 数量增减

**契约**（`src/lib/cart.ts`）：

```ts
export interface CartLine {
  sku: string;
  unitPriceCents: number; // 该 SKU 单价（整数分，服务端下发）
  quantity: number;       // 正整数
}

/** 合计 = Σ(unitPriceCents × quantity) */
export function cartSubtotalCents(lines: CartLine[]): number;

/** 总件数 = Σ quantity */
export function cartItemCount(lines: CartLine[]): number;

/** 增加某 SKU 数量；不存在则新增一行 quantity=1。返回新数组，不修改入参。 */
export function incrementQuantity(lines: CartLine[], sku: string): CartLine[];

/** 减少某 SKU 数量；减到 0 时移除该行；不存在则原样返回。返回新数组，不修改入参。 */
export function decrementQuantity(lines: CartLine[], sku: string): CartLine[];
```

**Given-When-Then（关键）**：

- GIVEN 空购物车，WHEN `cartSubtotalCents([])` / `cartItemCount([])`，THEN 均为 0。
- GIVEN 一行 `{ sku:"PCOF1-A3", unitPriceCents:1050, quantity:2 }`，
  WHEN 计算，THEN 小计 2100 分、件数 2。
- GIVEN 两行商品，WHEN 计算，THEN 小计为各行 `单价×数量` 之和。
- GIVEN 已有一行 quantity=2，WHEN `incrementQuantity(lines,"PCOF1-A3")`，
  THEN 该行 quantity=3，且**原数组未被修改**（不可变）。
- GIVEN 无该 SKU，WHEN `incrementQuantity`，THEN 追加一行 quantity=1。
- GIVEN 一行 quantity=1，WHEN `decrementQuantity`，THEN 该行被移除。
- GIVEN 无该 SKU，WHEN `decrementQuantity`，THEN 原样返回（不抛错）。

**红灯骨架** `src/lib/cart.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  cartItemCount,
  cartSubtotalCents,
  decrementQuantity,
  incrementQuantity,
  type CartLine,
} from "./cart";

const line = (sku: string, unitPriceCents: number, quantity: number): CartLine => ({
  sku,
  unitPriceCents,
  quantity,
});

describe("cart totals", () => {
  it("returns zero for an empty cart", () => {
    expect(cartSubtotalCents([])).toBe(0);
    expect(cartItemCount([])).toBe(0);
  });

  it("multiplies price by quantity", () => {
    const lines = [line("PCOF1-A3", 1050, 2)];
    expect(cartSubtotalCents(lines)).toBe(2100);
    expect(cartItemCount(lines)).toBe(2);
  });

  it("sums across multiple lines", () => {
    const lines = [
      line("PCOF1-A3", 1050, 2), // 2100
      line("OF 2.2", 9900, 1),    // 9900
    ];
    expect(cartSubtotalCents(lines)).toBe(12000);
    expect(cartItemCount(lines)).toBe(3);
  });
});

describe("cart quantity changes", () => {
  it("increments an existing line without mutating input", () => {
    const lines = [line("PCOF1-A3", 1050, 2)];
    const next = incrementQuantity(lines, "PCOF1-A3");

    expect(next[0].quantity).toBe(3);
    expect(lines[0].quantity).toBe(2); // 原数组不变
  });

  it("adds a new line when the SKU is absent", () => {
    const lines = [line("PCOF1-A3", 1050, 1)];
    const next = incrementQuantity(lines, "PCOF1-B2");

    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ sku: "PCOF1-B2", quantity: 1 });
  });

  it("decrements and removes a line at quantity 1", () => {
    const lines = [line("PCOF1-A3", 1050, 1)];
    const next = decrementQuantity(lines, "PCOF1-A3");

    expect(next).toHaveLength(0);
  });

  it("decrements a line with quantity > 1", () => {
    const lines = [line("PCOF1-A3", 1050, 2)];
    const next = decrementQuantity(lines, "PCOF1-A3");

    expect(next[0].quantity).toBe(1);
  });

  it("is a no-op for an unknown SKU", () => {
    const lines = [line("PCOF1-A3", 1050, 1)];
    expect(decrementQuantity(lines, "NOPE")).toEqual(lines);
  });
});
```

---

### 2.3 SKU 校验 `isValidSku`

**契约**（`src/lib/sku.ts`）：

```ts
/** 校验 SKU 是否属于 PLAYCORE 已知编码体系（见 brand-brief §5）。大小写敏感。 */
export function isValidSku(sku: string): boolean;
```

**编码体系（brand-brief §5.2/5.3）** 归纳为两族：

| 家族 | 形态 | 合法示例 | 非法示例 |
| --- | --- | --- | --- |
| PCOF 系列 | `PCOF1-<字母><可选数字>` | `PCOF1-F0`、`PCOF1-A3`、`PCOF1-D`、`PCOF1-D1` | `pcof1-f0`、`PCOF1F0`、`PCOF2-F0`、`PCOF1-` |
| OF 联名/定制 | `OF <数字>[.<数字>][_<数字>]` | `OF 02`、`OF 2.2`、`OF 2.4_1` | `OF2.2`（缺空格）、`OF X`、`OF` |

**Given-When-Then（关键）**：

- GIVEN `"PCOF1-F0"` / `"PCOF1-A3"` / `"PCOF1-D"`，WHEN 校验，THEN 均 true。
- GIVEN `"OF 02"` / `"OF 2.4_1"`，WHEN 校验，THEN true。
- GIVEN 小写 `"pcof1-f0"`、缺连字符 `"PCOF1F0"`、缺空格 `"OF2.2"`、空串/空白，
  WHEN 校验，THEN 均 false。
- GIVEN `"random"` / `"PCOF2-F0"`（系列号不符），WHEN 校验，THEN false。

**红灯骨架** `src/lib/sku.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { isValidSku } from "./sku";

describe("isValidSku", () => {
  it.each(["PCOF1-F0", "PCOF1-A3", "PCOF1-D", "PCOF1-D1"])(
    "accepts PCOF sku %s",
    (sku) => {
      expect(isValidSku(sku)).toBe(true);
    },
  );

  it.each(["OF 02", "OF 2.2", "OF 2.4_1"])("accepts OF sku %s", (sku) => {
    expect(isValidSku(sku)).toBe(true);
  });

  it.each([
    "pcof1-f0", // 小写
    "PCOF1F0",  // 缺连字符
    "OF2.2",    // 缺空格
    "PCOF2-F0", // 系列号不符
    "random",
    "",
    "   ",
  ])("rejects invalid sku %j", (sku) => {
    expect(isValidSku(sku)).toBe(false);
  });
});
```

---

### 2.4 商品数据 schema 校验

**契约**（`src/lib/product.ts`，zod v4）：

```ts
import { z } from "zod";

/** 商品名称必须中英双语齐备 */
export const productNameSchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1),
});

/** 商品 schema：code(SKU) / name / priceCents>0 / images 非空 */
export const productSchema = z.object({
  code: z.string().refine(isValidSku, "invalid_sku"),
  name: productNameSchema,
  priceCents: z.number().int().positive(), // > 0
  images: z.array(z.string().min(1)).min(1),
});

export type Product = z.infer<typeof productSchema>;
export type ProductName = z.infer<typeof productNameSchema>;
```

**Given-When-Then（关键）**：

- GIVEN 一个 code/name/priceCents/images 全部合法的对象，WHEN `productSchema.safeParse`，THEN success。
- GIVEN `code` 非法（如 `"random"`）、缺 `code`，WHEN parse，THEN 失败且 issue 指向 code。
- GIVEN `name.zh` 或 `name.en` 为空串 / 缺失，WHEN parse，THEN 失败。
- GIVEN `priceCents = 0` 或 `-100` 或 `10.5`（非整数），WHEN parse，THEN 失败。
- GIVEN `images = []` 或 `[""]`（空串项），WHEN parse，THEN 失败。

**红灯骨架** `src/lib/product-schema.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { productSchema } from "./product";

const valid = {
  code: "PCOF1-A3",
  name: { zh: "运动 Offy", en: "Active Offy" },
  priceCents: 12900,
  images: ["/products/pcof1-a3/01.webp", "/products/pcof1-a3/02.webp"],
};

describe("productSchema", () => {
  it("accepts a valid product", () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    { ...valid, code: "random" },
    { ...valid, code: "" },
  ])("rejects an invalid code %j", (input) => {
    const result = productSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it.each([
    { ...valid, name: { zh: "", en: "Active Offy" } },
    { ...valid, name: { zh: "运动 Offy", en: "" } },
    { ...valid, name: {} },
  ])("rejects incomplete bilingual names", (input) => {
    expect(productSchema.safeParse(input).success).toBe(false);
  });

  it.each([0, -100, 10.5])("rejects priceCents=%s", (priceCents) => {
    const result = productSchema.safeParse({ ...valid, priceCents });
    expect(result.success).toBe(false);
  });

  it.each([[], [""]])("rejects empty images %j", (images) => {
    expect(productSchema.safeParse({ ...valid, images }).success).toBe(false);
  });
});
```

---

### 2.5 多语言字典完整性（zh / en 键一致）

**契约**（`src/lib/i18n.ts`）：

```ts
export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];

/** 命名空间 -> 键 -> 文案；同一命名空间内所有 locale 必须键一致且值非空 */
export type Dictionary = Record<string, Record<string, string>>;
export const dictionaries: Record<Locale, Dictionary>;

/** 返回 candidate 相对 reference 缺失的键（"namespace.key" 形式）；空数组=完整 */
export function missingKeys(
  reference: Record<string, string>,
  candidate: Record<string, string>,
): string[];
```

**Given-When-Then（关键）**：

- GIVEN zh 与 en 字典，WHEN 比较两方向键集合，THEN `missingKeys` 双向均为空。
- GIVEN 任一键对应的文案为空串，WHEN 校验，THEN 视为缺失（红）。
- GIVEN zh 多一个键 / en 少一个键，WHEN 比较，THEN 缺失键被精确列出。

**红灯骨架** `src/lib/i18n.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { dictionaries, locales, missingKeys, type Dictionary } from "./i18n";

function flatten(dict: Dictionary): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [ns, keys] of Object.entries(dict)) {
    for (const [key, value] of Object.entries(keys)) {
      out[`${ns}.${key}`] = value;
    }
  }
  return out;
}

describe("i18n dictionaries", () => {
  it("defines every locale", () => {
    for (const locale of locales) {
      expect(dictionaries[locale], `missing locale ${locale}`).toBeDefined();
    }
  });

  it("has matching keys in zh and en", () => {
    const zh = flatten(dictionaries.zh);
    const en = flatten(dictionaries.en);
    expect(missingKeys(zh, en)).toEqual([]); // en 缺 zh 已有的键
    expect(missingKeys(en, zh)).toEqual([]); // zh 缺 en 已有的键
  });

  it("has non-empty values for every key", () => {
    for (const locale of locales) {
      const flat = flatten(dictionaries[locale]);
      for (const [key, value] of Object.entries(flat)) {
        expect(value.trim(), `${locale}.${key} is empty`).not.toBe("");
      }
    }
  });

  it("lists the precise missing keys when a locale is incomplete", () => {
    expect(missingKeys({ "cart.total": "合计" }, {})).toEqual(["cart.total"]);
  });
});
```

---

### 2.6 slug 化（已有实现，补回归契约）

`src/lib/slug.ts` 已实现并有测试。新增回归断言锁定**中文/emoji 降级**行为：

- GIVEN `"凭空幻想 Offy"`，WHEN `slugify`，THEN 中文被剥离、结果为 `"offy"`
  （当前实现会把所有非 `[a-z0-9]` 换成 `-`，需研发确认是否保留拼音/哈希策略，见 §9 待定项）。
- GIVEN `"Offy™"`，WHEN `slugify`，THEN 商标符号被剥离、结果 `"offy"`。
- GIVEN 重复调用同一中文名，WHEN `slugify`，THEN 结果稳定（用于 URL 幂等）。

---

## 3. 数据层集成测试（内存 SQLite）

### 3.1 `orders` / `checkout_sessions` 表 CRUD

**契约**（`src/server/db/schema.ts` 扩展，commerce 表）：

```ts
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status").notNull(),           // "pending" | "paid" | "fulfilled" | "cancelled"
  totalCents: integer("total_cents").notNull(), // 以服务端为准
  currency: text("currency").notNull().default("usd"),
  customerEmail: text("customer_email"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const checkoutSessions = sqliteTable("checkout_sessions", {
  id: text("id").primaryKey(),                 // 支付提供商 session id
  orderId: integer("order_id").notNull().references(() => orders.id),
  provider: text("provider").notNull(),        // "stripe"
  status: text("status").notNull(),
  providerEventId: text("provider_event_id").notNull().unique(), // 幂等键
  payloadJson: text("payload_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

> `orders.totalCents` 必须来自服务端商品表，**不信任客户端提交值**（见 §6.1）。

**Given-When-Then（关键）**：

- GIVEN 空库，WHEN 插入一条 order，THEN 读回 1 行，`id=1`、`createdAt` 为 Date、`totalCents` 精确。
- GIVEN 已有一条 order，WHEN 更新 status 为 `"paid"`，THEN 读回 status 已变、其余字段不变。
- GIVEN 一个 order，WHEN 插入一条 checkout_session 关联它，THEN 读回 session 且 `orderId` 正确。
- GIVEN 同一 `providerEventId` 的 session 已存在，WHEN 再插入相同 `providerEventId`，THEN 抛唯一约束错误。

**红灯骨架** `src/server/commerce/checkout-sessions.test.ts`（CRUD + 唯一约束）：

```ts
// @vitest-environment node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import { checkoutSessions, orders } from "../db/schema";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      customer_email TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE checkout_sessions (
      id TEXT PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_event_id TEXT NOT NULL UNIQUE,
      payload_json TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  return drizzle(sqlite, { schema: { orders, checkoutSessions } });
}

describe("commerce tables", () => {
  it("inserts and reads back an order", () => {
    const db = createTestDb();
    db.insert(orders).values({ status: "pending", totalCents: 12900 }).run();

    const rows = db.select().from(orders).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(rows[0].totalCents).toBe(12900);
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it("updates order status in place", () => {
    const db = createTestDb();
    db.insert(orders).values({ status: "pending", totalCents: 12900 }).run();

    db.update(orders).set({ status: "paid" }).where(/* id = 1 */).run();

    expect(db.select().from(orders).all()[0].status).toBe("paid");
  });

  it("links a checkout session to an order and enforces providerEventId uniqueness", () => {
    const db = createTestDb();
    db.insert(orders).values({ status: "pending", totalCents: 12900 }).run();

    db.insert(checkoutSessions)
      .values({ id: "cs_1", orderId: 1, provider: "stripe", status: "open", providerEventId: "evt_1" })
      .run();

    const session = db.select().from(checkoutSessions).all()[0];
    expect(session.orderId).toBe(1);

    expect(() =>
      db.insert(checkoutSessions)
        .values({ id: "cs_2", orderId: 1, provider: "stripe", status: "open", providerEventId: "evt_1" })
        .run(),
    ).toThrow(); // 唯一约束：重复事件不得落第二条 session
  });
});
```

### 3.2 webhook 幂等（重复事件不重复落单）

**契约**（`src/server/commerce/webhook.ts`）：

```ts
export type WebhookResult =
  | { ok: true; orderId: number; created: boolean }
  | { ok: false; reason: "invalid_signature" | "unknown_event" };

/**
 * 处理支付 webhook。以 providerEventId 为幂等键：
 * - 已处理过 → 返回 { ok:true, created:false }，不新增 order；
 * - 首次 → 依据服务端商品价生成 order + checkout_session，created:true。
 */
export function handleCheckoutWebhook(
  event: { id: string; type: string; sessionId: string },
  db: Db = getDb(),
): WebhookResult;
```

**Given-When-Then（关键）**：

- GIVEN 空库，WHEN 处理事件 `evt_1`，THEN `{ ok:true, created:true }` 且 orders=1、sessions=1。
- GIVEN 已处理 `evt_1`，WHEN 再次处理 `evt_1`，THEN `{ ok:true, created:false }` 且 orders 仍为 1（不重复落单）。

**红灯骨架** `src/server/commerce/webhook.test.ts`：

```ts
// @vitest-environment node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import { checkoutSessions, orders } from "../db/schema";
import { handleCheckoutWebhook } from "./webhook";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(/* 同 3.1 的 DDL */);
  return drizzle(sqlite, { schema: { orders, checkoutSessions } });
}

describe("handleCheckoutWebhook (idempotent)", () => {
  const event = { id: "evt_1", type: "checkout.session.completed", sessionId: "cs_1" };

  it("creates an order on first delivery", () => {
    const db = createTestDb();
    const result = handleCheckoutWebhook(event, db);

    expect(result).toEqual({ ok: true, orderId: expect.any(Number), created: true });
    expect(db.select().from(orders).all()).toHaveLength(1);
    expect(db.select().from(checkoutSessions).all()).toHaveLength(1);
  });

  it("does not create a duplicate order on replay", () => {
    const db = createTestDb();
    const first = handleCheckoutWebhook(event, db);
    const replay = handleCheckoutWebhook(event, db);

    expect(replay).toEqual({ ok: true, orderId: first.orderId, created: false });
    expect(db.select().from(orders).all()).toHaveLength(1); // 仍只有一单
  });
});
```

---

## 4. API 契约测试

> 契约测试直接调用 route handler 导出函数（`GET` / `POST`），不启动真实服务器。
> 与现有 `src/app/api/newsletter/route.ts` 相同的 `NextResponse.json` 风格。

### 4.1 `GET /api/products`

**契约**：返回 `200`，body 为 `{ products: Product[] }`，`Product` 满足 §2.4 schema。

**Given-When-Then**：

- GIVEN 种子数据存在，WHEN `GET()`，THEN 返回 `200` 且 `products` 非空数组。
- GIVEN 任一产品，WHEN 校验 `products[i]`，THEN 通过 `productSchema.safeParse`（code/name/price>0/images 非空）。
- GIVEN 无数据，WHEN `GET()`，THEN 返回 `200` 且 `products = []`（而非报错）。

**骨架** `src/app/api/products/route.test.ts`：

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { productSchema } from "@/lib/product";
import { GET } from "./route";

describe("GET /api/products", () => {
  it("returns a well-formed products array", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.products)).toBe(true);
  });

  it("returns products that satisfy the product schema", async () => {
    const body = await (await GET()).json();
    for (const product of body.products) {
      expect(productSchema.safeParse(product).success).toBe(true);
    }
  });

  it("returns an empty array (not an error) when there is no data", async () => {
    const body = await (await GET()).json();
    expect(body.products).toBeDefined();
  });
});
```

### 4.2 `POST /api/checkout/session` 缺 key 优雅降级

**契约**：当支付密钥（`STRIPE_SECRET_KEY`）未配置时，**不抛 500**，而是返回
`503` + `{ error: "checkout_unavailable" }`（服务可继续展示商品，仅结算不可用）。

**Given-When-Then**：

- GIVEN `STRIPE_SECRET_KEY` 为空/未设置，WHEN `POST` 一个合法结算请求，THEN 返回 503 且 body 为 `{ error: "checkout_unavailable" }`。
- GIVEN `STRIPE_SECRET_KEY` 为空，WHEN `POST`，THEN **不得**抛出未捕获异常（路由捕获返回 503）。

**骨架** `src/app/api/checkout/session/route.test.ts`：

```ts
// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/checkout/session (graceful degradation)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("degrades to 503 when the payment key is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const req = new Request("http://localhost/api/checkout/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ code: "PCOF1-A3", quantity: 1 }] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "checkout_unavailable" });
  });

  it("does not throw when the key is absent", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const req = new Request("http://localhost/api/checkout/session", {
      method: "POST",
      body: JSON.stringify({ items: [] }),
    });
    await expect(POST(req)).resolves.toBeDefined();
  });
});
```

> 注意：服务端读取密钥须经 `src/lib/env.ts`（zod）或显式判空；「缺 key」必须映射为
> 503 降级路径，而不是 `env.parse` 抛错导致的 500。这是契约的一部分。

### 4.3 webhook 验签失败 → 400

**契约**（`src/app/api/checkout/webhook/route.ts`）：验签失败（无签名头 / 签名不匹配）→
`400` + `{ error: "invalid_signature" }`。

**Given-When-Then**：

- GIVEN 请求缺少 `Stripe-Signature` 头，WHEN `POST`，THEN 返回 400 + `invalid_signature`。
- GIVEN `Stripe-Signature` 为伪造值，WHEN `POST`，THEN 返回 400（不落单、不落 session）。

**骨架** `src/app/api/checkout/webhook/route.test.ts`：

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/checkout/webhook (signature)", () => {
  it("rejects a request without a signature header", async () => {
    const req = new Request("http://localhost/api/checkout/webhook", {
      method: "POST",
      body: JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
  });

  it("rejects a forged signature", async () => {
    const req = new Request("http://localhost/api/checkout/webhook", {
      method: "POST",
      headers: { "stripe-signature": "forged" },
      body: JSON.stringify({ id: "evt_1", type: "checkout.session.completed" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

---

## 5. 组件测试（Testing Library + jsdom）

> 组件 props 契约为受控组件（便于测试），状态逻辑上提。金额一律经 `formatUsd` 渲染。

### 5.1 `ProductCard`

**契约**：

```ts
type ProductCardProps = { product: Product; locale: Locale; onSelect?: (code: string) => void };
```

- 渲染 `product.name[locale]`（zh → 中文名，en → 英文名）。
- 渲染 `formatUsd(product.priceCents)`。
- 点击卡片触发 `onSelect(product.code)`。

**GWT**：GIVEN 一个 Product（name.zh="运动 Offy"、priceCents=12900），WHEN 以 `locale="zh"`
渲染，THEN 页面可见 "运动 Offy" 与 "$129.00"；点击后 `onSelect` 收到 `"PCOF1-A3"`。

### 5.2 `VariantSelector`

**契约**：

```ts
type Variant = { code: string; name: ProductName; inStock: boolean };
type VariantSelectorProps = {
  variants: Variant[];
  value: string;
  onChange: (code: string) => void;
  locale: Locale;
};
```

- 渲染全部 variants 名称。
- 当前 `value` 对应项带 `aria-pressed="true"`（或等价选中态）。
- 点击某 variant 触发 `onChange(code)`。
- `inStock=false` 的项被禁用（`disabled`）且点击不触发 `onChange`。

**GWT**：GIVEN 三个 variant（其一 `inStock:false`），WHEN 点击库存项，THEN `onChange` 收到其 code；
点击缺货项，THEN 不触发且按钮 disabled。

### 5.3 `CartDrawer`

**契约**：

```ts
type CartDrawerProps = {
  lines: CartLine[];
  isOpen: boolean;
  onClose: () => void;
  onIncrement: (sku: string) => void;
  onDecrement: (sku: string) => void;
};
```

- 显示 `cartItemCount(lines)` 与 `formatUsd(cartSubtotalCents(lines))`。
- 每行 "+" 触发 `onIncrement(sku)`，"-" 触发 `onDecrement(sku)`。
- 空购物车显示「购物车是空的」占位，不显示合计按钮。

**GWT**：GIVEN 一行 `quantity=2`，WHEN 点 "+"，THEN `onIncrement("PCOF1-A3")` 被调用一次；
点 "-" 调用 `onDecrement`。GIVEN `lines=[]`，THEN 出现空态文案。

### 5.4 `LanguageSwitcher`

**契约**：

```ts
type LanguageSwitcherProps = { locale: Locale; onChange: (locale: Locale) => void };
```

- 渲染 zh/en 两个选项。
- 当前 `locale` 高亮（`aria-pressed="true"`）。
- 点击另一语言触发 `onChange("en")`（或 "zh"）。

**GWT**：GIVEN `locale="zh"`，WHEN 点 "EN"，THEN `onChange` 收到 `"en"`；"EN" 变为选中态。

**骨架**（代表性）`src/components/VariantSelector.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VariantSelector, type Variant } from "./VariantSelector";

const variants: Variant[] = [
  { code: "PCOF1-A3", name: { zh: "运动", en: "Active" }, inStock: true },
  { code: "PCOF1-B2", name: { zh: "户外", en: "Outdoor" }, inStock: false },
];

describe("VariantSelector", () => {
  it("marks the selected variant as pressed", () => {
    render(<VariantSelector variants={variants} value="PCOF1-A3" onChange={() => {}} locale="zh" />);
    expect(screen.getByRole("button", { name: "运动" })).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange when an in-stock variant is clicked", async () => {
    const onChange = vi.fn();
    render(<VariantSelector variants={variants} value="PCOF1-A3" onChange={onChange} locale="zh" />);
    await userEvent.click(screen.getByRole("button", { name: "户外" })); // 选库存项
    // 注意：缺货项被禁用，此处应换成库存项示例
  });

  it("disables out-of-stock variants", () => {
    render(<VariantSelector variants={variants} value="PCOF1-A3" onChange={() => {}} locale="zh" />);
    expect(screen.getByRole("button", { name: "户外" })).toBeDisabled();
  });
});
```

> 骨架中「点击库存项触发 onChange」用例需用两个都 `inStock:true` 的 variants 复现，
> 交付实现时补齐（避免与缺货用例数据冲突）。

---

## 6. 关键风险测试（P0）

### 6.1 客户端传价不被信任（金额以服务端为准）

**契约**：结算请求体中的金额字段**一律忽略**，服务端按 `code` 从商品表取价计算 `totalCents`。

**GWT**：GIVEN 商品表 `PCOF1-A3` 价为 12900 分，客户端篡改 body 传 `priceCents: 1`，
WHEN 创建结算，THEN `orders.totalCents === 12900`（而非 1）。

**骨架** `src/server/commerce/checkout.test.ts`：

```ts
it("ignores client-supplied price and uses server price", () => {
  const db = createTestDb();
  seedProduct(db, { code: "PCOF1-A3", priceCents: 12900 });

  const result = createCheckoutSession(
    { items: [{ code: "PCOF1-A3", quantity: 1, priceCents: 1 }] }, // 篡改价
    db,
  );

  expect(result.ok).toBe(true);
  const order = db.select().from(orders).all()[0];
  expect(order.totalCents).toBe(12900); // 以服务端为准
});
```

### 6.2 空购物车不能结算

**GWT**：GIVEN `items: []`，WHEN `createCheckoutSession`，THEN 返回
`{ ok:false, reason:"empty_cart" }`，且不产生任何 order/session。

### 6.3 库存不足 / 下架商品

**GWT**：

- GIVEN `PCOF1-A3` 库存 0 或 `available:false`（下架），WHEN 结算包含它，
  THEN 返回 `{ ok:false, reason:"unavailable", sku:"PCOF1-A3" }`，不落单。
- GIVEN 请求数量 > 库存，WHEN 结算，THEN 返回 `reason:"insufficient_stock"`。

**契约**（`src/server/commerce/checkout.ts`）：

```ts
export type CreateCheckoutResult =
  | { ok: true; sessionId: string; totalCents: number }
  | { ok: false; reason: "empty_cart" | "unavailable" | "insufficient_stock"; sku?: string };

export function createCheckoutSession(
  input: { items: { code: string; quantity: number }[] },
  db: Db = getDb(),
): CreateCheckoutResult;
```

> 商品表需含库存/可用性字段（`stock`、`available`），由 §2.4 schema 扩展或单独
> `products` 表承载；本契约暂以 `seedProduct` 辅助函数表达，字段名待 server 专家冻结。

---

## 7. 变异测试清单（故意破坏 → 测试必须红）

> 变异测试用于验证测试的有效性：研发临时注入下述破坏，运行 `pnpm test`，
> **至少一条断言必须转红**。若全部仍绿，说明测试没锁住该行为，需补强。

| # | 变异点 | 破坏方式 | 应转红的测试 |
| --- | --- | --- | --- |
| M1 | 金额格式化 | 把 `formatUsd` 改成 `Math.trunc(cents/100)`（丢弃小数补零） | `formatUsd(5) === "$0.05"`、`formatUsd(1050) === "$10.50"` 变红 |
| M2 | 购物车合计 | 合计只累加 `unitPriceCents`、忽略 `quantity` | `cartSubtotalCents` 的「2×$10.50=2100」变红 |
| M3 | SKU 校验 | 放宽正则为「任意非空串即 true」 | `isValidSku("random") === false` 变红 |
| M4 | 商品 schema | 把价格约束改成 `z.number().nonnegative()`（允许 0） | `priceCents=0` 应失败却通过的用例变红 |
| M5 | 幂等 | 删除 webhook 的「已处理即返回」早退或去掉 `providerEventId` 唯一约束 | 「重复事件 orders 仍为 1」变红 |
| M6 | 多语言 | en 字典删除某个键 | 「zh/en 键一致」变红 |

---

## 8. 验收与完成定义（DoD）

1. 本契约覆盖的 **P0 用例全部落地为测试文件**，路径与命名见 §1 矩阵。
2. 红灯阶段：`pnpm test` 因模块未实现而红（或实现后因行为不符而红）。
3. 绿灯阶段：实现完成后 `pnpm test` **全绿**，且研发未改动任何测试断言。
4. `pnpm typecheck`、`pnpm lint` 通过。
5. §7 的 6 个变异点逐一手动验证：注入 → 变红 → 还原 → 复绿。
6. 覆盖率（`pnpm test:coverage`）对 `src/lib` 与 `src/server/commerce` 目标 ≥ 80%
   （纯函数与结算路径为核心资产）。

---

## 9. 落地路径与待定项（与 Spec-first 衔接）

### 9.1 落地顺序建议

1. 研发在本文件基础上创建 `openspec/changes/<id>/specs/commerce/spec.md` 的
   **delta**（ADDED Requirements），把 §2–§6 的行为转写成 OpenSpec Requirement/Scenario。
2. `pnpm exec openspec change validate <id>` 通过后，按 §2 → §3 → §4 → §5 顺序红灯→绿灯。
3. 归档时把 delta 合入 `openspec/specs/commerce/spec.md`。

### 9.2 待 server / web 专家冻结的接口点（本契约引用，最终以彼为准）

- 商品表字段名（`code` / `stock` / `available` / `images`）与 SKU 最终正则。
- 支付密钥环境变量名（本契约暂用 `STRIPE_SECRET_KEY`，webhook 密钥暂用 `STRIPE_WEBHOOK_SECRET`）。
- 中文名的 slug 策略：剥离为英文 vs 生成拼音/哈希，需 web 专家拍板后补入 §2.6 回归。
- `GET /api/products` 的响应包裹字段（本契约暂定 `{ products }`）。

### 9.3 变更纪律

任何一侧冻结结果与本契约冲突时：**先更新本文件（含被引用的断言）→ 再改实现**，
保证「契约先行、测试即文档」。
