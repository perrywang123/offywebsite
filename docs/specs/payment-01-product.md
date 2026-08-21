# payment-01 · 支付链路产品方案（Payment Chain Product Design）

> PLAYCORE 凭空幻想（PLAYCORETOYS）· IP：is.offy · 品牌电商独立站
>
> - 文档版本：v0.1（草案，待评审）
> - 状态：Draft / 待用户确认
> - 输入：`docs/brand-brief.md`、`docs/specs/01-product-prd.md`（US-1~US-6）、
>   `docs/specs/05-server-spec.md`、`src/server/checkout/create-checkout-session.ts`、
>   `src/app/api/checkout/session/route.ts`、`src/app/[locale]/checkout/page.tsx`、
>   `src/server/orders/order-service.ts`、`src/server/db/schema.ts`
> - 前置决策：已确定主支付方式为 **PayPal 中国「个人卖家账户」**（2026 已开放，个人实名、
>   无需营业执照即可全球收款）
> - 性质：**纯产品设计**（不写代码）。数据模型 / API / UI 的改动在本文件中以「产品要求」形式
>   给出，落地需先走 `AGENTS.md` 的 spec-first + TDD 流程，再改代码。

---

## 1. 现状盘点与缺口（一句话对齐）

现有支付链路是**纯 Stripe Checkout**：

```
购物车(localStorage) → 结算页(收邮箱) → POST /api/checkout/session(服务端计价)
  → Stripe 跳转 → 付款 → webhook checkout.session.completed 验签落库 → success 页(纯展示)
```

核心机制已到位且可复用：**服务端权威计价、webhook 验签 + 幂等落库、success 页只展示不落库**。

**缺口**：Stripe 未配置真实 live key 时返回 503（`checkout_unavailable`），站点当前**无法真实收款**；
而用户没有海外公司主体，Stripe live 短期不可得。因此需要**引入 PayPal 作为主支付方式**，
并复用上面这套「服务端建单 → 跳转 → 回跳 → webhook 落库」的骨架，而不是另起炉灶。

---

## 2. 支付方式策略（决策）

### 2.1 结论

| 渠道 | 策略 | 呈现 |
| --- | --- | --- |
| **PayPal（个人卖家账户）** | **主推 / 唯一主按钮** | 结算页第一位置，大按钮，标注「推荐 / Recommended」 |
| **Stripe** | **隐藏（配置驱动）**，不渲染灰色死按钮 | 仅当服务端检测到 Stripe live key 已配置时才作为「次级选项」出现 |

### 2.2 决策理由

| 维度 | PayPal 个人卖家 | Stripe | 结论 |
| --- | --- | --- | --- |
| **无公司主体的可用性（决定性）** | 2026 已开放个人实名收款，无需营业执照 | 需要海外商业主体，短期不可得 | PayPal 是**当前唯一能真实收款的路径**，故主推 |
| 买家覆盖（美/新为主） | 极高：美/新买家 PayPal 渗透率高；且 PayPal Checkout 支持**游客用银行卡支付**（无需 PayPal 账号） | 卡组织覆盖广，但需 live key 才可用 | 二者覆盖接近，但 Stripe 当前不可用 |
| 手续费 | 跨境 ~4.4% + 固定费（卖家承担） | 美国 ~2.9% + $0.30 | Stripe 更便宜，但**不可用**，价格不是决策项 |
| 接入复杂度 | 二阶段（授权 → 捕获），需新建 PayPal 适配层 | 已实现、已测试 | Stripe 代码保留，未来配好 key 即插即用 |

> 关键判断：**「可不可用」压倒了「费率高不高」和「代码现成不现成」**。没有公司主体时，
> PayPal 个人卖家是唯一能尽快卖货的路径；Stripe 是「未来有主体后」的降本选项，而非「现在」的并列选项。

### 2.3 为什么 Stripe 选择「隐藏」而不是「灰色置灰按钮」

