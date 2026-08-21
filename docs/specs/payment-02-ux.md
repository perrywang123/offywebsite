# payment-02 — 支付链路交互规格（PayPal 支付方式选择与跳转）

> PLAYCORE 凭空幻想 · is.offy 电商独立站
> 作者：交互设计专家 · 版本 v1.0 · 状态：待评审（Draft for Review）
> 输入：`docs/specs/02-ux-spec.md`、`docs/specs/redesign-02-visual.md`、
> `src/app/[locale]/checkout/page.tsx`、`src/app/[locale]/checkout/success/page.tsx`、
> `src/app/[locale]/cart/page.tsx`、`src/app/api/checkout/session/route.ts`、
> `src/server/checkout/create-checkout-session.ts`、`src/server/orders/order-service.ts`、
> `src/server/db/schema.ts`、`messages/zh.json` / `messages/en.json`
> 范围：**纯设计（不写代码）**——在现有结算页上加入「PayPal / 银行卡」支付方式选择与
> PayPal 跳转/回跳的完整交互。

---

## 0. 背景与改动边界

**现状（已实现）**：结算页 = 邮箱输入 + 订单摘要 + 「前往支付」按钮；提交
`POST /api/checkout/session` → 服务端创建 **Stripe Checkout Session** → 前端
`window.location.href = url` 整页跳转 Stripe 托管支付页；`success_url` 回跳
`/checkout/success?session_id=…`，`cancel_url` 回跳 `/cart`；订单以 webhook
`checkout.session.completed` 幂等落单（`orders` 表），成功页暂为静态文案。

**本次改动（两条支付方式并列）**：

| 支付方式 | 默认/推荐 | 跳转目标 | 回跳/落单 |
| --- | --- | --- | --- |
| **PayPal（推荐 · 默认选中）** | ✅ | PayPal 授权页（`approve` 链接） | `return` 回跳 → 服务端 `capture` 落单 |
| **银行卡（Stripe）** | — | Stripe Checkout（沿用现有逻辑） | `success_url` → webhook 落单 |

**不变项**：结算页两栏骨架、邮箱字段、订单摘要侧栏、购物车（localStorage
`offy.cart.v1`，跨跳转持久）、暖奶油/暖棕 editorial 视觉 token。

**设计原则新增（对 `02-ux-spec.md` §2 的增量）**：
- **P6 支付方式可预期**：用户在点「前往支付」前就能明确「下一步会去 PayPal 还是
  Stripe」，不把跳转当惊喜。
- **P7 授权页预期管理**：跳转前用一句话说明「将前往 PayPal 官网登录授权，完成后自动
  回来」，降低「突然被带走」的不安。
- **P8 落单以服务端为准**：前端回跳只负责「展示」，订单/库存/邮件以 `capture` 成功 +
  webhook 为准，与 Stripe 的幂等落单口径一致。

---

## 1. 结算页支付方式选择器

### 1.1 组件形态决策：**单选卡（Radio Card）**，不是胶囊 Tab，也不是裸按钮

**为什么是单选卡**：

| 方案 | 结论 | 理由 |
| --- | --- | --- |
| 胶囊 Tab（segment） | ❌ | 两种方式各有图标 + 说明 + 徽章，信息密度高；Tab 放不下副文案与「推荐」徽章，且未来加 Apple Pay/Alipay 会拥挤。 |
| 裸按钮（两个大按钮并列） | ❌ | 按钮语义是「行动」，不是「选择」；与底部「前往支付」主 CTA 抢视觉权重。 |
| **单选卡** | ✅ | 每张卡可容纳「图标 + 标题 + 副文案 + 推荐徽章 + 单选指示」，符合 editorial 卡片语言（`rounded-card bg-paper`），语义天然是 `radiogroup/radio`，移动端单列堆叠也干净。 |

