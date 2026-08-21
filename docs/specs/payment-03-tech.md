# 支付技术方案：PayPal Orders API v2 集成（payment-03）

> 状态：设计稿（不写实现代码）
> 范围：在现有 Stripe Checkout 流程之上，新增 **PayPal Orders API v2** 作为主支付（面向美/新买家），
> 并通过一个 `PaymentProvider` 抽象层把 Stripe 与 PayPal 统一为可插拔的 provider。
> 金额币种统一 USD。

---

## 0. 目标与非目标

**目标**

1. 抽象一个 `PaymentProvider` 接口，Stripe / PayPal 各实现一份，结算 API 按 `provider` 参数分派。
2. 用原生 `fetch` 实现 PayPal Orders API v2（不引入官方 `@paypal/checkout-server-sdk`，保持依赖轻量）。
3. 复用现有「服务端计价 → 快照落库 → 幂等写订单」的模式，PayPal 与 Stripe 共用同一套
   `checkout_sessions` / `orders` / `order_items` 落库逻辑。
4. 金额一律以服务端目录价为唯一真源，PayPal 的美元字符串金额只在服务端生成。

**非目标（后续里程碑，实现前先写 spec delta）**

- PayPal Webhook（`CHECKOUT.ORDER.APPROVED` / `PAYMENT.CAPTURE.COMPLETED`）兜底 —— 本方案采用
  「capture 即落库」的同步模型，Webhook 仅作为可选增强。
- 退款 / void 的完整后台流程（仅保留「捕获前金额不一致 → void 作废」这一安全动作）。
- 库存扣减、优惠券、税费、运费、多币种。

**前提与风险提示（PayPal 账户侧）**

- PayPal **收款需要 Business 账户或已升级为「个人卖家」的账户**；纯 Personal 账户不能接收商业付款。
  无公司主体时需在 PayPal 完成身份/银行/KYC 验证，且美/新市场需满足当地税务与发货政策。
  这是业务前提，非本方案可解；本方案在 `PAYPAL_MODE=sandbox` 下可先行全流程联调。

---

## 1. 支付抽象层（`src/server/payments/`）

### 1.1 文件结构

```
src/server/payments/
  types.ts                # PaymentProvider 接口 + 共享类型 + 结果类型
  registry.ts             # provider 注册表与按 provider 分派
  pricing.ts              # 服务端计价：cents → USD 字符串 / 期望金额（纯函数）
  stripe/
    provider.ts           # StripePaymentProvider（薄封装现有 createCheckoutSession + webhook）
  paypal/
    client.ts             # fetch 封装：OAuth2 token 缓存 + create/capture/get order
    provider.ts           # PayPalPaymentProvider
    verify.ts             # 回跳 token 校验 + 金额/币种一致性校验（纯函数，便于测试）
```

> 现有 `src/server/checkout/create-checkout-session.ts` 与
> `src/app/api/webhooks/stripe/route.ts` **不改动既有行为**，由 `stripe/provider.ts` 委托它们，
> 避免破坏已上线流程。PayPal 的落库复用 `src/server/orders/order-service.ts`（见 §4，需扩展为 provider 无关）。

### 1.2 接口签名