- **置灰死按钮无转化价值**：一个点了没反应的按钮，只会让买家以为「支付渠道坏了 / 站点有 bug」。
- **制造认知噪声**：结算页多一个不可用选项，稀释主 CTA（PayPal）的注意力，伤害转化。
- **隐藏是配置驱动、零前端改动的**：由服务端下发「可用支付方式」列表（`paymentMethods: ["paypal", ...]`），
  前端只渲染列表内渠道。Stripe 配好 live key 后自动出现，无需改前端代码。
- 若品牌方坚持要「露脸」，次选方案是：次级按钮 + 置灰 + 鼠标悬停说明「Stripe 即将上线」；
  **但这只是妥协，不推荐**，因为它仍制造死胡同。

### 2.4 PayPal 个人卖家账户的运营约束（产品须知）

以下为「个人卖家账户」与「企业账户」差异，会反向约束产品设计，联调前须逐条以 PayPal 2026 政策复核：

1. **卖家实名展示**：买家在 PayPal 页可能看到的是卖家**个人实名姓名**，而非「PLAYCORE」。这是 MVP 折中，
   需在结算/品牌文案层做好预期管理（详见 §4 与 §10 待确认）。
2. **收款币种**：站内固定 USD，PayPal 个人账户可收 USD；提现到国内银行卡有汇率换算与提现费（计入成本，见 §6）。
3. **收款额度 / 风控**：个人账户可能有单笔/累计额度与更严格的风控审核，需预留「大额订单拆分 / 审核等待」兜底（见 §5）。
4. **不支持订阅/自动扣款**：个人账户一般不提供订阅续费能力。**不影响本项目**——现有「订阅」只是 newsletter
   邮箱收集（非付费订阅），无冲突；但**未来若做付费订阅，必须换企业账户**，届时走 spec delta。
5. **API 权限风险**：需确认个人卖家账户是否开放 PayPal Orders v2 REST API（Client ID / Secret）。若个人账户
   只开放「收款链接 / 表单」，则降级用 PayPal 收款链接方案（见 §7 与 §10 风险）。

---

## 3. 结算流程产品定义（分步：用户目标 + 系统行为）

> 采用「托管跳转 + 回跳捕获」模型，与现有 Stripe「跳转 → 回跳」交互一致，也是用户原话
> 「选择支付方式 → PayPal 跳转 → 授权付款 → 回跳 → 订单确认」的直接映射。

| # | 步骤 | 用户目标 | 系统行为 |
| --- | --- | --- | --- |
| 0 | **购物车 → 结算** | 确认选中的 Offy 形象与数量，进入结算 | 读取 localStorage 购物袋，逐行按服务端目录价计算小计与合计（USD）；购物袋为空则引导回 `/products` |
| 1 | **结算页** | 填写邮箱、选支付方式、核对金额 | 展示：订单摘要（形象/单价/数量/合计）、邮箱输入、**支付方式单选**（PayPal 主推 + 可选 Stripe，按配置渲染）；提交前客户端不做价格计算（价格一律服务端算） |
| 2 | **选择 PayPal 并提交** | 一键用 PayPal 付款 | 前端 `POST /api/paypal/create-order`（仅传 `{items:[{code,qty}], locale}`）；服务端校验 items → 服务端计价 → 调 PayPal Orders v2 `intent=CAPTURE` 建单 → 写 `checkoutSessions(status=pending, provider=paypal)` → 返回 PayPal `approve` 跳转 URL → 前端 `location.href` 跳转 |
| 3 | **PayPal 授权付款（approve）** | 在 PayPal 登录/游客付卡，确认金额与收货地址 | PayPal 托管页负责登录、选卡、确认；**收货地址由 PayPal 收集**（`shipping_preference: GET_FROM_FILE`，MVP 不在站内建地址表单）；买家点「同意并付款」= 资金**预授权**（此时钱还没转走） |
| 4 | **回跳 return_url** | 完成付款，等待确认 | PayPal 回跳 `/{locale}/checkout/paypal/return?token=ORDER_ID`；服务端用该 ORDER_ID **调用 capture 捕获**（幂等，`PayPal-Request-Id` 去重）；捕获成功后进入订单确认流程 |
| 5 | **订单确认页（success）** | 看到「已支付」与订单号，安心等待发货 | 展示订单号、商品清单、金额、收货地址；页面**轮询** `GET /api/orders/by-session/[orderId]` 确认已落库（应对 webhook 迟到竞态）；落库后显示成功态 |