- 语义：外层 `role="radiogroup"`（`<fieldset>` + `<legend>`），每卡包一个隐藏
  `<input type="radio">` + 可点 `<label>`，`aria-checked` 随选中态同步（对齐
  `02-ux-spec.md` §5.4 的 A11y 约定）。
- 数量固定为 **2 项**（PayPal / 银行卡），竖排单列；若未来加第三方，继续向下堆叠。

### 1.2 选择器结构与 Tailwind（可落地）

```
支付方式 · Payment
┌────────────────────────────────────────────────────┐
│ (○)  [PayPal 蓝底白字]  PayPal         [推荐 REC]   │  ← 默认选中
│       在 PayPal 官网登录授权，完成后自动返回          │
├────────────────────────────────────────────────────┤
│ ( )  [卡图标]            银行卡（卡支付）            │
│       经 Stripe 安全支付（Visa / Mastercard…）       │
└────────────────────────────────────────────────────┘
```

**容器**：`<fieldset class="space-y-3">`，`<legend class="kicker mb-2">`（复用 `.kicker`
全大写 editorial 标签，「PAYMENT · 支付方式」）。

**每张卡（`<label>`）通用类**：
```
relative flex items-center gap-3 rounded-card border-2 bg-paper p-4
cursor-pointer transition-all duration-200 ease-out
```

**状态差异（核心）**：

| 状态 | 边框 | 高亮环 | 单选点 |
| --- | --- | --- | --- |
| 选中（PayPal 默认） | `border-brown-600` | `ring-2 ring-brown-100` | 实心棕点 |
| 未选（银行卡） | `border-sand` | 无 | 空心点 |
| hover | `border-brown-500` | — | — |

> 选中态对齐 `redesign-02-visual.md` §4.5 形象选择器的选中语义
> （`border-brown-600 ring-2 ring-brown-100`），保证全站「选择 = 暖棕描边 + 浅棕光环」
> 的认知一致。

**单选指示点**（卡内第一个元素，视觉自定义、原生 `<input type="radio" class="sr-only">`）：
- 空心：`h-4 w-4 rounded-full border border-sand`
- 选中：`border-brown-600`，内部实心 `h-2 w-2 rounded-full bg-brown-600`（绝对居中）

**图标 swatch**（第二个元素，见 §1.3）：`h-10 w-14 shrink-0 rounded-soft overflow-hidden
flex items-center justify-center`。

**文案区**（`flex-1`）：
- 标题：`text-base font-medium text-ink`
- 副文案：`text-xs text-ink-muted mt-0.5`（PayPal 副文案强调「登录授权后自动返回」，
  即 §2.4 的预期管理落点）。

**推荐徽章**（卡内右上，绝对定位 `absolute top-3 right-3`，或文案区末尾 `ml-auto`）：
```
bg-butter text-ink text-[10px] font-semibold uppercase tracking-[0.14em]
rounded-full px-2 py-0.5
```
- 文案：`推荐 · Recommended`，仅 PayPal 卡显示。
- 用 `butter`（奶油黄，`redesign-02` §2.2 指定为「极少量高亮」色）而非 `accent`，
  避免与底部「前往支付」行动色抢焦点。

### 1.3 图标规范

| 方式 | 图标 | 做法 |
| --- | --- | --- |
| PayPal | 蓝底白字「PayPal」wordmark | `bg-[#0070ba]`（PayPal 品牌蓝，深档可用 `#003087`），白字 `font-semibold italic`，`text-xs` 居中。 |
| 银行卡 | 中性卡图标 | 圆角矩形 `border border-ink-muted` + 顶部磁条细线 + 左下芯片小方块；用内联 SVG，`text-ink-soft`。 |

**护栏**：`#0070ba` 是**支付品牌标识例外**（同信用卡发卡行 logo），不计入「同屏点缀色
≤2 色」的克制度规则；但必须收敛到一个小图标组件（如 `PaymentLogo`）内，禁止散落字面
hex。其余一律走语义 token。

### 1.4 默认选中与初始态

