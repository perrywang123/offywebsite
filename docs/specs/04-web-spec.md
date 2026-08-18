# PLAYCORE 凭空幻想 (is.offy) — Web 前端架构设计（Web Spec）

> 编号：`04-web-spec`
> 关联：`docs/brand-brief.md`（品牌/产品简报）、`docs/architecture.md`（整体架构）、
> `openspec/specs/commerce/spec.md`（商城为预留能力）、`AGENTS.md`（spec-first + TDD 纪律）
> 状态：设计稿（待 OpenSpec 提案落地；实现前须按 `AGENTS.md` 先写 spec delta）

## 0. 目标与非目标

**目标**
1. 品牌宣传 + 电商独立站：首页、产品目录/详情、系列页、品牌 about、购物车、结账、支付成功。
2. 中/英双语，架构可平滑扩展更多语言。
3. 每个「Offy 形象」（对应 `resources/产品修图/` 的 29 张图）可被查看、选择形象、加入购物车并支付。
4. 品牌宣传区块参考 dogguo.com / littlebeast.co，选款→支付交互参考 casetify。

**非目标（本轮不实现，仅预留接口）**
- 订单持久化 / 库存 / 优惠券 / 会员体系（`openspec/specs/commerce/spec.md` 预留）。
- 管理后台 / CMS。
- 定制联名下单的定制流程（仅展示「支持定制与联名」，不做在线定制器）。

---

## 1. 技术栈与总览

固定栈（沿用现有工程，不引入新运行时）：**Next.js 15 (App Router) + TypeScript(strict) +
React 19 + Tailwind CSS v4 + Vitest**。新增能力所需依赖见 §9。

关键决策总览（详见对应小节）：

| # | 决策 | 结论 |
| --- | --- | --- |
| 1 | 多语言 | `next-intl`，`localePrefix: "always"`，`defaultLocale: "zh"`，根 `/` 按 Accept-Language + Cookie 重定向 |
| 2 | 商品数据源 | 单一 `src/data/products.ts`（TS + zod 校验），仅服务端导入；不做数据库读商品 |
| 3 | 购物车状态 | React Context + `localStorage` 持久化（客户端）；结账时服务端重新计价 |
| 4 | 支付 | Stripe Checkout Session（托管页），`@stripe/stripe-js` 客户端 + `stripe` 服务端，币种 USD |
| 5 | 图片 | 脚本从 `resources/` 拷贝到 `public/assets/`，重命名为 ASCII slug；`next/image` 本地引用 |

---

## 2. 路由地图与 App Router 目录结构

### 2.1 路由地图

采用 `localePrefix: "always"`：所有页面挂在 `[locale]` 段下，`zh`/`en` 对称。

| 路由（以 zh 为例） | 页面 | 类型 | 说明 |
| --- | --- | --- | --- |
| `/` | 根重定向 | server | 按 Cookie + Accept-Language 重定向到 `/zh` 或 `/en`（middleware 完成） |
| `/zh` `/en` | 首页 | server | 品牌 hero + 系列入口 + 热门形象 + 品牌宣传区块 + newsletter |
| `/zh/products` | 产品目录 | server | 全部形象网格，可按系列过滤（URL search params） |
| `/zh/products/[code]` | 产品详情 | server 壳 + client 岛 | 大图 + VariantSelector + AddToCart + 系列/情绪文案 |
| `/zh/cart` | 购物车页 | client | 明细 + 数量 + 合计 + 去结账 |
| `/zh/checkout` | 结账页 | client | 邮箱/收货信息（Stripe 托管页收付款细节）+ 提交建 Session |
| `/zh/checkout/success` | 支付成功 | server | 读 `session_id` 确认，展示感谢 + 订单摘要 |
| `/zh/about` | 品牌宣传 | server | 品牌故事 / 团队 / 零售网络 / 未来 IP（dogguo·littlebeast 式长页） |
| `/zh/collections/[series]` | 系列页 | server | 该系列下所有形象 + 系列叙事 |

