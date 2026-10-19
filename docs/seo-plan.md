# Offy 独立站 SEO 优化方案

> 2026-10-19 基于**生产环境实测**产出。每条结论都有实测证据，不是通用清单。

## 一、现状诊断（实测）

### 🔴 P0-1 五个页面的 canonical 指向首页 —— 正在生效的索引级问题

| 页面 | `<title>` | `canonical` |
| --- | --- | --- |
| `/` | `is.offy — Imagine with Love…` | `https://isoffy.com` ✓ |
| **`/products`**（All Looks） | **默认（与首页相同）** ✗ | **`https://isoffy.com`** ✗ |
| **`/collections`** | **默认** ✗ | **`https://isoffy.com`** ✗ |
| **`/collections/<series>`** | **默认** ✗ | **`https://isoffy.com`** ✗ |
| **`/about`** | **默认** ✗ | **`https://isoffy.com`** ✗ |
| **`/bag-charm`** | **默认** ✗ | **`https://isoffy.com`** ✗ |
| `/products/<code>` | 商品自己的 ✓ | 自己的 ✓ |

**原因**：`src/app/[locale]/layout.tsx` 的 `generateMetadata` 设了 `alternates.canonical`，而那 5 个页面**没有自己的 `generateMetadata`**，于是继承 layout 的 canonical = 首页地址。

**后果**：Google 把这 5 个页面的规范地址认定为首页 → **判定为重复内容 → 不独立收录**。系列页与 All Looks 是电商最该被搜到的落地页，现在等于全部作废。

### 🔴 P0-2 全站零结构化数据（JSON-LD = 0）

实测 6 个页面 `application/ld+json` 出现次数均为 **0**。等于放弃 Google 的所有富媒体结果：价格、库存、评分、面包屑、FAQ 折叠。

### 🟠 P1-1 商品页 `<title>` 是促销语，不是商品名

```
/products/swan-princess
  title = "BUY 6 OFFY, GET A FREE LIMITED-EDITION SWAN QUEEN | is.offy"
```

根因：`src/server/shopify/catalog.ts` 的商品查询**没有取 Shopify 的 `seo` 字段**，商品页直接拿商品 `title`。而商家把促销语写进了商品标题。

### 🟠 P1-2 首页没有 `<h1>`（实测 h1 = 0）

其余页面都有 1 个 h1，只有首页是 0。首页头图的文字是**烧进图片里的**，语义层没有标题。

### 🟡 P2 其余

- 图片 `alt`：商品图用商品名 ✓，需抽查装饰图是否为 `alt=""`。
- sitemap ✓ 48 条、robots ✓ 屏蔽 `/cart` `/checkout` `/api/`、`SITE_URL` 正确（canonical 为 `https://isoffy.com` ✓ 无 localhost 泄漏）。
- 无 HSTS（不影响 SEO，但安全上建议加）。

## 二、方案

### 第 1 批 · 索引基础（必做，1–2 小时）

**1. 给 5 个页面补 `generateMetadata` + self-canonical**

```
/products                    → "All Looks | is.offy"
/collections                 → "Series | is.offy"
/collections/<series>        → "OFFY Streetwear Series | is.offy"（用真实系列名）
/about                       → "Our Story | is.offy"
/bag-charm                   → "Bag Charms | is.offy"
```

每个页面：`title` + `description`（各写实的 1–2 句）+ `alternates.canonical = publicPath(locale, path)`。
**统一走 `src/i18n/routing.ts` 的 `publicPath()`**（站点无语言前缀）。

**2. 首页加 `<h1>`** —— 用 `sr-only` 或视觉隐藏的 h1，内容用品牌主张（`Imagine with Love. Create with Companion.`）。不影响设计稿。

**验收**：`curl` 5 个页面，`canonical` 必须是自己的路径；Google Search Console 里「重复网页」清零。

### 第 2 批 · 结构化数据（2–3 小时）