- **默认选中 PayPal**，`aria-checked=true` 落在 PayPal 卡。
- 刷新/回跳重进结算页：若 URL 带 `?paypal=cancelled` / `?paypal=failed`，则**保持上次
  选择**（读取 `localStorage` 的 `offy.payment.method`，见 §4.1），否则回退默认 PayPal。
- 首次进入无存储 → 默认 PayPal（体现「推荐」）。

---

## 2. PayPal 跳转交互

### 2.1 主 CTA 文案随选择联动

| 选中方式 | 按钮文案（中 / 英） | 按钮内是否带 mini logo |
| --- | --- | --- |
| PayPal | 「用 PayPal 支付」/「Pay with PayPal」 | 可内嵌极小的白底蓝字 PayPal 徽标（可选增强） |
| 银行卡 | 「前往安全支付」/「Proceed to Payment」 | 否 |

- 按钮沿用 editorial 主行动样式：`h-12 w-full rounded-full bg-accent text-cream
  text-sm font-medium transition-colors hover:bg-accent-deep`（对齐
  `redesign-02` §3.6 结算页提交按钮）。
- **不在按钮上直接贴 PayPal 黄/蓝**：保持「前往支付」是全站唯一行动色，品牌蓝只出现在
  选择卡的小图标里。

### 2.2 点击后状态（loading / 禁用 / 文字）

| 时刻 | 按钮 | 卡片选择 | 页面其它 |
| --- | --- | --- | --- |
| 点击瞬间 | `disabled` + `opacity-70` + 内嵌 spinner（`animate-spin` 的小圆环）+ 文案切「正在跳转到 PayPal…」/「跳转中…」 | 两张卡 `pointer-events-none opacity-60`（禁止再切换） | 邮箱字段只读 |
| 接口返回 `url` | 执行整页跳转（见 §2.3） | 同上 | — |
| 接口失败/超时 | 恢复可点，文案回「用 PayPal 支付」，`setSubmitting(false)` | 恢复可选 | 错误横幅（§4.2） |

- 状态机沿用现有 `submitting` 守卫（`checkout/page.tsx` 已有），新增 `aria-busy` 与
  `aria-live="polite"` 的跳转状态提示，供读屏播报「正在跳转到 PayPal」。
- 防重复提交：`submitting` 期间禁用按钮 + 忽略二次点击（现有逻辑已覆盖，仅补文案与
  spinner）。

### 2.3 跳转方式：**整页同标签跳转（top-level navigation）**，非新窗口/弹窗

- 用 `window.location.href = url`（或 `<a href>` + 服务端 302），与现有 Stripe 跳转
  一致。
- **为什么不用新窗口/弹窗**：① PayPal 授权页必须顶级导航（官方不支持 iframe 嵌入）；
  ② 移动端 Safari 弹窗极易被拦截、切后台后状态丢失；③ 新窗口割裂「我还在这个站」的
  语境，取消后用户易丢。整页跳转 + `cancel_url` 回跳是 PayPal 标准姿势。

### 2.4 PayPal 授权页的用户预期管理

用户在 PayPal 授权页看到的是 PayPal 自己的 UI，我们能在**跳转前**做的预期管理：

1. **卡内副文案**（常驻，§1.2）：`在 PayPal 官网登录授权，完成后自动返回本店`。
2. **跳转过渡**（点击后 ~0.5–1s）：主 CTA 变 loading 文案「正在前往 PayPal，请稍候…」，
   下方可选一行 `text-xs text-ink-muted`：`即将离开本站，在 PayPal 官网完成授权后会自动
   返回结算`。
3. **超时兜底**：若 8s 内未完成跳转（网络异常），恢复按钮并显示 `text-sm text-error`
   「无法连接 PayPal，请重试或改用银行卡」，不把用户晾在 loading。

---

## 3. 回跳与成功页

### 3.1 回跳参数（token / order id）

PayPal 原生 Orders 流程的回跳参数：

