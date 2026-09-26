# Shopify 开放平台接入手册（本地整理版）

> 本文由 Shopify 官方公开文档（shopify.dev）整理，面向 Offy 独立站的接入场景。
>
> **重要澄清**：Shopify 的 API 接入文档**完全公开，无需登录**开发者网站即可阅读。
> 登录 Dev Dashboard / 商店后台，只在你要**创建 App、生成 access token、装 Headless
> 渠道**时才需要。如果你只是「看接入手册」，本文件即可满足；登录问题不影响你先把
> 技术方案和代码准备好。
>
> 官方文档版本参照：Storefront API `2026-07 (latest)`。

---

## 1. 先选对接入模型（三选一，你的场景只有一个可行）

| 模型 | 你做什么 | 钱怎么收 | 适合你？ |
| --- | --- | --- | --- |
| **Storefront API + 托管结算** | 站内建购物车 → 拿 `checkoutUrl` → 跳转 Shopify 结算页 | Shopify 结算页背后的网关（Shopify Payments 或 **PayPal**） | ✅ **唯一可行** |
| Payments Apps API | 做一个支付网关插进别人的店 | —— | ❌ 方向反了 |
| Shopify Payments 直连 API | —— | Shopify 不对外暴露独立收单 API | ❌ 不存在 |

**你的现状适配**：没有公司主体 → 开不了 Shopify Payments → 结算页收单走**个人/商务
PayPal**（Shopify 支持 PayPal 作为第三方网关）。多币种本地货币展示（Shopify Markets）
依赖 Shopify Payments，仅 PayPal 时按店铺币种收款。

---

## 2. 前置准备清单

1. **一个 Shopify 商店**（可先开 14 天试用 / dev store）。
2. **配置收单网关**：后台 Settings → Payments → 启用 **PayPal**（填你的 PayPal 邮箱）。
   建议把个人 PayPal 升级为 **PayPal Business**（免费、更稳、避免风控冻结）。
3. **商品建到 Shopify**：每个可售变体拿到 `ProductVariant` 的全局 id
   （形如 `gid://shopify/ProductVariant/1234567890`）。Offy 现有静态目录
   （`src/lib/catalog/products.ts`）需补一个 `shopifyVariantId` 字段做映射。
4. **装 Headless 销售渠道 + 生成 Storefront API token**（见第 3 节）。
5. **（可选）Admin API token**：用于把订单回传到自己库、程序化同步商品。

---

## 3. 生成 Storefront API Token（需登录商店后台，仅此一次）

来源：Storefront API「Getting started」。

1. 从 Shopify App Store 安装 **Headless** 销售渠道。
2. 安装后点 **Create storefront**，会生成**公开 token（客户端用）**与
   **私有 token（服务端用）**。**记下私有 token**。
3. 权限管理：Shopify 后台 → Sales channels → **Headless** → 选中 storefront →
   **Storefront API permissions** → **Edit** → 勾选所需权限（如
   `unauthenticated_read_product_listings`、`unauthenticated_write_checkouts`）→ Save。
4. 一个店最多 100 个 storefront / token。私有 token 可在 Headless 渠道里轮换。

> 若要建「读写 Admin 数据」的 App（同步商品/接收订单 webhook），走 **Dev Dashboard**
> （`https://dev.shopify.com/dashboard/`）→ Create app → 定义 scopes → Install app →
> 用 Client ID/Secret 走 client credentials grant 换取 24h 有效的 access token。
> 注意：旧的「admin-created custom app」入口已对新建关闭，统一走 Dev Dashboard。

---

## 4. 认证与端点

**Storefront API（GraphQL）**

```
POST https://{你的店}.myshopify.com/api/2026-07/graphql.json
Content-Type: application/json
X-Shopify-Storefront-Access-Token: {私有或公开 storefront token}
```

**Admin API（GraphQL，仅服务端，用于同步/订单）**

```
POST https://{你的店}.myshopify.com/admin/api/2026-07/graphql.json
Content-Type: application/json
X-Shopify-Access-Token: {admin access token}
```

---

## 5. 核心流程 + 可运行示例

### 流程

```
Offy 商品页/购物车
  → cartCreate（可带 lines） → 拿 cart.id + cart.checkoutUrl
  → 需要改动时 cartLinesAdd / cartLinesUpdate / cartLinesRemove
  → 重定向买家到 checkoutUrl（Shopify 托管结算页）
  → 买家用 PayPal 付款 → 订单生成在 Shopify 后台
  → （可选）Admin API orders/create webhook 回传到你的库
```

### 5.1 建购物车并拿结算链接（cartCreate）

```graphql
mutation CartCreate($lines: [CartLineInput!]) {
  cartCreate(input: { lines: $lines }) {
    cart {
      id
      checkoutUrl        # ← 把买家重定向到这里付款
      totalQuantity
    }
    userErrors { field message }
    warnings { code message }
  }
}
```