**3. `Product` + `Offer`**（商品页）
- `name` / `image`（多张）/ `description` / `sku` / `brand: { name: "is.offy" }`
- `offers`: `price` / `priceCurrency`（**用该国市场的真实币种**，`Product.currency` 已有）/ `availability` / `url`

**4. `BreadcrumbList`**（商品页 + 系列页）
- 商品页：`Home > Shop > <Series> > <Product>`

**5. `Organization` + `WebSite`**（layout，全站一次）
- `name: "is.offy"`、`url`、`logo`、`sameAs: ["https://www.instagram.com/is.offy"]`

**6. `FAQPage`**（`/faq`）
- 10 条问答现成可用，有机会拿到 FAQ 富媒体。

**验收**：Google 的 [Rich Results Test](https://search.google.com/test/rich-results) 逐页通过、无错误。

### 第 3 批 · 标题与内容（半天）

**7. 读 Shopify 的 `seo` 字段**（**这是最关键的一条**）

在商品查询里加：

```graphql
seo { title description }
```

商品页 metadata 改成：`seo.title ?? title` / `seo.description ?? description`。

**这样商家可以在 Shopify 后台逐个商品写 SEO 标题**（不影响前台展示名），**不用改代码**。

**8. 同时建议商家把商品标题里的促销语拆出去** —— `BUY 6 OFFY, GET A FREE…` 是活动信息，不该是商品名。

**9. 各页面独立 `description`** —— 现在除商品页外全是默认的一句话。

### 第 4 批 · 性能与细节（可选）

**10. LCP**：首屏头图加 `priority`；确认 `sizes` 不是 `100vw` 导致下大图。
**11. 图片 `alt`** 抽查补全。
**12. 加 HSTS**（安全）。

### 第 5 批 · 战略决策（**需要老板定**）

**13. 中文站已移除 → 中文搜索流量归零**

之前有 `/zh/*`，现在 308 收敛到英文。如果目标客户含中文用户：

- **恢复成本很低**（`locales` 加回 `"zh"` 一行 + 挂回语言切换）
- 但**前提是愿意维护中文内容**
- **越晚恢复，历史权重迁移越难**

**建议**：不维护就别开（半吊子的双语站比单语更糟）；要开就现在开。

## 三、执行顺序与收益

| 批次 | 内容 | 工作量 | 收益 |
| --- | --- | --- | --- |
| 1 | 5 页 metadata + canonical + 首页 h1 | 1–2h | **最高** —— 不做这个，后面 Google 都看不见 |
| 2 | 4 类 JSON-LD | 2–3h | 高 —— 搜索结果的富媒体展示 |
| 3 | Shopify `seo` 字段 + 文案 | 半天 | 高 —— 标题决定点击率 |
| 4 | 性能细节 | 可选 | 中 |
| 5 | 中文站决策 | 看老板 | 取决于业务 |

## 四、先做这件事（不需要开发）

**把 `isoffy.com` 挂到 Google Search Console + Bing Webmaster Tools 并提交 sitemap。**

- GSC：https://search.google.com/search-console → 添加「域名」资源 → DNS TXT 验证 → 提交 `sitemap.xml`
- Bing：https://www.bing.com/webmasters → 支持从 GSC 一键导入

**为什么先做**：挂了之后才能在 GSC 里**看到 P0-1 的实际影响**（「已排除 → 重复网页」列表），也才能验证修复是否真的生效。否则全是盲做。

## 五、已知的坑

1. **`next/image` 按 URL 缓存优化结果** —— 换图不换名会继续吐旧图，本地需 `rm -rf .next/cache/images`。
2. **`deploy/nginx.conf` 的 `server_name` 是占位值** `offy.example.com` —— 直接拷到服务器会拿到错误的证书。
3. **证书不含 `www.isoffy.com`** —— 访问 www 会报安全警告（实测确认）。需 `certbot -d isoffy.com -d www.isoffy.com`。
