## Why

Offy 的独立站目前**没有任何政策页面或政策入口**——`src/app/[locale]/` 下没有 policy /
privacy / terms 任何路由，页脚也一条政策链接都没有。与此同时，Shopify 后台
（设置 → 书面政策）已经配好了五项内容且状态为「已发布」。这带来两个实际问题：

1. **合规缺口**：Stripe 的网站检查表要求服务条款与退款政策在站上可访问、且结算路径上
   有可点链接；Google Merchant Center 有专门的「网店上缺失联系信息」拒登理由。本站
   同时接了 Stripe / PayPal / Shopify 三个结算渠道（`src/server/payments/registry.ts`），
   而自建结算页 `[locale]/checkout` 全文没有任何政策字样。
2. **页脚有失效联系信息**：第 4 列 CONTACT 硬编码 `hello@playcoretoys.com`（旧实体域名）
   与「小红书 @is.offy」。政策正文里的实体是 `Whimcore Cultural Creative Co., Limited`，
   两者不是同一家——留着会让站上出现两套互相矛盾的联系信息。

规划阶段直接对线上 Storefront API 做了实测，得到三个决定实现方式的事实：

- **四个政策可以用现有 token 拿到干净 HTML 正文**（privacy 26,964 / refund 16,253 /
  shipping 14,323 / terms 37,384 字符），**不需要任何新增权限**。
- **`@inContext(language:)` 切不动语言**：`EN` 与 `ZH_CN` 返回字节级完全相同的内容
  （正文 CJK 字符数为 0）。政策翻译要在 Shopify 的 Translate & Adapt 里单独配，目前没配。
- **联系信息 Storefront API 读不到**（`shop` 上没有对应字段），只能站内静态维护；
  后台的「法律声明」未设置，公开页 `/policies/legal-notice` 返回 404，因此不做这一项。

## What Changes

- **新增 `/[locale]/policies/[handle]` 动态路由**，五个 handle 用短名白名单：
  `returns` / `privacy` / `terms` / `shipping` / `contact`。不沿用 Shopify 的原样 handle
  （它的 `url` 字段实测是 `checkout.shopify.com` 域的结账内副本，不是店铺公开页，
  所以「与 Shopify 公开页 URL 一致」这个收益并不存在），避免把外部契约焊进对外 URL。
  **handle 不在白名单立即 `notFound()`**——否则任意 `/policies/xxx` 会渲染 200 空页。
- **新增 `src/server/catalog/policies.ts`**：一次 `shop { privacyPolicy refundPolicy
  shippingPolicy termsOfService { title body } }` 查询取回四个政策；
  `?ck=shop-policies` 沿用仓库既有的防缓存串味护栏，`revalidate: 300`（政策极少改，
  且正文与语言无关，zh/en 共享同一份缓存）。联系信息走站内静态结构。
  展示名统一放 i18n 的 `policies.titles.*`，数据层不再存一份（两处维护必然漂）。
- **新增 `src/lib/sanitize.ts` 白名单消毒器**：政策正文是后台富文本，直接
  `dangerouslySetInnerHTML` 等于开一条 XSS 通道。剥掉全部属性（正文里的 `class="p1"`
  是 PDF 导出产物，对本站样式无意义）、丢弃 `script`/`style` 及其内容、校验 `href` 协议。
- **新增 `policies` i18n 命名空间**（中英双份）；删除 `common.footer.contact` 与
  `common.footer.social`（删列后成死键），新增 `common.footer.policiesHeading`。
- **页脚第 4 列由 CONTACT 换成「政策与联系」**，5 条入口与 MENU / COLLECTIONS 完全同级
  （同 kicker、同字号字距、同 hover），不新增第三种链接样式。三列 `<nav>` 补 `aria-label`。
  **栅格断点 `md:grid-cols-4` → `md:grid-cols-2 lg:grid-cols-4`**：768–1023px 下
  `container-site` 约 707px，四列每列仅 ~150px，而品牌简介自带 `max-w-xs`(320px)，
  说明原设计预期该列 ≥320px；新增政策列的长标签会开始折行。
- **`src/app/globals.css` 新增 `.policy-body` 作用域样式**：正文走
  `dangerouslySetInnerHTML`，无法给内部元素挂 class，样式只能是父容器后代选择器。
  另补 `.focus-ring` / `.focus-ring--on-dark`——此前全站文字链接完全没有焦点样式
  （只有两处 input 有 `focus:border-*`）。
- **中文站显示英文原文 + 语言说明提示条**：不做机翻。政策是自撰法务文本且带生效日期与
  版本号，未授权翻译会制造「两个版本谁为准」的歧义。正文容器带 `lang="en"`，
  否则屏幕阅读器会用中文音素读三万个英文字符。
- **`src/app/sitemap.ts` 加入 5 个政策 URL**（双语言自动展开）。
- **首页联名洽谈 CTA 的邮箱** `hello@playcoretoys.com` → `contact@whimcoreofficial.com`
  （旧域名与政策正文里的实体不一致）。
- **`Dockerfile` 从 deps 阶段复制 corepack 缓存**：`corepack enable` 只是装 shim，
  真正执行 `pnpm` 时才去 registry 现拉对应版本；每个 stage 文件系统独立，builder 会再拉
  一次，构建机出网被重置时直接 `ECONNRESET` 构建失败（本次真实踩到）。

## Capabilities

### ADDED

- **legal-policies**：五项书面政策在站内可达（四个取自 Shopify 后台实时正文，
  联系信息为站内静态结构化内容），页脚提供入口，长文页浅色底 + 限宽正文列，
  中文站附英文原文说明，未知 handle 返回 404。

### MODIFIED

- **brand-site**：页脚第 4 列由 CONTACT 变为「政策与联系」；栅格断点调整；
  三个 `<nav>` 补 `aria-label`；全站文字链接补 `focus-visible` 焦点样式；
  首页联名洽谈邮箱换域名。

## Impact

- 新增：`src/server/catalog/policies.ts`(+test)、`src/lib/sanitize.ts`(+test)、
  `src/app/[locale]/policies/[handle]/page.tsx`。
- 修改：`src/components/layout/Footer.tsx`、`src/app/globals.css`、`src/app/sitemap.ts`、
  `src/app/[locale]/page.tsx`、`messages/{en,zh}.json`、`Dockerfile`。
- 不改：结算流程与 Stripe Session 参数（自建结算页加政策链接属后续加固项）、
  Header 导航、商品/购物车/订单、数据库 schema。
- 依赖：只用现有 `SHOPIFY_STOREFRONT_TOKEN`，**不新增任何 Shopify 权限**。