**与现有 Stripe 流程的关键差异（必须写进设计）**：
- Stripe 的 `checkout.session.completed` 本身代表「钱已到账」，所以 webhook 落库即可。
- PayPal 是**二阶段**：`APPROVED`（已授权）≠ 钱已转走，必须**主动 capture**。因此：
  - **捕获主触发 = 回跳 return_url 的服务端 handler**（同步捕获，给买家即时反馈）；
  - **webhook 作兜底**（买家授权后直接关页、没回跳时，靠 `CHECKOUT.ORDER.APPROVED` 补捕获）+ 终态确认 + 退款事件。

---

## 4. 订单状态机（6 态）

> 现有两张表天然对应两段生命周期：`checkoutSessions`（支付会话 = 下单到捕获前）、
> `orders`（捕获成功后的订单）。6 态统一视图如下；「落点」列标注每态在现有表上的映射，
> 其中 `authorized / cancelled / failed` 是**需要新增的状态值**（产品要求，落地走 spec delta）。

| 状态 | 中文 | 定义 | 触发（进入该态） | UI 呈现 |
| --- | --- | --- | --- | --- |
| `pending` | **待支付** | 支付会话已建，买家尚未在 PayPal 完成授权 | 服务端建 PayPal 订单成功、写入 `checkoutSessions` | 结算页显示「正在跳转 PayPal…」；会话静默等待 |
| `authorized` | **已授权** | 买家已在 PayPal 同意付款，资金**预授权但未捕获** | PayPal 回跳 return_url 到达（或 webhook `CHECKOUT.ORDER.APPROVED`），但尚未 capture | 订单确认页显示「支付处理中 / 正在确认…」（`pendingTitle` 文案已预留） |
| `paid` | **已捕获（paid）** | capture 成功，资金实际到账，订单成立 | 服务端 capture 返回 `COMPLETED`；落库 `orders(status=paid)` | 订单确认页成功态：订单号 `OF-2026-xxxxxx`、商品清单、金额、收货地址（`successTitle` 文案） |
| `cancelled` | **已取消** | 买家主动取消或会话过期，未产生资金移动 | 买家点「取消并返回」（回 `cancel_url`）或 PayPal 订单过期 | 回购物车，显示「支付已取消，商品仍在购物袋里」（`cancelTitle/cancelBody` 文案已预留），购物袋原样保留 |
| `refunded` | **已退款** | 捕获后卖家发起退款（整单或部分） | 卖家在 PayPal 后台退款 → webhook `PAYMENT.CAPTURE.REFUNDED` | 订单详情显示「已退款」；退款金额与时间（阶段 1 可仅后台可见，前台展示为后续里程碑） |
| `failed` | **支付失败** | 授权被拒 / 捕获失败 / 风控拒绝，未成单 | 捕获返回 `DECLINED/DENIED/FAILED` 或 webhook `PAYMENT.CAPTURE.DENIED` | 结算页显示明确失败提示 + 可重试指引；购物袋保留，**不生成订单、不发货** |

**状态流转图（精简）**：

```
pending ──(买家授权)──▶ authorized ──(capture 成功)──▶ paid ──(卖家退款)──▶ refunded
   │                        │
   │                        └──(capture 失败/风控拒绝)──▶ failed
   └──(取消/过期)──────────────────────────────▶ cancelled
```