```ts
// src/server/payments/types.ts

export type ProviderName = "stripe" | "paypal";

export interface CheckoutItemInput {
  code: string;
  quantity: number;
}

export interface CreateCheckoutInput {
  items: CheckoutItemInput[];   // 只有 code + quantity，不含任何价格
  locale: "en" | "zh";
  email?: string;
}

/** 创建支付会话后，前端需要执行的动作。 */
export type CheckoutRedirect =
  | { kind: "redirect"; url: string }                                  // Stripe：直接跳转 Checkout
  | { kind: "approve"; orderId: string; approveUrl: string; returnUrl: string }; // PayPal：跳 authorize

export type CreateCheckoutResult =
  | { ok: true; provider: ProviderName; redirect: CheckoutRedirect }
  | { ok: false; status: 400 | 502 | 503; error: string };

/** 行项目快照（落库 order_items 的权威来源）。 */
export interface LineItemSnapshot {
  code: string;
  nameEn: string;
  nameZh: string;
  unitPriceCents: number;
  quantity: number;
}

/** 一次已完成支付的可信摘要，provider 无关，交给 order-service 落库。 */
export interface CompletedPayment {
  provider: ProviderName;
  providerOrderId: string;      // Stripe: session id；PayPal: order id
  providerEventId: string;      // Stripe: webhook event id；PayPal: capture id
  customerEmail: string | null;
  currency: string;             // "usd"
  amountTotalCents: number;
  amountSubtotalCents: number;
  lineItems: LineItemSnapshot[];
}

export interface CaptureRequest {
  orderId: string;              // PayPal order id（路径参数）
  token?: string;               // return_url 带回的 EC token，仅用于交叉定位，不直接信任
}

export type CaptureResult =
  | { ok: true; order: { orderNumber: string; status: string; totalCents: number; currency: string } }
  | { ok: false; status: 400 | 404 | 409 | 502; error: string };

/**
 * 每个支付渠道实现的统一接口。
 * - createCheckout：两者都有。
 * - capture：PayPal 的核心路径（同步捕获并落库）；Stripe 的支付由 webhook 完成，返回 not_supported。
 * - parseCallback：解析「异步回调」为可信完成事件。Stripe 用于 webhook 签名校验；PayPal 主流程不用，
 *   但保留该能力供未来 Webhook 兜底实现。
 */
export interface PaymentProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  capture(req: CaptureRequest): Promise<CaptureResult>;
  parseCallback(request: Request): Promise<CompletedPayment | null>;
}
```

### 1.3 分派器

```ts
// src/server/payments/registry.ts

const providers: Record<ProviderName, PaymentProvider> = {
  stripe: stripeProvider,
  paypal: paypalProvider,
};

/** 严格按 provider 名解析；未知值抛错（由路由层 zod 前置校验，不应到达此处）。 */
export function getProvider(name: ProviderName): PaymentProvider {
  const p = providers[name];
  if (!p) throw new Error(`unknown provider: ${name}`);
  return p;
}

/** 兼容旧入口：缺省 / "stripe" → Stripe；"paypal" → PayPal。 */
export function resolveProvider(raw: string | undefined): PaymentProvider {
  return getProvider(raw === "paypal" ? "paypal" : "stripe");
}
```

### 1.4 Stripe provider 如何贴合接口

| 方法 | 实现 |
| --- | --- |
| `createCheckout` | 委托现有 `createCheckoutSession(items, locale, ...)`，把 `{ url }` 映射为 `{ ok:true, provider:"stripe", redirect:{ kind:"redirect", url } }` |
| `capture` | 返回 `{ ok:false, status:409, error:"not_supported" }`（Stripe 由 webhook 落库，无同步 capture） |
| `parseCallback` | 提取现有 webhook 路由的 `constructEvent` + 组装 `CompletedPayment` 逻辑，供路由调用 |

---

## 2. PayPal Orders API v2 集成

### 2.1 端点与鉴权

| 用途 | 方法 & 路径 |
| --- | --- |
| 基础域 | 沙箱 `https://api-m.sandbox.paypal.com` / 生产 `https://api-m.paypal.com` |
| 获取 access_token | `POST {base}/v1/oauth2/token` |
| 创建订单 | `POST {base}/v2/checkout/orders` |
| 查询订单 | `GET {base}/v2/checkout/orders/{id}` |
| 捕获订单 | `POST {base}/v2/checkout/orders/{id}/capture` |
| 作废订单（捕获前） | `POST {base}/v2/checkout/orders/{id}/void` |

**OAuth2（client_credentials）**

```
POST /v1/oauth2/token
Authorization: Basic base64(PAYPAL_CLIENT_ID:PAYPAL_CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

响应（`expires_in` 通常 32400s ≈ 9h）：

```json
{
  "scope": "https://uri.paypal.com/services/...",
  "access_token": "A21AA...",
  "token_type": "Bearer",
  "app_id": "APP-80W284485P519543T",
  "expires_in": 32400,
  "nonce": "..."
}
```

之后所有订单请求带 `Authorization: Bearer <access_token>` 与 `Content-Type: application/json`。

### 2.2 创建订单（`intent: CAPTURE`）

```
POST /v2/checkout/orders
Headers:
  Authorization: Bearer <token>
  PayPal-Request-Id: <offy-request-uuid>    ← 幂等键（见 §2.5，注意头名不是 idempotency-key）