**默认语言处理**：`defaultLocale = "zh"`。`/` 不直接渲染页面，由 `middleware` 做语言协商
（Cookie 记忆 > `Accept-Language` 头 > 默认 `zh`）后 `redirect` 到对应 locale 前缀。
语言切换（`LanguageSwitcher`）保留当前路径：`/zh/products/PCOF1-A3` → `/en/products/PCOF1-A3`。

> 备选：`localePrefix: "as-needed"` 可让中文主站 URL 更干净（`/products` 无 `/zh`），
> 但会牺牲「两种语言 URL 完全对称」的直观性。本项目以中文为第一市场、但明确要求
> `/zh /en` 双前缀，故采用 `always`。若后续决定中文无前缀，仅改 `routing.ts` 一处。

### 2.2 App Router 目录结构

```
src/app/
  layout.tsx                  # 根布局：仅渲染 children（next-intl 要求的最小透传层）
  not-found.tsx               # 全局 404（不依赖 locale）
  [locale]/
    layout.tsx                # <html lang={locale}> + NextIntlClientProvider + Header/Footer
    page.tsx                  # 首页
    products/
      page.tsx                # 目录
      [code]/
        page.tsx              # 详情
    collections/
      [series]/
        page.tsx              # 系列页
    cart/
      page.tsx                # 购物车页（"use client"）
    checkout/
      page.tsx                # 结账（"use client"）
      success/
        page.tsx              # 支付成功
    about/
      page.tsx                # 品牌宣传
  api/
    checkout/
      route.ts                # POST 创建 Stripe Checkout Session
    webhooks/
      stripe/
        route.ts              # POST Stripe webhook（预留：订单落库）
```

`middleware.ts` 位于 `src/middleware.ts`（next-intl 的 `createMiddleware`），匹配器排除
`api`、`_next`、静态资源与 `public/assets` 图片，避免给 API 和图片加 locale。

---

## 3. 多语言方案（next-intl）

### 3.1 选型论证

`next-intl` 是 Next.js App Router 的 de-facto i18n 标准：
- 原生支持 App Router + Server Components + RSC，`getTranslations()` 在服务端零客户端负担；
- 类型安全：字典可用 zod/`defineMessages` 或纯 TS 常量校验 key；
- 内置 locale 路由（`defineRouting` + `createMiddleware` + `createNavigation`），自动处理
  locale 段、重定向、`hreflang`/`canonical` 的 metadata 助手；
- 扩展语言只需新增字典文件 + 在 `routing.ts` 的 `locales` 数组追加，无需改路由结构。

（替代方案 `next-i18next` 面向 Pages Router、`i18next` 手动接 RSC 成本高、自研 context 无
SEO 支持，均不如 `next-intl`。）

### 3.2 集成方式（文件清单）

```
src/i18n/
  routing.ts        # defineRouting({ locales: ["zh","en"], defaultLocale: "zh", localePrefix: "always" })
  navigation.ts     # createNavigation(routing) → 类型化 Link/useRouter/usePathname/redirect/getPathname
  request.ts        # getRequestConfig：按 locale 加载 messages/ 下字典（可异步、可缓存）
src/middleware.ts   # createMiddleware(routing) + matcher
messages/
  zh.json
  en.json
next.config.ts      # createNextIntlPlugin("./src/i18n/request.ts")(nextConfig)
```

- **根布局 `src/app/layout.tsx`**：仅 `return children`（Next 要求必须存在根 layout）。
- **`[locale]/layout.tsx`**：设置 `<html lang={locale}>`，注入 `NextIntlClientProvider`（仅传
  该页面需要的 namespace，避免把所有字典塞进客户端），包 `Header`/`Footer`。
- **`src/middleware.ts`**：`createMiddleware(routing)`；`matcher` 排除 `["/api", "/_next", "/assets", 文件扩展名]`。
  根 `/` 的语言协商用 `@formatjs/intl-localematcher` + `negotiator`（见 §9）。