**映射与数据模型要求（产品层）**：

1. `checkoutSessions`：新增 `provider`（`stripe | paypal`）与 `paypalOrderId`（唯一，替代/并列
   `stripeSessionId` 的「provider 会话 ID」角色）；`status` 从 `pending|completed|expired` 扩展为
   `pending | authorized | cancelled | failed | completed`（`completed` 保留给「已捕获」的会话终态）。
2. `orders`：`status` 现有 `paid | refunded | failed` 已覆盖捕获后的三态，无需新增值；但需新增
   `paypalCaptureId`（幂等/对账键）与 `provider`。
3. **幂等三保险**（对齐现有 Stripe 的「双保险」并补 PayPal 二阶段）：`paypalOrderId` 唯一约束 +
   `paypalCaptureId` 唯一 + `providerEventId` 去重；capture 请求带 `PayPal-Request-Id`，重复回跳/重复
   webhook 绝不二次扣款、绝不重复落单。

---

## 5. 边界与异常兜底（产品层）

| 场景 | 产品兜底 |
| --- | --- |
| **买家在 PayPal 取消** | 回跳 `cancel_url`（指向 `/cart` 或专用取消页）；`checkoutSessions → cancelled`；**不落库订单**；localStorage 购物袋**原样保留**（不清空），用户可直接再次结算 |
| **支付超时（买家授权后一直不回跳）** | PayPal 订单有默认有效期（约 3 小时）；webhook `CHECKOUT.ORDER.APPROVED` 兜底触发 capture，**即使买家不回跳也能成单**；若连 approve 都没发生，订单过期 → `cancelled`，购物袋保留 |
| **重复回跳（return_url 多次访问 / 双击）** | capture 请求带 `PayPal-Request-Id` 幂等；`paypalOrderId + paypalCaptureId` 唯一约束 + `onConflictDoNothing`，第二次请求直接命中已捕获结果，不重复扣款 |
| **金额不一致** | 金额一律以**服务端建单时的目录价**为准，客户端不传价；落库金额以 **PayPal capture 返回的 `amount`** 为准（资金事实源）；若 capture 金额与建单金额不一致（罕见），标记「对账异常」，**不发货**，转人工核查 |
| **PayPal 风控暂扣（capture 返回 PENDING）** | capture 成功但 `status=PENDING`（风控审核）时，订单**不能直接标 `paid`**，标 `authorized`/「处理中」，UI 显示「PayPal 正在审核，请稍候」；等 webhook `PAYMENT.CAPTURE.COMPLETED`（转 `paid`）或 `DENIED`（转 `failed`），**PENDING 期间不发货** |
| **授权被拒 / 资金不足** | `DECLINED/DENIED/FAILED` → `failed`；结算页显示失败提示与重试按钮；购物袋保留 |
| **webhook 迟到（买家已回跳但订单未落库）** | success 页轮询 `GET /api/orders/by-session/[orderId]`，未查到则显示「正在确认…」并重试（现有 `pendingTitle/pendingBody` 文案）；超时后给出「我们会在付款确认后邮件通知」的兜底话术 |
| **webhook 验签失败 / 伪造** | 一律拒绝、不落库（对齐 Stripe 的 `invalid_signature → 400`）；PayPal webhook 用 `PAYPAL_WEBHOOK_ID` + 证书验签 |
| **未配置 PayPal（无 Client ID/Secret）** | `POST /api/paypal/create-order` 返回 `503 payment_not_configured`；结算页 PayPal 按钮不渲染或点击后给出「支付暂不可用」提示（与现有 Stripe 503 行为对齐） |
| **PayPal 建单失败 / 网络抖动** | 返回 `502 paypal_error`，结算页提示「支付暂时不可用，请稍后重试」，**不写 `checkoutSessions`**（建单失败 = 未发起支付，无需留痕） |

---

## 6. 手续费与定价提示

### 6.1 决策：手续费由卖家承担，不向买家加收