| 场景 | 回跳路由 | 携带参数 | 语义 |
| --- | --- | --- | --- |
| 授权通过（approve） | `/zh/checkout/paypal-return`（服务端路由） | `?token=<PAYPAL_ORDER_ID>&PayerID=…` | 服务端据此调 `capture` |
| 用户取消 | `cancel_url` = `/zh/checkout` | `?paypal=cancelled&token=<PAYPAL_ORDER_ID>` | 结算页提示（§4.1） |

> 参数名遵循 PayPal 标准：`token` = PayPal Order ID（授权订单），`PayerID` = 授权付款人。
> 落地实现时 `token` 可在 `create-checkout-session` 阶段写入 `checkout_sessions`（新增
> `provider` + `providerOrderId` 列），供 capture 后与内部 `orders` 关联——具体 schema
> 变更走 OpenSpec delta，不在本交互规格展开。

**capture 落单（服务端，非前端）**：`paypal-return` 路由用 `token` 调 PayPal capture：
- 成功 → 幂等写入内部 `orders`（对齐 `order-service.handleCheckoutCompleted` 的口径：
  同一 `providerOrderId` 不重复落单）→ **302 重定向** `/checkout/success?order_id=<订单号>`
  （已可拿到订单号，无需前端再猜）。
- 失败/declined → **302** `/checkout?paypal=failed&reason=…`（§4.2）。

### 3.2 成功页订单摘要

成功页从「静态感谢文案」升级为「真订单摘要」，字段对齐 `orders` + `orderItems` 表：

| 区块 | 内容 | 数据来源 |
| --- | --- | --- |
| 头部 | ✓ 成功标记 + 「支付成功，感谢有你」 | 文案 |
| 订单号 | `OF-2026-000123`（`orderNumber`） | `orders.orderNumber` |
| 商品行项 | 形象名（中/英）× 数量 + 单价/行小计 | `order_items`（`nameZh/nameEn × quantity × unitPriceCents`） |
| 金额 | 小计 / 合计（USD，`tabular-nums`） | `orders.subtotalCents / totalCents` |
| 邮箱 | 确认邮件已发送至 `you@example.com` | `orders.email` |
| CTA | 「继续逛」→ `/products` + 「关注我们」 | 文案 |

- 视觉沿用 editorial：摘要卡 `rounded-card bg-paper p-6`，行项 `divide-y divide-cream-line`，
  金额 `font-medium tabular-nums`，订单号用 `.kicker` 打头「ORDER」+ 等宽数字。
- 成功页为服务端组件时优先直读订单（`?order_id=` 解析）；订单摘要能力需扩展
  `/api/orders/by-session/[sessionId]`（现仅返回 `orderNumber/status/totalCents/currency`）
  或新增 `/api/orders/by-token/[token]`，返回行项与邮箱——见 §9 实现提示。

### 3.3 「确认中」态（webhook / capture 未到）

**触发**：前端回跳先于服务端落单（Stripe webhook 延迟、PayPal capture 后订单写入竞态），
成功页在 `?order_id=` 或 `?session_id=` 尚未能解析出订单时进入「确认中」，**不泄露敏感
信息、不误报成功**。

- 视觉：加载态卡片 + `.kicker`「CONFIRMING」+ 主文案「正在确认订单…」+ 副文案
  「请稍候，我们正在确认你的支付」（复用已有 `pendingTitle/pendingBody` i18n key）。
- 行为：客户端轮询 `GET /api/orders/by-session/{id}`（或 by-token），**每 2s 一次，
  最多 ~30s**；一旦命中 → 渲染 §3.2 完整摘要 + **清空购物车**（`clearCart()`）。
- 超时兜底（30s 未命中）：文案降级为「我们还在确认你的支付，请稍后刷新页面或查收邮件；
  如已扣款，我们会邮件补发订单确认」+ 「继续逛」按钮；**此时不清空购物车**（未确认不误清）。

---