### 3.3 字典文件组织

按「语言 × 命名空间」拆分为多文件，服务端按需加载、客户端按页面注入最小集合：

```
messages/
  zh/
    common.json      # 导航、页脚、通用按钮（加入购物车/结账/继续购物…）
    home.json        # 首页 hero、slogan、宣传区块
    product.json     # 目录/详情/变体标签（系列名、情绪、尺寸规格）
    cart.json        # 购物车/抽屉
    checkout.json    # 结账/支付成功
    about.json       # 品牌故事/团队/零售网络/未来 IP
  en/
    common.json ... （同构）
```

加载约定：`getRequestConfig` 里 `messages = (await import(`../../messages/${locale}/${ns}.json`)).default`
按需合并；页面用 `getTranslations("product")` 取命名空间。**商品名/文案的本地化**：结构性字段
（code、价格、图片、系列 slug）进 `src/data/products.ts`；可本地化文案（名称、描述、系列叙事）
走字典 key（如 `product.name.<code>`），这样 `products.ts` 不掺语言，字典成为唯一文案源。

### 3.4 语言切换

`LanguageSwitcher`（"use client"）用 `src/i18n/navigation.ts` 的 `usePathname` + `useRouter`
做 `router.replace(pathname, { locale: target })`，切换后保留当前路由并写入语言 Cookie
（next-intl middleware 自动维护 `NEXT_LOCALE` Cookie，实现记忆）。

### 3.5 SEO：metadata / hreflang / canonical

- `[locale]/layout.tsx` 的 `generateMetadata({ params })`：
  - `title.template` / `description` 用 `getTranslations("common")` 按 locale 出；
  - `metadataBase = new URL(env.NEXT_PUBLIC_SITE_URL)`；
  - `alternates.languages = { zh: "/zh", en: "/en" }`（next-intl 提供类型化助手），
    页面级再给 `alternates.canonical`。
- 详情/系列页在各自 `generateMetadata` 里输出该实体的本地化 title/description + 对应
  `alternates.languages`，保证每页 hreflang 成对、canonical 唯一。
- `<html lang>` 由 `[locale]/layout.tsx` 动态设置，服务端直出正确语言标记。

---

## 4. 数据层

### 4.1 商品数据源：单一 `src/data/products.ts`

**结论**：商品用**单一 TS 数据文件 + zod 运行时校验**，仅服务端导入；**不**走数据库。

理由：
- 商品是低频变更的静态资产（29 个形象 + 系列 + 价格），静态数据天然适合 SSG/RSC 直出，
  性能最好、零 DB 往返；
- zod 校验（沿用项目 `env.ts`/`validation.ts` 的 zod 约定）在启动/测试期拦截坏数据；
- 未来若上 CMS/后台，只需把该模块改为「从 DB 读」的实现，**数据接口（`getProducts` 等）
  保持不变**，页面零改动。这符合 `AGENTS.md`「数据访问层隔离」的精神。

文件职责：

```
src/data/
  products.ts        # Product 类型 + zod schema + 29 个形象数据 + 系列定义
  series.ts          # Series 定义（slug ↔ 中文名/英文名 key ↔ 产品 code 集合）
  images.ts          # 由 scripts/sync-assets.mjs 生成的「code → 相对路径」映射（提交进仓库）
```

`products.ts` 导出纯函数（服务端专用，不 import 到客户端组件）：