| 项 | 决策 | 理由 |
| --- | --- | --- |
| 是否在结算页显示「手续费」行 | **否** | PayPal 跨境 ~4.4% + 固定费是**卖家成本**；把它单列给买家会伤害转化，且可能触及 PayPal 对 surcharge 的限制 |
| 是否立刻调价「吞」手续费 | **暂不，等定最终价时一并算** | 当前所有价格本就是占位价（PRD §11 待确认项 #2）；在用户最终定价时把 ~4.4% + 提现/汇率损耗一起纳入毛利模型即可，不必现在单独动价 |
| 买家看到的价格 | **标价即最终价** | 结算页合计 = 服务端目录价合计（USD），无隐藏加价 |

### 6.2 建议：把成本纳入定价与促销杠杆，而不是「手续费」

1. **成本口径**：最终定价应覆盖 `商品成本 + 物流 + 跨境手续费(~4.4%) + 固定费 + 提现汇率损耗`。
   建议在确认占位价时，把标价在当前占位价基础上**上调 3–5%** 作为缓冲（而非在结算时动态加价）。
2. **免运费门槛**：运费是**物流成本**，与支付手续费是两回事，不要混为一谈。当前无物流配置，
   建议阶段 1 先「全站包邮（运费计入价格）」，待接入物流后改为「满 $X 免运费，否则 $Y 运费」作为转化杠杆。
3. **币种与汇率提示**：站内固定 USD；如需在结算页给海外买家提示，只做中性文案
   （如「以 USD 结算，最终汇率以你的发卡行/ PayPal 为准」），**不渲染动态汇率差**。

---

## 7. 验收标准（Given-When-Then）

> 承接 PRD 的 US-1~US-6，新增 US-7~US-9 为 PayPal 支付链路的核心 AC。

### US-7 用 PayPal 支付（选 PayPal → 跳转 → 付款 → 回跳 → 订单成功）

**作为** 购物车有商品的访客，**我希望** 用 PayPal 完成支付，**以便** 尽快买到共鸣的 Offy。

- **GIVEN** 访客购物车含 ≥1 个可售 SKU，PayPal 已配置，进入结算页
- **WHEN** 选择「PayPal（推荐）」并提交
- **THEN** 系统服务端按目录价创建 PayPal 订单（`intent=CAPTURE`、USD、`shipping_preference=GET_FROM_FILE`），
  记录 `checkoutSessions(pending, provider=paypal)`，并跳转到 PayPal 授权页
- **AND** 买家在 PayPal 完成授权（同意付款）
- **WHEN** PayPal 回跳 `return_url`（带 `token=ORDER_ID`）
- **THEN** 服务端调用 capture（幂等）捕获付款，成功后把订单落库为 `paid` 并生成订单号 `OF-2026-xxxxxx`
- **AND** 买家看到订单确认页：订单号、商品清单、金额、收货地址

### US-8 支付取消（回购物车且购物袋保留）

**作为** 已在 PayPal 授权页的访客，**我希望** 取消支付并回到购物车，**以便** 保留已选商品稍后再买。

- **GIVEN** 买家已跳转到 PayPal 授权页（`checkoutSessions` 处于 `pending`）
- **WHEN** 买家点击「取消并返回 PLAYCORE」（或关闭支付页）
- **THEN** PayPal 回跳 `cancel_url`（购物车页），系统将会话置为 `cancelled`，**不生成订单**
- **AND** 买家购物袋（localStorage）**原样保留**，可立即再次发起结算
- **AND** 页面显示「支付已取消，你的商品仍在购物袋里」提示

### US-9 支付失败提示

**作为** 支付过程中失败的访客，**我希望** 看到清晰的失败原因与重试入口，**以便** 决定重试或换支付方式。