## 4. 取消与失败

### 4.1 PayPal 取消回跳 → 结算页提示 + 购物袋保留

- PayPal 用户点「Cancel and return to merchant」→ 回跳 `/zh/checkout?paypal=cancelled&token=…`。
- 结算页顶部显示**中性信息横幅**（非红色错误，避免「取消 = 犯错」的挫败感）：
  ```
  bg-info-bg text-info rounded-card p-4 text-sm  （可配 dismiss ×）
  文案：已取消支付，购物袋里的商品为你保留着。可以再试一次，或改用银行卡。
  ```
- **购物袋保留**：购物车为 localStorage（`offy.cart.v1`），跨跳转天然保留；取消**不清空**。
- 保留上次选择：把 `offy.payment.method` 写回 localStorage，重进时恢复，减少二次选择摩擦。
- 卡片与 CTA 恢复可用，用户可直接再点「用 PayPal 支付」或切换到「银行卡」。

### 4.2 失败态（capture 失败 / 支付被拒）

- 回跳 `/zh/checkout?paypal=failed&reason=…`（或 Stripe 侧 `payment failed` 回
  cancel 路径），结算页顶部显示**错误横幅**：
  ```
  bg-error-bg text-error rounded-card p-4 text-sm
  文案：支付失败，请换一张卡或改用 PayPal 重试。
  ```
- 与「取消」区分：失败用 `error` 语义色 + 可操作「重试」按钮（滚动/聚焦回支付选择器），
  取消用 `info` 语义色 + 温和文案。
- 重试路径：按钮恢复可用 → 重新 `POST /api/checkout/session`（创建新 session / 新
  PayPal order，旧 token 作废）→ 再次跳转；服务端对旧 token 不做重复扣款（幂等）。

### 4.3 与 Stripe 现有取消/失败口径统一

`02-ux-spec.md` §4.6 已定：取消回 `/checkout/cancel`、购物车保留。本次把 PayPal 取消也
统一到「回结算页 + 提示 + 购物袋保留」的口径；可让 Stripe 的 `cancel_url` 也改为
`/checkout?paypal=cancelled` 同一条提示，减少两套取消页（实现时二者可复用同一横幅）。

---

## 5. 支付状态机总览

```mermaid
stateDiagram-v2
  [*] --> 结算页_默认PayPal
  结算页_默认PayPal --> 结算页_切换银行卡: 点银行卡卡
  结算页_切换银行卡 --> 结算页_默认PayPal: 点PayPal卡
  结算页_默认PayPal --> 跳转中: 提交(用PayPal支付)
  结算页_切换银行卡 --> 跳转中: 提交(前往安全支付)
  跳转中 --> PayPal授权页: 整页跳转 approve
  跳转中 --> StripeCheckout: 整页跳转(银行卡)
  跳转中 --> 结算页_失败: 接口失败/超时
  PayPal授权页 --> 结算页_取消: cancel_url
  PayPal授权页 --> paypal-return: approve token+PayerID
  paypal-return --> 成功页_订单摘要: capture成功→302(order_id)
  paypal-return --> 结算页_失败: capture失败→302
  StripeCheckout --> 成功页_确认中: success_url session_id
  StripeCheckout --> 结算页_取消: cancel_url
  成功页_确认中 --> 成功页_订单摘要: 轮询命中→清空购物车
  成功页_确认中 --> 成功页_兜底: 30s超时
  结算页_取消 --> 结算页_默认PayPal: 保留购物袋,可重试
  结算页_失败 --> 结算页_默认PayPal: 换方式重试
```

---

## 6. 关键交互验收标准（Given-When-Then）

### 6.1 默认选中 PayPal
- **GIVEN** 用户首次到达 `/zh/checkout`，购物袋非空，无历史支付方式偏好
- **WHEN** 结算页支付选择器渲染完成
- **THEN** 「PayPal」卡为选中态（`border-brown-600 ring-2 ring-brown-100` + 实心单选点，
  `aria-checked=true`），并显示「推荐 · Recommended」黄油徽章；「银行卡」卡为未选态；
  底部主 CTA 文案为「用 PayPal 支付」