```ts
export type SeriesSlug = "fashion-bag-charm" | "signature" | "multi-texture"
  | "recycled-eco" | "active-sporty" | "outdoor-lifestyle"
  | "princess-elegance" | "playful" | "large-plush" | "custom" | "future-ip";

export const productSchema = z.object({
  code: z.string(),              // PCOF1-A3 / OF 2.6 …
  series: z.custom<SeriesSlug>(),
  priceUsdCents: z.number().int().nonnegative(),   // 金额一律「美分」整数，避免浮点
  image: z.string(),             // /assets/products/xxx.jpg
  gallery: z.array(z.string()),  // 同系列/同形象多图（可选，先用 1 张）
  inStock: z.boolean().default(true),
  order: z.number(),             // 展示排序
});

export function getProducts(): Product[];            // 全量，按 order 排序
export function getProductByCode(code: string): Product | undefined;
export function getSeries(slug: SeriesSlug): Series; // 系列叙事 + 成员 code 列表
export function getProductsBySeries(slug: SeriesSlug): Product[];
```

**数据缺口说明（对应 brand-brief §9）**：中英文名、价格、`产品图 ↔ 编码` 精确映射暂不可得。
落地时 `products.ts` 以 PDF 编码 + 占位价（如 `priceUsdCents: 3999`）填充，映射按
`scripts/sync-assets.mjs` 生成的顺序自动对齐（`images.ts`），后续只在 `products.ts`/`images.ts`
修正即可，不波及组件。

### 4.2 服务端 / 客户端组件边界

原则：**页面尽量 server，交互用「客户端岛」下沉到最小 leaf 组件**。

| 组件/文件 | 边界 | 说明 |
| --- | --- | --- |
| `[locale]/*/page.tsx`、`layout.tsx` | server | 直读 `getProducts()`/`getTranslations()` |
| `Header` / `Footer` | server | 导入客户端 leaf（LanguageSwitcher、CartButton） |
| `ProductCard` | server | 纯展示（图 + 名 + 价），不含按钮交互 |
| `ProductGrid` | server | 循环 `ProductCard`，可选按 searchParams 过滤 |
| `ProductGallery` | client | 缩略图/主图切换、缩放态 |
| `VariantSelector` | client | 选择「形象/系列」，回调 `onSelect(code)` |
| `AddToCartButton` | client | 调 CartProvider 写状态 |
| `CartProvider` / `CartDrawer` / `CartButton` | client | 见 §5 |
| `CheckoutForm` / `CheckoutButton` | client | 提交后重定向 Stripe |
| `LanguageSwitcher` / `MobileNav` | client | 交互 |
| 品牌宣传区块（`BrandStory` 等） | server | 静态长文案 + 图片，无需交互 |

---

## 5. 购物车状态管理

**选型：React Context + `localStorage` 持久化（客户端），URL state 仅用于目录过滤/详情选中。**

理由：
1. **购物车语义**：购物车是「会话级私有状态」，天然不适合放进 URL（会被分享/收藏/回退污染，
   且带隐私语义）。URL state 更适合可分享/可链接的**视图状态**（目录的系列筛选 `?series=`,
   详情页选中的形象 `?code=`），两者各司其职。
2. **无服务端购物车成本**：Stripe Checkout Session 由「结账时」一次性 POST 购物车明细创建，
   中途无需服务端保存购物车 → 不需要为此引入购物车表/接口（对齐 `commerce/spec.md` 预留）。
3. **localStorage 提供跨刷新持久化**，Context 提供响应式 UI（抽屉、角标数量实时更新）；
   SSR 首屏安全（Provider 默认空，客户端 hydration 后再回填，避免 hydration mismatch）。

实现要点：

```tsx
// src/components/cart/cart-provider.tsx  ("use client")
type CartLine = { code: string; qty: number };
type CartState = { lines: CartLine[]; isOpen: boolean };
// add(code, qty) / remove(code) / setQty(code, qty) / clear() / open() / close()
// useEffect 里把 lines 同步写 localStorage（key: "offy.cart.v1"），初始化时惰性读取。
// 价格/库存/商品名不存进 cart —— 渲染合计时按 code 用产品主数据（含价格）派生。
```

