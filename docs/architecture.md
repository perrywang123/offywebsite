# Offy 当前架构

基线：2026-10-31。描述现有实现；已实现取消本地回退，依据 [批准变更](../openspec/changes/archive/2026-10-31-shopify-authoritative-catalog/design.md)。

## 应用边界

Next.js 15 App Router 单应用，服务端页面读 Shopify，客户端通过本站 API 读取商品。布局提供 next-intl、CartProvider、Header/Footer/CartDrawer；`[locale]/template.tsx` 承担页面进入动画。

```text
访客请求 → next-intl middleware → 页面/metadata
                   ↓ 国家头 → GeoIP → 默认市场
页面 → server/catalog/live → server/shopify → Storefront API
客户端购物袋 → /api/products[/code] → 同一 live 层
结算 → /api/payments/checkout → provider → Shopify Cart/旧 Stripe/PayPal
订阅/旧支付订单 → Drizzle → SQLite
```

## 路由与国际化

`src/i18n/routing.ts` 只有 en，`localePrefix=as-needed`。`publicPath()` 生成公开路径，不能手写 `/en` canonical。middleware 排除API、静态资源及`_next`，admin和r入口绕过locale处理；旧 zh 前缀单独 308，en 前缀由 next-intl 307。`messages/zh.json` 与中文分支未对外开放，字典测试仍检查 key 一致。时区配置 UTC，避免 hydration 差异。

## 数据源与失败行为

| 数据                          | 主来源                             | 当前失败行为                             |
| ----------------------------- | ---------------------------------- | ---------------------------------------- |
| 商品成员/商业字段             | Storefront collection/product 查询 | 不可用结果；页面重试/API503              |
| 无系列周边                    | products outside known collections | 不可用结果                               |
| 系列名                        | Shopify Collections                | 隐藏未验证的系列导航                     |
| 系列 slug/映射/hero/tagline   | `lib/catalog/series.ts`、live 映射 | 本地站点配置                             |
| 首页 Hero/NEWS 链接与品牌内容 | `lib/content.ts`、字典、品牌资产   | 品牌内容静态；NEWS验证绑定商品并取实时图 |
| FAQ/故事/联系信息             | `lib/faq.ts`、字典、policies 常量  | 静态                                     |
| 四条政策正文                  | Shopify shop policies              | 200 页面中的正文不可用提示               |
| 订阅/旧支付订单               | SQLite                             | 现有同步 DAL，不是 Shopify 订单镜像      |

真实系列映射：princess-lady→frontpage；outdoor-sporty→outdoor-sporty系列；playful-life→趣味生活系列。当前不会自动把任意新建 Collection 加进导航。商品使用 code=handle；SKU 是展示字段；首个 variant 是结算变体，多规格 UI 未实现。

`getLiveProducts` 并发读取三系列和 merch；merch 在末尾。New Looks 每系列按 createdAt 降序取两款可售商品。首页名册排除 merch。详情按 handle 取最多 10 张图与段落描述，相关推荐按真实系列/merch 查询。

列表与Collections每页250并跟随游标，分页错误不发布部分名册；最多100页，重复游标拒绝。商品归属最多250个Collection，超过明确不可用；详情图片最多10张、variant首个。列表/详情/结算统一首variant的市场价格。

## 市场与缓存

`pickCountry()` 优先国家请求头，再取 XFF 首个 IP/x-real-ip 经 geoip-lite 解析，最后 SHOPIFY_MARKET_COUNTRY（默认 US）。金额与 Shopify 返回 currency 一起使用，不本地换汇；当前商品前台金额按×100/÷100建模；新增KOL财务层单独处理零/两/三位小数币种与精确舍入，不把两层混用。

Shopify 商品/系列 fetch 为 no-store、5s超时；商业页面与共享布局 force-dynamic，无商业ISR旧数据回退。React cache仅用于单次服务端渲染去重。查询类型/参数/国家保留ck隔离；公开商品API成功、404和503均no-store。政策仍为revalidate=300、5s超时。

区域限定按配置国家可见性比较，只对目标白名单展示。所有范围探测必须成功、至少两国；失败则隐藏推断结果。无跨请求探测缓存，不把超时当作该国不可售。它不是Shopify tag/metafield，也不证明全球严格单国独占。

## 购物袋和结算

CartProvider挂载、抽屉打开、加购、页面恢复可见和结算准备时重新验证。API目录外的本地code直查详情，明确404才删除；任何行未验证则保留记录、隐藏全部商品事实/小计/结算并显示重试。只存offy.cart.v1的code/quantity，合并并限制1–99。请求世代号防止旧响应覆盖用户加购/清袋，存储不可用时仍支持当前会话。

useCheckoutRedirect固定shopify，先登记匿名诊断尝试，再重新验证目录并请求服务端结算；pending与同步ref防重复。4xx指名商品；网络/5xx/无URL原地显示可重试提示，不再自动跳/checkout。保留/checkout用于旧回调和直接访问，其表单仍固定Shopify，provider不使用该email/shipping输入。

Shopify 持有订单，capture 不支持。`/checkout/return` 挂载清袋但不验证真实付款；商家仍需配置结账回站。Stripe webhook 验签后落订单，PayPal return 同步 capture 并对照快照金额；两条保留路径限制 USD，不在当前 UI 提供。

## API

