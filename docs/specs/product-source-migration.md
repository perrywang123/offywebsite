# 商品数据源迁移设计：Shopify 作为唯一商品来源

> 目标：网站商品列表由 **Shopify 实时驱动**（含上/下架），商家只维护 Shopify，网站自动跟随。
> 保持：USD 展示/结算（Markets US context）、中英双语、现有 provider 抽象与结算流程、
> TDD + spec-first。
>
> 本文是**设计与分阶段执行计划**，供逐步落地；不含代码改动。相关：`docs/payments-overview.md`。

---

## 1. 背景与现状

当前商品来自本地静态目录 `src/lib/catalog/`（约 29 款占位 + 9 个系列），Shopify 仅对配了
`shopifyHandle` 的商品做**字段富化**（覆盖 title/desc/images/price）。因此网站列表仍是本地那批，
Shopify 上/下架不影响列表成员。

### 1.1 对本地目录的依赖点（改造面）

| 文件 | 依赖 | 类型 |
| --- | --- | --- |
| `app/[locale]/page.tsx` | seriesList, getProductsBySeries, getProductByCode, getFeaturedProducts, products, upcomingIps, collabLooks | server |
| `app/[locale]/products/page.tsx` | getProducts, seriesList | server |
| `app/[locale]/collections/page.tsx` | getProductsBySeries, seriesList | server |
| `app/[locale]/collections/[series]/page.tsx` | getProductsBySeries, getSeries, seriesList | server |
| `app/[locale]/products/[code]/page.tsx` | getProductByCode, getProductsBySeries, getSeries | server |
| `components/cart/CartProvider.tsx` | cart 存 `{code, quantity}` | **client** |
| `components/cart/CartDrawer.tsx` | getProductByCode（同步取名/价/图） | **client** |
| `components/cart/AddToCartButton.tsx` | add(code) | **client** |
| `app/[locale]/checkout/page.tsx` | getProductByCode（同步） | **client** |
| `app/api/products/route.ts` / `[code]/route.ts` | getProducts/getProductByCode | api |
| `lib/catalog/index.ts` | getProducts/getProductByCode/getProductsBySeries/getFeaturedProducts/computeSubtotalCents/toStripeLineItems | lib |

**难点**：客户端购物车/结算用**同步** `getProductByCode` 读本地目录；Shopify 数据是异步的，
必须改为「加购时存商品快照」。

### 1.2 关键既有约束（踩坑记录）
- `@inContext(country:)` 的 country 必须是 **GraphQL 枚举字面量**，用变量传不生效（回退 HK）。
- **variantId 随商品编辑会变**；**handle 稳定** → 以 handle 为主键。
- Storefront token 会因反复改 Headless storefront 设置而失效；确定后勿频繁改。
- 结算价以 **Shopify cart** 为准（服务端权威），不信任前端金额。

---

## 2. 目标架构与数据流

```
                         Shopify（唯一商品来源）
                          store + Headless 渠道 + Markets(US→USD)
                                    │  Storefront API（@inContext(country) 字面量）
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
 products(分页)              collections(分类)            product(handle)
       │                           │                           │
       ▼  映射 → 站点 ShopifyProduct（handle 为主键）
 ┌────────────────────────────────────────────────────────────┐
 │ src/server/shopify/catalog.ts（新）：list / byHandle / byCollection │
 │  + 近实时缓存（revalidate 60s，可选 webhook 按需失效）              │
 │  + 失败回退（Shopify 不可达 → 本地兜底目录，可选）                  │
 └────────────────────────────────────────────────────────────┘
       │(server component await)                     │
       ▼                                             ▼
 列表/系列/首页/详情（server）              加购：写“商品快照”入 cart
                                                     │
                                              购物车/结算（client，读快照，不查本地）
                                                     │
                                              结算 provider（Shopify cartCreate → USD checkoutUrl）
```

- **本地目录角色退化**：`src/lib/catalog` 保留为「类型定义 + 可选兜底数据 + 运营元数据映射表」，
  不再是列表来源。是否保留兜底见 §8。
- **上/下架天然同步**：Storefront `products` 只返回**已发布到该 Headless 渠道且 Active** 的商品。

---

## 3. Storefront 查询设计

统一走 `src/server/shopify/storefront.ts`（抽出公共 fetch：endpoint + token header + 字面量 @inContext + revalidate）。