**安全边界（重要）**：购物车只存 `code + qty`，**不信任客户端传来的价格**。结账接口
`/api/checkout` 服务端用 `getProductByCode()` 重新算每个 line item 的单价与总额，再传给
Stripe；客户端 cart 里的价格仅作展示。

---

## 6. 组件树

```
[locale]/layout
├─ Header (server)
│  ├─ Nav (server)                     # 首页/产品/系列/关于
│  ├─ LanguageSwitcher (client)
│  ├─ CartButton (client) ──▶ CartDrawer (client)
│  └─ MobileNav (client)
├─ main
│  ├─ 首页 page (server)
│  │  ├─ Hero (server)
│  │  ├─ SeriesEntry (server)          # 系列入口网格
│  │  ├─ FeaturedProducts (server) ──▶ ProductGrid ──▶ ProductCard
│  │  ├─ BrandStorySection (server)    # dogguo/littlebeast 式宣传
│  │  │  ├─ LookbookGallery (server)   # 用 ins/ 图
│  │  │  ├─ TeamSection / RetailNetwork / FutureIPs (server)
│  │  └─ NewsletterForm (client, 复用现有)
│  ├─ /products page (server) ──▶ FilterBar(server, 读 ?series=) + ProductGrid
│  ├─ /products/[code] page (server 壳)
│  │  ├─ ProductGallery (client)
│  │  ├─ VariantSelector (client)      # 形象/系列切换
│  │  └─ AddToCartButton (client)
│  ├─ /collections/[series] page (server) ──▶ SeriesHero + ProductGrid
│  ├─ /cart page (client) ──▶ CartLineItem + CartSummary
│  ├─ /checkout page (client) ──▶ CheckoutForm ──▶ CheckoutButton(client, Stripe)
│  └─ /checkout/success page (server)
└─ Footer (server)
```

组件文件落位（含 TDD 要求的同名测试）：

```
src/components/
  layout/            Header.tsx / Footer.tsx / Nav.tsx / MobileNav.tsx / LanguageSwitcher.tsx
  product/           ProductCard.tsx / ProductGrid.tsx / ProductGallery.tsx /
                     VariantSelector.tsx / AddToCartButton.tsx
  cart/              cart-provider.tsx / CartButton.tsx / CartDrawer.tsx /
                     CartLineItem.tsx / CartSummary.tsx / use-cart.ts
  checkout/          CheckoutForm.tsx / CheckoutButton.tsx
  brand/             Hero.tsx / BrandStorySection.tsx / LookbookGallery.tsx /
                     SeriesEntry.tsx / TeamSection.tsx / RetailNetwork.tsx / FutureIPs.tsx
```

`ProductCard`（server）与 `AddToCartButton`（client）解耦：卡片的「加入购物车」是一个
客户端叶子，卡片本体保持 server 可静态化。

---

## 7. 图片管线

### 7.1 拷贝与目录规范

禁止外链；由**可重复执行的脚本** `scripts/sync-assets.mjs` 把 `resources/` 归一化拷贝进
`public/assets/`（只拷图片扩展名 `.png/.jpg/.jpeg/.webp`，跳过 `.DS_Store` 与 `.zip`）：

```
public/assets/
  products/          # 来自 resources/产品修图/（29 张，竖版 3:4 白底产品图）
    signature-01.jpg ... signature-03.jpg
    fashion-bag-charm-01.jpg
    multi-texture-01.jpg ...
    active-sporty-01.jpg ...
    princess-elegance-01.jpg ...
    ...
  ins/               # 来自 resources/ins/（21 张竖版 2551×3437 生活方式图）
    lookbook-01.jpg ... lookbook-21.jpg
  brand/
    brand-manual-cover.png   # 来自 resources/凭空幻想...2026.png（品牌手册封面）
```

### 7.2 命名规范

- 全部 **ASCII kebab-case**，去除中文/时间戳文件名（`ChatGPT Image 2026年…` 等）。
- 产品图：`{series-slug}-{NN}.{ext}`（NN 两位序号）；`ins`：`lookbook-{NN}.{ext}`；
  品牌素材：`brand-*.{ext}`。