变量：

```json
{
  "lines": [
    { "quantity": 1, "merchandiseId": "gid://shopify/ProductVariant/1234567890" }
  ]
}
```

curl 自测：

```bash
curl -sX POST "https://{你的店}.myshopify.com/api/2026-07/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Storefront-Access-Token: {token}" \
  -d '{"query":"mutation{cartCreate(input:{lines:[{quantity:1,merchandiseId:\"gid://shopify/ProductVariant/1234567890\"}]}){cart{id checkoutUrl} userErrors{message}}}"}'
```

拿到 `checkoutUrl` 后浏览器打开能看到 Shopify 结算页 = 通路打通。

### 5.2 往已有购物车加行（cartLinesAdd）

```graphql
mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart { id totalQuantity checkoutUrl }
    userErrors { field message }
  }
}
```

### 5.3 按买家地区取本地化价格（@inContext）

```graphql
query ProductByHandle($handle: String!, $country: CountryCode!)
@inContext(country: $country) {
  product(handle: $handle) {
    title
    variants(first: 10) {
      nodes { id title price { amount currencyCode } }
    }
  }
}
```

> `@inContext` 的本地货币**结算**仍依赖 Shopify Payments；仅 PayPal 时主要用于
> 展示，实际扣款按店铺配置币种。

---

## 6. 订单回传（可选，Admin API Webhook）

结算完订单在 Shopify 侧。若要在 Offy 站内展示/记账：

1. Dev Dashboard 里给 App 订阅 `orders/create` webhook，回调指向
   `https://你的域名/api/webhooks/shopify`。
2. 该路由校验 HMAC 签名 → 写入你的 `orders` 表。
3. 参考现有 Stripe webhook 实现：`src/app/api/webhooks/`。

---

## 7. 与 Offy 现有代码的对接点

现有支付抽象在 `src/server/payments`（`types.ts` / `registry.ts` + `stripe` / `paypal`）。
接 Shopify 时新增 `src/server/payments/shopify/`：

- `client.ts`：封装 Storefront GraphQL 请求（endpoint + token header）。
- `cart.ts`：`cartCreate` / `cartLinesAdd` 封装。
- `provider.ts`：实现 `PaymentProvider`——
  - `createPayment(input)` → 建 cart，返回 `{ id: cart.id, redirectUrl: cart.checkoutUrl }`。
  - `capturePayment()` → **无对应动作**（Shopify 拥有订单），改由 orders/create webhook 确认。
- 在 `registry.ts` 注册 `shopify`；`PaymentProviderId` 加 `"shopify"`。
- `src/lib/catalog/types.ts` 的 `Product`/变体补 `shopifyVariantId`，`products.ts` 填映射。

> 架构提醒：Shopify 模式下结算页与订单在 Shopify 侧，你自建的 `/checkout` 与
> `orders` capture 流程会被架空。若只想用个人 PayPal 收钱，其实**你站里已有的
> PayPal provider 就够了，未必需要 Shopify**（见 `docs/specs/payment-03-tech.md`）。

---

## 8. 官方文档索引（需要深入时按需查，均公开无需登录）

- Storefront API 总览：https://shopify.dev/docs/api/storefront
- Headless 快速开始（装渠道 + 生成 token）：https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started
- 购物车管理（cart → checkoutUrl）：https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage
- cartCreate 变更：https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate
- 用 Dev Dashboard 创建 App：https://shopify.dev/docs/apps/build/dev-dashboard/create-apps-using-dev-dashboard
- Admin API：https://shopify.dev/docs/api/admin-graphql
- Webhooks：https://shopify.dev/docs/apps/build/webhooks/subscribe
- GraphiQL 在线调试：https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/api-exploration/graphiql-storefront-api
- 官方示例查询包（可 clone）：https://github.com/Shopify/storefront-api-learning-kit

---

## 9. 登录不进去的排查（Dev Dashboard / 后台）

登录仅用于「拿 token / 建 App」，读文档不需要。若登录受阻：

1. 用最新版 **Chrome / Firefox**（官方要求），关掉可能拦截的扩展/隐私插件。
2. 清 `shopify.com` / `myshopify.com` 的 Cookie 后重试；或用无痕窗口。
3. 网络问题：Shopify 登录/后台在部分网络环境下需要稳定的国际网络出口，切换网络或代理再试。
4. 账号问题：确认用的是**注册商店时的邮箱**；开发者中心（partners/dev dashboard）
   与商店后台是不同入口，别混。忘密码走「Forgot password」。
5. 团队协作：若店主已建店，让店主在后台 Settings → Users and permissions 给你加
   **staff 账号**并授予 **Apps and channels / Develop apps** 权限，用你自己账号登录。

> 如果你把「登录时具体报什么错 / 卡在哪一步」发给我，我可以针对性给下一步处理办法。