### 6.2 切换支付方式
- **GIVEN** 用户在结算页，当前选中 PayPal
- **WHEN** 用户点击「银行卡（卡支付）」卡
- **THEN** 选中态即时切到银行卡卡（暖棕描边 + 光环 + 单选点实心），PayPal 卡取消选中且
  「推荐」徽章保留；主 CTA 文案变为「前往安全支付」；无整页刷新；`aria-checked` 同步；
  选择写入 `localStorage.offy.payment.method`
- **GIVEN** 用户再点回 PayPal 卡
- **WHEN** 选中 PayPal
- **THEN** 主 CTA 变回「用 PayPal 支付」

### 6.3 跳转中
- **GIVEN** 用户在结算页选中 PayPal，邮箱合法，购物袋非空
- **WHEN** 用户点击「用 PayPal 支付」
- **THEN** 按钮进入 loading（`disabled` + spinner + 「正在跳转到 PayPal…」），两张支付卡
  与邮箱字段不可再编辑；随后**整页同标签跳转**到 PayPal 授权页（不是新窗口/弹窗）

### 6.4 回跳成功
- **GIVEN** 用户在 PayPal 授权页完成授权
- **WHEN** PayPal 回跳 `/zh/checkout/paypal-return?token=…&PayerID=…`，服务端 capture 成功
- **THEN** 302 到 `/zh/checkout/success?order_id=…`，展示成功态 + 订单号（`OF-…`）+
  商品行项 + 合计金额 + 邮箱；购物车清空；确认邮件已发送
- **GIVEN** 前端先于落单回跳（webhook/capture 竞态）
- **WHEN** 成功页尚无法解析订单
- **THEN** 显示「确认中」（`pendingTitle/pendingBody`）并轮询订单接口（2s/次，≤30s）；
  命中后渲染完整摘要并清空购物车；30s 未命中则显示兜底文案且**不清空购物车**

### 6.5 取消
- **GIVEN** 用户在 PayPal 授权页点击「Cancel and return to merchant」
- **WHEN** PayPal 回跳 `/zh/checkout?paypal=cancelled&token=…`
- **THEN** 结算页顶部显示中性信息横幅「已取消支付，购物袋里的商品为你保留着」，购物袋
  **保留**（localStorage 不清空）；PayPal 卡保持选中；用户可直接重试或切换银行卡

### 6.6 失败重试
- **GIVEN** 用户在 PayPal 授权后，服务端 capture 失败（或支付被拒）
- **WHEN** 回跳 `/zh/checkout?paypal=failed&reason=…`
- **THEN** 结算页顶部显示错误横幅「支付失败，请换一种方式重试」；按钮恢复可用；购物袋
  保留；旧 token 作废，再次提交时创建新的支付会话并重新跳转，不发生重复扣款

---

## 7. 移动端适配

| 区域 | 手机（< 640px） |
| --- | --- |
| 支付选择器 | 两张卡**单列全宽堆叠**，`p-4` 触控目标 ≥ 44px；图标 swatch 保持 `h-10 w-14`；副文案保留但可截断为一行 |
| 订单摘要 | 保持现有「折叠摘要」折叠，不挤占选择器 |
| 主 CTA | **吸底固定**：`sticky bottom-0 z-10 bg-cream/90 backdrop-blur border-t border-cream-line p-4`，内放「用 PayPal 支付」按钮 + 一行 `text-xs text-ink-muted` 信任文案（`支付即表示同意条款 · 安全跳转 PayPal`）；桌面则恢复在表单流内 |
| 跳转过渡 | loading 文案截短（「跳转中…」），超时兜底文案换行不溢出 |
| 成功页/确认中 | 摘要卡单列，行项缩略 `w-14`，金额行右对齐；吸底 CTA 常驻「继续逛」 |