- 脚本按 `产品修图/` 内文件名稳定排序（或显式映射表）生成 `src/data/images.ts` 的
  `Record<code, "/assets/products/...">`，并把「旧文件名 → 新文件名」清单打印/落盘以便追溯。
  **`images.ts` 提交进仓库**，`products.ts` 通过它引用图片，不手写路径。

### 7.3 `next/image` 使用约定

- 全部本地路径 `<Image src="/assets/..." />`，**不需要** `images.remotePatterns`（无外链）。
- 商品卡固定 3:4 比例（源自源图 1080–1122×1448–1454）：父容器 `relative aspect-[3/4]`，
  `<Image fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover" priority={i<4} />`。
- Hero/LCP 图加 `priority`；ins lookbook 大图按视口给 `sizes`；详情主图 `priority` + `quality`。
- `sharp` 已随 Next 提供本地优化（见 `package.json` onlyBuiltDependencies），`standalone`
  输出下自动可用，无需额外配置。
- 文案中的 `alt` 从字典取（如 `product.alt.<code>`），保证可访问性与本地化一致。

---

## 8. 支付（Stripe）流程

币种 **USD**，金额服务端以「美分」整数传递，杜绝浮点误差。

```
用户 /checkout（CheckoutForm）
  ──POST { lines: [{code,qty}] , email, locale }──▶
  src/app/api/checkout/route.ts（server）
     1. zod 校验请求
     2. 用 getProductByCode() 服务端重算 line_items（price_data，unit_amount = priceUsdCents）
     3. stripe.checkout.sessions.create({ mode:"payment", currency:"usd",
          success_url: `${SITE_URL}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${SITE_URL}/${locale}/cart` })
     4. 返回 { url: session.url }
  ──▶ 客户端 CheckoutButton 用 stripe.redirectToCheckout({ sessionId }) 或 location=url
  ──▶ Stripe 托管结算页（收卡/地址）──▶ 成功后回 /checkout/success
  ──▶ webhook（src/app/api/webhooks/stripe/route.ts，预留）：
        check `checkout.session.completed` → 落订单（未来里程碑，见 commerce/spec.md）
```

- **服务端逻辑**收敛到 `src/server/checkout/`（如 `create-checkout-session.ts`），
  API route 只做编排，符合 `AGENTS.md` 分层；测试用注入的 fake Stripe client。
- `success` 页可选按 `session_id` 调 `stripe.checkout.sessions.retrieve` 回显订单摘要；
  订单持久化留待 commerce 里程碑（写 spec delta 后再实现）。

---

## 9. 依赖清单（需新增）

| 依赖 | 类型 | 用途 |
| --- | --- | --- |
| `next-intl` | dependency | 多语言路由/字典/SEO 助手 |
| `@formatjs/intl-localematcher` | dependency | middleware 里 `Accept-Language` → locale 匹配 |
| `negotiator` | dependency | 解析 `Accept-Language` 头 |
| `@stripe/stripe-js` | dependency | 客户端加载 Stripe.js（`redirectToCheckout` / 未来 Elements） |
| `stripe` | dependency | 服务端 SDK（创建 Checkout Session / 校验 webhook 签名） |

（`sharp` 已随 Next 提供，无需显式新增。类型：`@types/negotiator` 若需要则入 devDependencies。）

建议安装：

```bash
pnpm add next-intl @formatjs/intl-localematcher negotiator @stripe/stripe-js stripe
```

---

## 10. 环境变量（经 `src/lib/env.ts` 扩展，服务端只读；客户端仅 `NEXT_PUBLIC_*`）

```ts
// src/lib/env.ts 追加（zod，服务端）
STRIPE_SECRET_KEY: z.string().min(1),           // 服务端创建 Session
STRIPE_WEBHOOK_SECRET: z.string().optional(),   // webhook 签名校验（预留）
NEXT_PUBLIC_SITE_URL: z.string().url(),         // metadataBase / 成功回跳
// 客户端（.env.local 下 NEXT_PUBLIC_*）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),  // 前端 Stripe.js
```