### 3.1 商品列表（分页 cursor）
```graphql
query Products($first: Int!, $after: String) @inContext(country: US) {
  products(first: $first, after: $after, sortKey: BEST_SELLING) {
    nodes {
      id handle title description availableForSale
      featuredImage { url altText }
      images(first: 5) { nodes { url } }
      priceRange { minVariantPrice { amount currencyCode } }
      variants(first: 1) { nodes { id } }   # 结算所需 variantId
      tags productType
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

### 3.2 分类（Collections 作为“系列”）
```graphql
query Collections @inContext(country: US) {
  collections(first: 50) { nodes { id handle title description image { url } } }
}
query CollectionProducts($handle: String!, $first: Int!) @inContext(country: US) {
  collection(handle: $handle) {
    title description
    products(first: $first) { nodes { /* 同 3.1 商品字段 */ } }
  }
}
```

### 3.3 详情（by handle）
```graphql
query ProductByHandle($handle: String!) @inContext(country: US) {
  product(handle: $handle) {
    id handle title description descriptionHtml availableForSale
    images(first: 10) { nodes { url altText } }
    options { name values }
    variants(first: 50) { nodes { id title availableForSale price { amount currencyCode } selectedOptions { name value } } }
    tags productType
    metafields(identifiers: [
      {namespace:"offy", key:"emotion_tags"},
      {namespace:"offy", key:"dimensions"}
    ]) { key value }
  }
}
```

---

## 4. 字段映射（Shopify → 站点）

新增站点类型 `ShopifyProduct`（handle 为主键；不再依赖本地 code）：

| 站点字段 | 来源 | 说明 |
| --- | --- | --- |
| handle | product.handle | **主键**，用于路由/购物车/富化 |
| variantId | variants.nodes[0].id | 结算 cartCreate 用；随编辑会变，运行时实时取 |
| name | product.title | 单语；双语见 §5 |
| description | product.description | 同上 |
| images | images.nodes[].url | next/image 已配 cdn.shopify.com |
| priceCents / currency | priceRange.minVariantPrice（US→USD） | @inContext 字面量；USD 护栏保留 |
| available | availableForSale | 下架/售罄 |
| series/分类 | **Collections**（handle→分类） | 见 §5.1 |
| emotionTags / dimensions | **metafields**（namespace `offy`） | 见 §5.3；缺省可空 |
| featured | collection「featured」成员 或 tag `featured` | 运营字段映射 |
| sortOrder | products/collection 的 sortKey | 由 Shopify 排序驱动 |
| isUpcoming/isQuoteOnly | tag（`upcoming`/`quote-only`）或不再需要 | 运营语义 |

---

## 5. 落差字段处理

### 5.1 系列/分类 → Shopify Collections（推荐）
- 商家在 Shopify 建 Collection（手动或智能），网站分类自动跟随（新增/删除/改名）。
- 站点「系列」路由 `/collections/[handle]` 用 collection.handle；首页分类九宫格读 collections 列表。
- 迁移期：本地 9 个 series 可先映射到同名 Collections；或先做单一「全部商品」列表，分类后置。

### 5.2 双语（中英）
- Shopify 商品原生单语。方案：Shopify **Translate & Adapt** 配中文 → Storefront `@inContext(language: ZH)` 读中文，`@inContext(language: EN)` 读英文。
- 站点 locale（zh/en）→ 映射到 language context。**初期**：未配翻译时中文回退英文标题（当前富化已是此行为）。
- 注意：@inContext 可同时带 country + language（均字面量）。

### 5.3 尺寸/情绪标签 → Metafields
- 在 Shopify 定义 metafields：`offy.dimensions`(JSON)、`offy.emotion_tags`(list)。
- 详情页读 metafields 渲染；缺省则不显示该模块（前端弱化）。

### 5.4 运营字段
- featured：用一个「Featured」Collection 或 tag `featured`。
- upcoming/quote-only：用 tag；或迁移后由 Shopify 的「未发布/草稿」表达（未发布即不出现）。

---

## 6. 路由变更：code → handle

- 详情路由 `/[locale]/products/[code]` → `/[locale]/products/[handle]`。
- 影响：商品卡链接、购物车链接、`i18n/navigation` 的 Link、sitemap。
- 旧链接/SEO：对旧 `/products/{code}` 可加 301 → 新 handle（用本地 code→handle 映射表做过渡，迁移完成后移除）。
- `generateStaticParams` 可选：按 Shopify 商品 handle 预生成 + `revalidate` ISR。

---

## 7. 客户端购物车/结算改造（关键）

### 7.1 购物车存「快照」
`CartLine` 由 `{ code, quantity }` 升级为快照：
```ts
interface CartLine {
  handle: string;        // 主键
  variantId: string;     // 结算用（加购当刻取）
  quantity: number;
  // 展示快照（避免 client 端异步查询）
  title: string;
  priceCents: number;    // 展示价（USD）
  currency: string;
  image: string;
}
```
- `AddToCartButton` 在加购时把当前 Shopify 商品快照写入（server 传下来的 props）。
- `CartDrawer` / `checkout` 直接读快照渲染，**不再** `getProductByCode`。
- localStorage key 升版（`offy.cart.v2`）并对旧结构做迁移/清空。

### 7.2 服务端定价权威
- 展示用快照（USD）；**实际扣款以 Shopify cart 为准**（cartCreate 传 variantId+数量，价格由 Shopify 计算）。
- 结算入参从 `{code}` 改为 `{variantId, quantity}`（或 handle→运行时解析 variantId），
  `api/payments/checkout` 与 shopify provider 相应调整；Stripe/PayPal 自建路径若保留，需要另一套 USD 定价来源（建议迁移后主推 Shopify 结算）。

---

## 8. 缓存、近实时与健壮性

- **近实时**：Storefront fetch `next: { revalidate: 60 }` + 列表/详情页 `export const revalidate = 60`。
- **按需刷新（可选，阶段3）**：Shopify webhook `products/update`、`products/delete`、`collections/update`
  → `/api/webhooks/shopify` → `revalidateTag('shopify-products')`，做到「后台一改即刷新」。
- **限流/成本**：Storefront 有查询成本上限；列表分页 first 控制在 ~20–50，图片用 next/image 懒加载。
- **失败回退**：Shopify 不可达/ token 失效时，
  - 方案 A（推荐迁移期）：保留精简的本地兜底目录，Shopify 失败时降级显示 + 记录告警；
  - 方案 B：显示「暂时无法加载商品」空态。
  - 详情页对未知 handle → 404。

---

## 9. 风险与坑

1. `@inContext` country/language 必须**字面量**，变量不生效。
2. **variantId 会变** → 主键用 handle，variantId 运行时取；购物车快照的 variantId 在结算前可重取校验。
3. Storefront token 因反复改 Headless 设置**会失效** → 稳定后勿动。
4. dev store **收款受限**（选套餐 / 配收单后才能真实付款）。
5. 双语依赖 Translate & Adapt 配置，否则中文回退英文。
6. 客户端购物车结构升版需处理旧 localStorage 兼容。

---

## 10. 分阶段执行计划

### 阶段 1（核心）：列表/详情/上下架从 Shopify + 购物车快照 + handle 路由
- **改动**：新增 `src/server/shopify/{storefront,catalog}.ts`（list/byHandle）；`products/page.tsx`
  与 `products/[handle]/page.tsx` 改用 Shopify；`CartLine`/`CartProvider`/`AddToCartButton`/`CartDrawer`/
  `checkout` 改快照；`api/payments/checkout` 入参 variantId 化；首页商品区先接「全部/精选」。
- **分类**：先单一「全部商品」列表（系列后置到阶段2）。
- **TDD**：`catalog.list/byHandle` 映射（mock Storefront fetch：分页、availableForSale、USD 价、缺图回退）；
  cart 快照 reducer（add/setQty/remove/迁移旧结构）。
- **OpenSpec 提案要点**：`commerce` MODIFIED「Product catalog」→ 来源改为 Shopify；ADDED「上下架同步」
  「购物车快照」Requirement + Scenario（上架出现/下架消失/未知 handle 404/离线回退）。
- **验收**：Shopify 上/下架 → 网站列表增减；详情按 handle；加购→结算 USD；test/typecheck/lint/build 全绿。

### 阶段 2：分类接 Shopify Collections
- **改动**：`collections/page.tsx`、`collections/[handle]/page.tsx`、首页分类九宫格改读 collections；
  路由 series→collection handle。
- **TDD**：collections 列表/集合内商品映射（mock）。
- **OpenSpec**：ADDED「Collection 驱动的分类」Requirement + Scenario。
- **验收**：Shopify 建/改集合 → 网站分类跟随。

### 阶段 3：双语 + metafields + 按需刷新
- **改动**：@inContext(language) 接 locale；详情读 metafields（尺寸/情绪标签）；Shopify webhook → revalidateTag。
- **TDD**：language context 映射、metafields 解析、webhook 签名校验 + revalidate。
- **OpenSpec**：ADDED「双语商品内容」「Webhook 近实时失效」Requirement + Scenario。
- **验收**：中文站显示中文；后台改商品秒级刷新。

---

## 11. 需要在 Shopify 后台做的配置

| 阶段 | 后台动作 |
| --- | --- |
| 1 | 商品发布到 **Headless 销售渠道** 并置 Active；确认 Markets US 激活（已做） |
| 2 | 建 **Collections**（对应各系列），发布到 Headless 渠道 |
| 3 | 配 **Translate & Adapt** 中文；定义 **metafields**（offy.dimensions / offy.emotion_tags）；配置 **webhook**（products/collections 更新） |

---

## 12. 建议的第一步（阶段 1 最小可执行切片）

1. 抽 `src/server/shopify/storefront.ts`（公共 Storefront fetch，复用现有 client 逻辑）。
2. 新增 `src/server/shopify/catalog.ts`：`listShopifyProducts()` + `getShopifyProductByHandle()`（带 @inContext(US) 字面量 + revalidate），返回站点 `ShopifyProduct`。
3. 先只改**商品列表页** `/[locale]/products`：数据源换成 `listShopifyProducts()`，卡片用 handle 链接。
   - 此时上/下架已对「列表页」生效，可立即验证「只维护 Shopify」的核心价值。
4. TDD：`listShopifyProducts` 映射与分页（mock fetch）。
5. 再推进详情页(handle 路由) → 购物车快照 → 结算入参 variantId 化。

> 先交付「列表页从 Shopify 实时同步（含上下架）」这一最小切片，风险可控、价值立现；
> 购物车/路由改造随后按阶段推进。