- **GIVEN** 买家在 PayPal 授权/捕获过程中失败（拒绝 / 风控 / 资金不足）
- **WHEN** 捕获返回失败或 webhook 到达 `PAYMENT.CAPTURE.DENIED`
- **THEN** 系统将会话置为 `failed`，**不生成订单、不发货**
- **AND** 结算页显示明确的失败提示（含「请检查支付方式后重试」指引）与重试按钮
- **AND** 购物袋原样保留，买家可重试或选择其他可用支付方式

---

## 8. 接口与数据影响（产品要求，落地走 spec-first）

以下为「产品要求 → 实现落点」的对照，**本文件不写实现代码**：

| 产品要求 | 落点（实现时新建/修改） |
| --- | --- |
| 创建 PayPal 订单 | `src/app/api/paypal/create-order/route.ts` + `src/server/checkout/create-paypal-order.ts` |
| 回跳捕获 + 幂等 | `src/app/[locale]/checkout/paypal/return/` + `src/server/paypal/capture-order.ts` |
| PayPal webhook 验签 + 事件分发 | `src/app/api/webhooks/paypal/route.ts` + `src/server/paypal/webhook-handler.ts` |
| 支付方式配置下发（PayPal 是否可用） | `src/lib/env.ts` 扩展 `PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID`；结算页按配置渲染 |
| schema 扩展（provider / paypalOrderId / paypalCaptureId / 新增状态值） | `src/server/db/schema.ts` + `db/migrations/` |
| 支付方式选择 UI | `src/app/[locale]/checkout/page.tsx` + `messages/{en,zh}.json` |

**降级方案（API 权限风险兜底，见 §2.4-5）**：若 PayPal 个人卖家账户不开放 Orders v2 API，
则退化为 **PayPal 收款链接 / Standard 表单**方案——卖家在 PayPal 后台生成收款链接，结算页「PayPal 支付」
按钮改为外链到收款链接，收款确认由卖家后台 + 邮件人工对账，`orders` 落库延后到「人工确认」步骤。
此为**临时应急**，本方案仍以 Orders v2 API 为目标态。

---

## 9. 里程碑建议（阶段 1 最小闭环）

1. **M1 可收款**：PayPal Orders 建单 + 跳转 + 回跳捕获 + webhook 兜底 + 订单落库（US-7/8/9）。
2. **M2 体验补齐**：success/cancel/failed 页轮询与文案、支付方式选择 UI、购物袋在取消/失败后保留。
3. **M3 对账与后台**：订单状态后台查看、退款、对账异常告警（后续里程碑，先写 spec delta）。

---

## 10. 待确认清单（Open Questions）

| # | 待确认项 | 当前假设 | 影响 |
| --- | --- | --- | --- |
| 1 | PayPal 个人卖家账户是否开放 Orders v2 REST API（Client ID / Secret） | 假设开放，否则降级收款链接（§8） | 整体接入方案（API vs 链接） |
| 2 | PayPal 个人账户的收款额度 / 风控阈值 / 实名展示方式 | 假设可收 USD、买家端可能看到个人实名 | 大额订单兜底、品牌预期管理 |
| 3 | 跨境手续费精确费率（~4.4% + 固定费）与提现费 | 按用户给定值，联调前以 PayPal 2026 价目表复核 | §6 成本与定价 |
| 4 | 收货地址由 PayPal 收集（MVP 不建站内地址表单）还是站内建表单 | 默认 PayPal 收集（`GET_FROM_FILE`） | 结算页表单复杂度 |
| 5 | 是否在结算页对 Stripe 做「隐藏」还是「置灰露脸」 | 默认隐藏（§2.3） | 结算页 UI |
| 6 | 免运费策略 | 阶段 1 全站包邮，运费计入价格 | 定价与促销 |
| 7 | 退款/对账后台是否纳入阶段 1 | 默认延后到 M3 | 里程碑范围 |

---

*本文档为产品侧设计，配套 spec delta（OpenSpec）与实现任务将在上述待确认项明确后，按
`AGENTS.md` 的 spec-first + TDD 流程推进。*