> 提交 `.env.example` 模板，真实值不进仓库（`AGENTS.md` 与现有 `.gitignore` 已约定）。

---

## 11. 测试策略（对齐 TDD）

- 纯函数：`src/lib/cart.ts`（购物车归并/数量、合计派生）、`src/lib/pricing.ts`（美分运算）、
  `src/i18n/*` 字典加载 → 同名 `.test.ts`。
- 组件：`ProductCard`/`VariantSelector`/`CartDrawer`/`CheckoutForm` 用 Testing Library；
  `CartProvider` 用 `jsdom` + 注入 `localStorage` 验证持久化。
- 服务：`src/server/checkout/*` 用 `// @vitest-environment node` + 注入 fake Stripe，断言
  line_items 金额服务端重算、错误输入被 zod 拒绝。
- 语言：`next-intl` 的 `NextIntlTestProvider` 供组件测试注入固定 messages。

---

## 12. 三个最关键架构决策（摘要）

1. **`next-intl` + `localePrefix: "always"` + `defaultLocale: "zh"`**：locale 段作为第一层
   路由维度，`/` 由 middleware 语言协商重定向；每页 `generateMetadata` 出 hreflang/canonical。
   扩语言只加字典文件 + `routing.ts` 数组，路由结构不动。

2. **商品 = 单一静态数据源 `src/data/products.ts`（TS + zod，仅服务端导入），不走数据库**：
   静态商品天然适合 RSC/SSG 直出，且通过 `getProducts()/getProductByCode()` 收敛访问接口；
   未来上 CMS/DB 只替换该模块实现，页面零改动。金额一律「美分整数」，服务端计价。

3. **购物车 = React Context + `localStorage`（客户端），结账时服务端重新计价**：购物车只存
   `code + qty`（不存价格/信任客户端），Stripe Checkout Session 在结账瞬间由服务端按商品主数据
   重新算价创建；无需服务端购物车/购物车表，贴合 `commerce/spec.md` 的预留边界与 casetify 式
   「选款→支付」轻量流程。

---

## 附录 A：系列 ↔ 编码映射（供 `series.ts` 落地）

| series slug | 中文系列名 | 编码（源自 brand-brief §5.2） |
| --- | --- | --- |
| `fashion-bag-charm` | 时尚包挂系列 | PCOF1-F0 |
| `signature` | Signature Plush 经典毛绒 | PCOF1-F1 / F2 / F3 |
| `multi-texture` | Multi-texture（环保再生 + 金属质感） | PCOF1-F4 / F5 / F6 |
| `recycled-eco` | Recycled & Eco Materials | PCOF1-F6 / F7 / F8 |
| `active-sporty` | 01 Active & Sporty | PCOF1-A3 / A4 |
| `outdoor-lifestyle` | 02 Outdoor & Lifestyle | PCOF1-B2 / B3 / B4 |
| `princess-elegance` | 03 Princess & Elegance | PCOF1-C2 / C3 / C4 / C5 |
| `playful` | 04 Playful | PCOF1-D 系列 / D1 |
| `large-plush` | 大号毛绒玩偶 | 原皮 Offy / 泰国限定 Offy |
| `custom` | 定制系列 | OF 02 / 03 / 2.2 / 2.4_1 / 2.6 / 2.11 / 2.12 / 2.13 / 2.31 / 2.32 / 2.42 / 2.51 / 2.52 / 3.1 |
| `future-ip` | 未来 IP 预告 | MISS KITTY / PSYCHE |

> 29 张产品图当前按脚本顺序映射到 29 个商品条目（占位 code），待权威「图↔编码」映射
> 到位后在 `images.ts`/`products.ts` 一处修正。