```

请求体（**金额是两位小数的美元字符串，不是美分**；`value` 由服务端 `computeSubtotalCents → toFixed(2)` 生成）：

```json
{
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "reference_id": "offy-cart-<uuid>",
      "amount": { "currency_code": "USD", "value": "45.00" },
      "items": [
        {
          "name": "Offy Signature Classic",
          "unit_amount": { "currency_code": "USD", "value": "45.00" },
          "quantity": "1"
        }
      ]
    }
  ],
  "application_context": {
    "user_action": "PAY_NOW",
    "return_url": "https://offy.example.com/en/checkout/paypal/return",
    "cancel_url": "https://offy.example.com/en/cart"
  }
}
```

> 注意：若提供 `purchase_units[].items`，其 `unit_amount × quantity` 合计必须与
> `amount.value` 完全一致，否则 PayPal 返回 `UNPROCESSABLE_ENTITY`。为稳妥，首版可**不传 items**
> （只传 `amount`），行项目明细以本地 `line_items_json` 快照为准。

响应：

```json
{
  "id": "2LP34007W4471442H",
  "status": "CREATED",
  "links": [
    { "href": "https://api-m.sandbox.paypal.com/v2/checkout/orders/2LP34007W4471442H", "rel": "self", "method": "GET" },
    { "href": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T", "rel": "approve", "method": "GET" }
  ]
}
```

- `id`：PayPal order id，作为 `checkout_sessions.paypal_order_id` 持久化。
- `links` 中 `rel:"approve"` 的 `href` 是买家授权跳转 URL（前端 `window.location.href = approveUrl`）。

### 2.3 查询订单（捕获前校验）

```
GET /v2/checkout/orders/{id}
Authorization: Bearer <token>
```

关键返回字段（捕获前校验依赖它）：

```json
{
  "id": "2LP34007W4471442H",
  "status": "APPROVED",
  "purchase_units": [
    {
      "reference_id": "offy-cart-<uuid>",
      "amount": { "currency_code": "USD", "value": "45.00" }
    }
  ],
  "payer": { "email_address": "buyer@example.com", "payer_id": "...", "name": { "given_name": "...", "surname": "..." } }
}
```

只有 `status === "APPROVED"` 才允许捕获。

### 2.4 捕获订单

```
POST /v2/checkout/orders/{id}/capture
Headers:
  Authorization: Bearer <token>
  PayPal-Request-Id: <offy-capture-uuid>    ← 幂等键，防重复捕获
```

响应（`status: "COMPLETED"` 视为支付成功）：

```json
{
  "id": "2LP34007W4471442H",
  "status": "COMPLETED",
  "purchase_units": [
    {
      "reference_id": "offy-cart-<uuid>",
      "payments": {
        "captures": [
          {
            "id": "3C679366HH908993F",
            "status": "COMPLETED",
            "amount": { "currency_code": "USD", "value": "45.00" }
          }
        ]
      }
    }
  ],
  "payer": { "email_address": "buyer@example.com", "payer_id": "..." }
}
```

- `captures[0].id` 作为 `provider_event_id`（幂等）。
- `payer.email_address` 作为订单邮箱。
- 金额一致性校验（§5.2）**在捕获前**用 §2.3 的 `GET` 完成；捕获后再比对 `captures[0].amount.value` 做最终确认。

### 2.5 关键坑（必须逐条处理）

1. **金额是美元字符串，不是美分**：`amount.value` / `unit_amount.value` 是 `"45.00"` 这类两位小数字符串。
   Stripe 用整数美分 `4500`，二者严格区分。转换集中在 `pricing.ts`：
   ```ts
   export function centsToUsdString(cents: number): string {
     return (cents / 100).toFixed(2);   // 4500 → "45.00"
   }
   ```
   禁止使用浮点累加；只做 `integerCents / 100` 的定点转换。
2. **access_token 缓存**：内存缓存 ~8h（`expires_in` 通常 9h，留 60s 安全边际），避免每次请求都打 token 端点。
   模块级单例即可；Next.js 多实例/无服务部署下各实例各自缓存（可接受，后续可用 `globalThis` 跨热更新共享）。
   ```ts
   interface TokenCache { accessToken: string; expiresAt: number }
   let cache: TokenCache | null = null;

   async function getAccessToken(): Promise<string> {
     const now = Date.now();
     if (cache && cache.expiresAt > now + 60_000) return cache.accessToken;
     const res = await fetch(`${base}/v1/oauth2/token`, {
       method: "POST",
       headers: {
         Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
         "Content-Type": "application/x-www-form-urlencoded",
       },
       body: "grant_type=client_credentials",
     });
     if (!res.ok) throw new PayPalError("token_request_failed", res.status);
     const json = await res.json();
     const expiresIn = (json.expires_in ?? 32400) - 60;   // 提前 60s 失效
     cache = { accessToken: json.access_token, expiresAt: now + expiresIn * 1000 };
     return cache.accessToken;
   }
   ```
   并发请求期间的 token 争用可用一个共享的 in-flight Promise 去重（可选优化）。
3. **幂等头名是 `PayPal-Request-Id`**（不是 `idempotency-key`）：创建与捕获请求都带一个 UUID；
   同一请求 id 重放时 PayPal 返回首次结果，配合本地 `paypal_order_id` 唯一键（§4）实现双重幂等。
4. **回跳 token 与 access_token 是两个不同概念**：买家在 PayPal 授权后跳回
   `return_url?token=<EC-token>&PayerID=<payerid>`。这个 `token` 是 Express Checkout token，
   仅用于定位订单；**不要把它当鉴权凭证**，落库只信服务端 `GET /orders/{id}` 返回的 `status` 与金额。
5. **`status` 状态机**：`CREATED → APPROVED → COMPLETED`。只有 `APPROVED` 才能 `capture`；
   未捕获可 `void`；`COMPLETED` 后重复 capture 会被 PayPal 拒绝（本地仍需幂等拦截）。
6. **`items` 合计校验**：若传 `items`，合计必须等于 `amount.value`，否则 `422 UNPROCESSABLE_ENTITY`；
   首版建议只传 `amount`，明细以本地快照为准。

---

## 3. API 路由

### 3.1 路由总览（推荐统一前缀 `/api/payments/...`）

| 路由 | 作用 |
| --- | --- |
| `POST /api/payments/checkout` | 统一结算入口，body 带 `provider`，分派到 provider.createCheckout |
| `POST /api/payments/paypal/orders/[id]/capture` | 捕获已 APPROVED 的 PayPal 订单并落库 |
| （兼容）`POST /api/checkout/session` | 保留现有 Stripe 入口，内部委托 `stripe` provider，前端零改动 |

> 选择 `/api/payments/...` 而非 `/api/checkout/paypal/...` 的原因：`payments` 同时承载
> 「创建 + 捕获 + 未来 webhook/退款」等多动作，语义更完整；`checkout` 目录留给「发起结算」单一动作。
> 若偏好，可平移到 `/api/checkout/paypal/...`，路由签名与 JSON 契约不变。

### 3.2 创建（统一入口）

```
POST /api/payments/checkout
Content-Type: application/json
```

请求：

```json
{
  "provider": "paypal",
  "items": [ { "code": "PCOF1-F1", "quantity": 1 } ],
  "locale": "en",
  "email": "buyer@example.com"
}
```

> `items` 只含 `code` + `quantity`；服务端用 `clampQuantity` 归一化数量（复用现有逻辑），
> 价格一律来自目录，客户端传价会被忽略（`provider` 由 zod `z.enum(["stripe","paypal"])` 校验，缺省 `stripe`）。

响应（PayPal）：

```json
{
  "provider": "paypal",
  "redirect": {
    "kind": "approve",
    "orderId": "2LP34007W4471442H",
    "approveUrl": "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
    "returnUrl": "/en/checkout/paypal/return?orderId=2LP34007W4471442H"
  }
}
```

响应（Stripe，兼容旧契约）：

```json
{ "provider": "stripe", "url": "https://checkout.stripe.com/c/pay/..." }
```

错误（统一）：

```json
{ "error": "invalid_items" }        // 400
{ "error": "paypal_unavailable" }   // 503（未配置）
{ "error": "paypal_error" }         // 502（上游失败）
```

### 3.3 捕获（PayPal）

```
POST /api/payments/paypal/orders/2LP34007W4471442H/capture
Content-Type: application/json

{ "token": "5O190127TN364715T" }
```

> `token` 可选：它只用于交叉定位订单（可与 return_url 带回的 token 比对），落库决策不依赖它。

成功：

```json
{
  "order": {
    "orderNumber": "OF-2025-000001",
    "status": "paid",
    "totalCents": 4500,
    "currency": "usd"
  }
}
```

失败示例：

```json
{ "error": "order_not_found" }            // 404：无该 paypal order 的本地会话
{ "error": "amount_mismatch" }            // 409：PayPal 返回金额与本地不一致（已 void）
{ "error": "not_approved" }               // 409：状态非 APPROVED，拒绝捕获
{ "error": "already_completed" }          // 409：幂等命中，已存在订单（可返回已有 order 信息）
{ "error": "capture_failed" }             // 502：上游捕获失败
```

### 3.4 前端流程（点到为止）

1. 结算页选择 provider → `POST /api/payments/checkout`。
2. Stripe：`redirect.kind === "redirect"` → 直接跳 `url`。
3. PayPal：`redirect.kind === "approve"` → 跳 `approveUrl`；买家授权后 PayPal 回跳
   `returnUrl`（`/checkout/paypal/return?orderId=...&token=...`）。
4. 回跳页（客户端组件）读 `orderId` + `token`，`POST /api/payments/paypal/orders/{orderId}/capture`；
   成功 → 展示成功态（可复用 `/checkout/success`），失败 → 展示 `amount_mismatch` / `capture_failed` 等错误。

---

## 4. 数据模型与迁移

### 4.1 变更点

在现有三张表基础上加 `provider` 维度，PayPal 用 `paypal_order_id` 作唯一键：

**`checkout_sessions`**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `provider` | text NOT NULL DEFAULT 'stripe' | `stripe \| paypal` |
| `paypal_order_id` | text UNIQUE（可空） | PayPal order id；Stripe 行留空 |
| `stripe_session_id` | 改为可空 | PayPal 行不填（见 §4.3） |

**`orders`**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `provider` | text NOT NULL DEFAULT 'stripe' | `stripe \| paypal` |
| `paypal_order_id` | text UNIQUE（可空） | PayPal 幂等键 |
| `stripe_session_id` | 改为可空 | PayPal 行不填 |

> `order_items` 无需改动（行项目明细 provider 无关）。

### 4.2 迁移建议（SQLite，Drizzle 生成）

```sql
-- 新增 provider 与 paypal_order_id（ADD COLUMN 均合法，含 UNIQUE 用唯一索引实现）
ALTER TABLE `checkout_sessions` ADD COLUMN `provider` text NOT NULL DEFAULT 'stripe';
ALTER TABLE `checkout_sessions` ADD COLUMN `paypal_order_id` text;
CREATE UNIQUE INDEX `checkout_sessions_paypal_order_id_idx` ON `checkout_sessions`(`paypal_order_id`);

ALTER TABLE `orders` ADD COLUMN `provider` text NOT NULL DEFAULT 'stripe';
ALTER TABLE `orders` ADD COLUMN `paypal_order_id` text;
CREATE UNIQUE INDEX `orders_paypal_order_id_idx` ON `orders`(`paypal_order_id`);
```

**stripe_session_id 的可空化**（SQLite 不能就地 ALTER，需表重建；`pnpm db:generate` 会生成
`CREATE new → INSERT SELECT → DROP → RENAME` 的重建迁移，按既有 `0001`/`0002` 流程提交进仓库）：

```ts
// schema.ts 变更示意
stripeSessionId: text("stripe_session_id").unique(),   // 由 .notNull().unique() 改为可空
```

### 4.3 幂等方案（PayPal 用 order_id 作唯一键）

复用并泛化 `handleCheckoutCompleted`，使其 provider 无关（新增泛化签名，保留旧函数做薄封装以兼容 Stripe webhook）：

```ts
export function finalizeOrder(
  payment: CompletedPayment,       // provider + providerOrderId + providerEventId + 金额 + lineItems
  db: Db = getDb(),
): { created: boolean; orderNumber?: string }
```

落库判定顺序（防重复）：

1. 按 provider 查 orders 唯一键：
   - Stripe → `orders.stripeSessionId === payment.providerOrderId`
   - PayPal → `orders.paypalOrderId === payment.providerOrderId`
   命中 → 返回 `{ created:false }`。
2. 查 checkout_sessions 同 provider 唯一键的 `providerEventId === payment.providerEventId`
   （捕获 id 重放）→ 命中返回 `{ created:false }`。
3. 写 `orders`（`onConflictDoNothing`，靠 `paypal_order_id` / `stripe_session_id` 唯一约束兜底并发）。
4. 写 `order_items`（快照行项目）。
5. 更新 `checkout_sessions`：`status=completed`、`provider_event_id=captureId`、
   `amount_total_cents`、`customer_email`、`completed_at`。

PayPal 流程的 `CompletedPayment` 组装：

| 字段 | 来源 |
| --- | --- |
| `providerOrderId` | PayPal `order.id` |
| `providerEventId` | capture 响应 `captures[0].id` |
| `customerEmail` | capture 响应 `payer.email_address` |
| `amountTotalCents` / `amountSubtotalCents` | **本地 `line_items_json` 快照重算**（不是 PayPal 返回值） |
| `lineItems` | 本地快照 |

> 金额以本地快照为准落库（服务端目录价是唯一真源），PayPal 返回值只做一致性校验（§5.2）。

---

## 5. 安全

1. **金额一律服务端计价**：创建订单的 `amount.value` 由 `computeSubtotalCents(items)` 经
   `centsToUsdString` 生成；请求体只接收 `code` + `quantity`，客户端任何价格字段被忽略/拒绝。
2. **捕获前金额/币种校验**：`capture` 时先 `GET /v2/checkout/orders/{id}`，逐项比对：
   - `purchase_units[0].amount.currency_code === "USD"`；
   - `amount.value === centsToUsdString(本地快照总额)`（字符串精确相等，不解析回浮点）。
   不一致 → 调 `void` 作废订单并返回 `amount_mismatch`，**绝不捕获**。
3. **回跳 token 校验**：`return_url` 的 `token` 只用于定位订单与交叉比对（可与创建时保存的
   approve token 比对），落库只信服务端 `GET order` 的 `status` 与金额；`token` 绝不作为鉴权凭证。
4. **状态机拦截**：仅 `status === "APPROVED"` 允许 `capture`；`CREATED`/`COMPLETED`/`VOIDED` 均拒绝。
5. **防重复捕获（双重幂等）**：
   - 网络层：`capture` 请求带 `PayPal-Request-Id`（固定 per-order 的 UUID），PayPal 侧去重；
   - 数据层：`orders.paypal_order_id` UNIQUE + `onConflictDoNothing` + 状态检查，重放不写第二单。
6. **密钥隔离**：`PAYPAL_CLIENT_SECRET` 只在服务端 `env.ts` 读取；客户端只用 `NEXT_PUBLIC_*`
   （本方案 PayPal 无需暴露任何客户端密钥，CLIENT_ID 仅用于服务端 OAuth，不回传浏览器）。
7. **错误不泄漏**：上游失败统一映射为 `paypal_error` / `capture_failed`，不回传 PayPal 原始错误体；
   日志服务端记录，响应体只给稳定错误码。

---

## 6. 环境变量

`src/lib/env.ts` 追加（沿用现有 zod 校验风格）：

```ts
PAYPAL_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
PAYPAL_CLIENT_ID: z.string().optional(),
PAYPAL_CLIENT_SECRET: z.string().optional(),
```

```ts
/** True when PayPal credentials are present (not placeholder). */
export function isPayPalConfigured(): boolean {
  return Boolean(
    env.PAYPAL_CLIENT_ID &&
    env.PAYPAL_CLIENT_SECRET &&
    !env.PAYPAL_CLIENT_ID.includes("xxxx") &&
    !env.PAYPAL_CLIENT_SECRET.includes("xxxx"),
  );
}
```

`.env.example` 追加：

```dotenv
# ---------------------------------------------------------------------------
# Payments (PayPal). sandbox → live 切换由 PAYPAL_MODE 控制；secret 仅服务端读取。
# 沙箱密钥从 developer.paypal.com 的 Sandbox app 获取。
# ---------------------------------------------------------------------------
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=REPLACE_WITH_PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET=REPLACE_WITH_PAYPAL_CLIENT_SECRET
```

`.env.production.example` 追加（生产指向 `PAYPAL_MODE=live`，密钥来自 live app）。

---

## 7. 测试策略

> 遵循 AGENTS.md 的 TDD：纯逻辑放 `src/lib` / `src/server/**` 配 `.test.ts`，测试文件首行
> `// @vitest-environment node`，数据/服务测试用内存 SQLite（参照 `order-service.test.ts`）。

1. **PayPal API fetch mock（依赖注入）**
   `paypal/client.ts` 的 `createOrder/captureOrder/getOrder/getAccessToken` 全部接受可注入的
   `fetchImpl: typeof fetch`（默认 `globalThis.fetch`），测试用 `vi.fn()` 逐端点 mock：
   - 断言请求 URL / method / `Authorization` / `PayPal-Request-Id` 头；
   - mock `GET order` 返回 `APPROVED` 或 `COMPLETED` / `CREATED`，覆盖状态机分支。
2. **金额转换测试（`pricing.test.ts`）**
   - `centsToUsdString(4500) === "45.00"`、`(2200) === "22.00"`、`(9900) === "99.00"`；
   - 负值/非整数输入被拒绝或按契约处理（禁止浮点累加）。
3. **金额一致性校验测试（`verify.test.ts`，纯函数）**
   - PayPal 返回 `value` 与本地快照总额相等 → 通过；
   - 不等（改价攻击模拟）→ 拒绝且返回 `amount_mismatch`；
   - `currency_code !== "USD"` → 拒绝。
4. **订单幂等测试（`order-service.test.ts` 扩展）**
   - 同一 `paypal_order_id` 两次 `finalizeOrder` 只写一单、一份 order_items；
   - 同一 `provider_event_id`（capture id）重放 → `{ created:false }`；
   - Stripe 旧路径回归：现有 `handleCheckoutCompleted` 行为不变。
5. **capture 端到端（集成，mock fetch）**
   - 创建 → 本地存 `checkout_sessions(paypal)` → mock `GET APPROVED` → `capture` → 断言
     `orders` / `order_items` / `checkout_sessions.status=completed` 与金额快照一致；
   - `capture` 失败（`502`）→ 不落库；重复 `capture` → 幂等返回已有订单。

---

## 8. 三个最关键技术决策（摘要）

1. **金额单一真源 + 字符串精确比对**：PayPal 金额用服务端 `computeSubtotalCents → centsToUsdString`
   生成；捕获前用 `GET order` 的 `amount.value` 与本地快照做**字符串精确相等**校验（不解析回浮点），
   不一致即 `void`，杜绝改价。
2. **「capture 即落库」的同步模型**：PayPal 走 `return_url → capture → 落库`，不依赖 Webhook
   （Webhook 留作后续兜底里程碑）；落库以本地快照金额为准，PayPal 返回值仅做校验与取 payer 信息。
3. **以 `paypal_order_id` 唯一键 + `PayPal-Request-Id` 实现双重幂等**：`orders.paypal_order_id`
   UNIQUE 与 `onConflictDoNothing` 保证数据层不重复，`PayPal-Request-Id` 保证网络层重放不重复扣款。