- 吸底 CTA 与 PDP 吸底购买条（`redesign-02` §3.3）同模式，保持全站一致；触底时给
  表单底部 `pb-24` 防遮挡。

---

## 8. i18n key 参考（落地提示）

> 现有 `checkout` 命名空间已含 `submit/successTitle/successBody/successOrder/
> cancelTitle/cancelBody/pendingTitle/pendingBody`，本次**新增**：

| key（建议） | zh | en |
| --- | --- | --- |
| `checkout.payment.title` | 支付方式 | Payment |
| `checkout.payment.paypal` | PayPal | PayPal |
| `checkout.payment.paypalSub` | 在 PayPal 官网登录授权，完成后自动返回 | Sign in to PayPal to authorize; you'll return automatically |
| `checkout.payment.card` | 银行卡（卡支付） | Card (credit/debit) |
| `checkout.payment.cardSub` | 经 Stripe 安全支付 | Pay securely via Stripe |
| `checkout.payment.recommended` | 推荐 | Recommended |
| `checkout.payWithPaypal` | 用 PayPal 支付 | Pay with PayPal |
| `checkout.payWithCard` | 前往安全支付 | Proceed to Payment |
| `checkout.jumpingPaypal` | 正在前往 PayPal… | Redirecting to PayPal… |
| `checkout.cancelBanner` | 已取消支付，购物袋里的商品为你保留着 | Payment cancelled — your items are still in your bag |
| `checkout.failBanner` | 支付失败，请换一种方式重试 | Payment failed — try another method |

---

## 9. 实现衔接提示（给 Web/后端专家，非本规格交付物）

1. 新增「支付方式选择器」为独立客户端组件（`PaymentMethodPicker`），内含 `PaymentLogo`
   图标组件与 `aria-checked` 语义；先按 `AGENTS.md` 走 OpenSpec delta + TDD。
2. `POST /api/checkout/session` 的 body 增 `method: "paypal" | "card"`；`paypal` 分支走
   PayPal Orders API 创建订单并返回 `approve` 链接（仍整页跳转）；`card` 分支沿用 Stripe。
3. schema 增 `provider` + `providerOrderId`（`checkout_sessions` / `orders` 关联 PayPal
   order id），capture 与 webhook 共用 `handleCheckoutCompleted` 的幂等落单口径。
4. 新增服务端路由 `/checkout/paypal-return`（capture + 302）与
   `/api/orders/by-token/[token]`（成功页轮询），并扩展 `/api/orders/by-session` 返回行项
   与邮箱以支撑成功页摘要。
5. 成功页改为「订单摘要 + 确认中轮询」双态；确认命中后调用 `clearCart()`。

---

## 10. 最关键交互决策（3 个）

1. **单选卡 + PayPal 默认推荐**：支付方式用「图标 + 标题 + 副文案 + 推荐徽章」的 editorial
   单选卡呈现，PayPal 默认选中并挂「推荐」黄油徽章；选中态用「暖棕描边 + 浅棕光环」与
   全站选择器认知统一，主 CTA 文案随选择联动（「用 PayPal 支付」/「前往安全支付」）。
2. **整页同标签跳转 + 授权页预期管理**：点「前往支付」后 loading + 防重复，整页跳转
   PayPal 授权页（非新窗口/弹窗）；跳转前用卡内副文案与过渡文案管理「将前往 PayPal 官网
   授权、完成后自动返回」的预期，并给超时兜底。
3. **服务端 capture 落单 + 成功页「确认中」轮询**：回跳 `token/PayerID` 由服务端
   capture 幂等落单后 302 到成功页；成功页展示真实订单摘要（订单号/金额/邮箱/商品），
   webhook/capture 未到则进入「确认中」轮询（2s/次 ≤30s，命中才清空购物车，超时不清空）；
   取消/失败回结算页保留购物袋并区分 info/error 提示。