| 路由                                     | 方法 | 当前职责                                                             |
| ---------------------------------------- | ---- | -------------------------------------------------------------------- |
| /api/health                              | GET  | 存活和配置是否非空，不访问 Shopify、不校验凭据可用性                 |
| /api/products、/api/products/[code]      | GET  | 当前市场商品/单品；200空集、404确认缺失、503不可用                   |
| /api/payments/checkout                   | POST | 校验、数量 clamp、市场识别、provider 分派；未填 provider 默认 Stripe |
| /api/checkout/attempts                   | POST | 匿名尝试登记与有界浏览器观察，回执不能读取记录                       |
| /api/checkout/session                    | POST | 保留 Stripe 入口                                                     |
| /api/webhooks/stripe                     | POST | 验签、paid 检查、幂等订单写入                                        |
| /api/payments/paypal/orders/[id]/capture | POST | PayPal capture                                                       |
| /api/orders/by-session/[sessionId]       | GET  | 订单号/状态/金额摘要                                                 |
| /api/newsletter                          | POST | 归一化邮箱与去重入库                                                 |

新增`/r/[alias]`、`/api/kol/visit`、`/api/kol/webhook`、`/api/kol/worker`及受保护`/api/admin/kol/*`。没有`/api/events`或`/api/webhooks/shopify`别名，实际Shopify收件地址是`/api/kol/webhook`。管理接口/任务详见 [运行手册](kol-platform-operations.md)。

## 数据库与安全边界

`schema.ts` 使用 sqlite-core，client 使用同步 better-sqlite3，WAL + foreign_keys + busy_timeout。保留四张表newsletter_subscribers、checkout_sessions、orders、order_items；另有16张kol_*表独立保存身份、合作/链路、发码/事件任务、订单账本与结算/审计。2026-11-01新增checkout_attempts/checkout_attempt_events两张匿名结账诊断表，记录准备过程而不是订单。Drizzle迁移0000–0007。完整链接和Cart密钥加密，见 [结账诊断](checkout-diagnostics.md)。

PostgreSQL env 枚举和依赖存在，但非 sqlite 会抛错，不能复用 SQLite schema 后只换连接字符串。迁移 PG 需 pg schema/迁移、异步服务改造与独立测试。

订单确认以高熵 session/order id 查询，拒绝顺序订单号枚举。政策 HTML 白名单消毒，JSON-LD 转义 `<`。KOL管理入口已实现管理员鉴权、Origin/CSRF、登录限流、审计及账本/结算事务；全站统一限流、客户账户和legacy完整订单事务仍未实现。

新环境读取经 `env.ts`；instrumentation/health 的配置诊断、Next 配置、迁移与部署工具有现有直接读取 process.env 的边界。不得把密钥送入客户端。SHOPIFY_ADMIN_TOKEN现用于可选KOL订单/优惠服务，仅服务端读取；生产KOL默认关闭。新增纯Node管理员/worker工具各自校验最小输入，其配置项同时列入env.ts；独立集成编译目录是Next配置例外。

## 展示、SEO 与发布

见 [DESIGN](../DESIGN.md) 与 [SEO](seo-plan.md)。源码共享布局和主题；业务页面不能单独重建另一套边距。Product Offer采用同页已验证市场金额；故障页面动态200+noindex，不输出Product/Offer和假数量。sitemap.xml使用RouteHandler在失败时返回503+no-store，不发布部分枚举。

部署主路径 Docker Compose + nginx + SQLite volume。geoip-lite 外部化并追踪运行时 .dat 文件；迁移进 standalone 需要额外 drizzle-orm（Dockerfile 已补）。详见 [deployment](deployment.md)。

## KOL数据链路

公开动态链接→随机短会话→tab内ticket→服务端checkout意图/比例快照→Shopify Cart属性；签名事件→最小持久收件箱→worker读取Admin订单/交易/退款→cart/签名/期限核验→商品净额/佣金差额账本→分币种月结快照。外部API不在数据库事务内等待，未知证据进入review。公开商品读取不查询合作/财务表。

admin为独立root layout，逐请求入口校验，API再验证管理员session。独立Nginx端口分别转发app:3000/admin宿主loopback3001，独立容器共用原SQLite卷，worker为独立进程，经秘密认证内网接口消费任务。默认关闭、结算另设开关；详细配置、模型和运行限制见 [运行手册](kol-platform-operations.md)。

部署复用 `deploy/update.sh` 的配置/锁/备份/检查流水线；服务器 `deploy/update-admin.sh` 自动从同一 Git 上游 fast-forward，仅构建/替换独立 admin 镜像和 worker，不重启 app。整套更新仍用 `deploy/update.sh --kol`，顺序启动两个应用避免并发启动迁移。worker改为调用admin的内部接口。独立更新会检查实际运行中主站的配置及真实共享卷；不兼容数据库变更需协调整套升级。`x-offy-deploy` 是宿主侧代理元数据，DEPLOY_*不传应用/浏览器。开发机 SSH 上传与源码包保留为可选工具；详见 [部署](deployment.md)。

镜像构建通过 `deploy/build-limits.py` 准备项目专属 BuildKit `docker-container` builder，`DEPLOY_BUILD_CPUS` 默认1 CPU，所有服务构建共用该预算；`buildkitd.toml` 限制单任务并行。脚本核验Buildx/Compose/内核能力及实际构建器配额，失败不使用无限制替代；不更改运行中的 app/admin/worker 资源设置。构建器缓存独立持久保留，具体边界见部署手册。
