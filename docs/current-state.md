# 当前实现与验证基线

> 2026-11-11：手机侧栏 Help & Support 移除 Shipping & returns，仅保留 FAQ、Contact Us；国家选择、页脚和政策页面保留。属于本地预览更新，尚未发布生产；见 [侧栏验收](design/mobile-help-links/validation.md)。

> 2026-11-11 后续界面调整：NEWS 的 View Details 已增加桌面响应式尺寸，手机保留原样。本轮为本地预览，尚未发布生产；见 [桌面按钮验收](design/desktop-news-cta/validation.md)。

> 2026-11-11：商品详情页已增加单款 1 件 Buy Now，复用 Shopify 结账、市场、诊断和归因上下文；与 Add to Bag 并列，立即购买及回站保留原袋。已完成本地构建与浏览器验收，并以预构建镜像单独发布主站，运行源码 2bf473b；后台及 worker 未替换。未针对 SWAN QUEEN 增加特殊规则，也未修改 Shopify 配置，见 [本地验收](pdp-buy-now-validation.md) 与 [生产发布](pdp-buy-now-production-validation.md)。

> 2026-11-09：已按所有者确认更新顶部运费公告、购物袋侧栏两行提示及 Shipping FAQ 首条，FAQ 共 11 条；其余原问答保持不变。该轮代码/本地验收与实际 Shopify 运费配置、生产部署分开记录，见 [运费文案验收](shipping-copy-validation.md)。

> 2026-11-09：可选 [Meta 站内漏斗与关键事件 CAPI](meta-technical-plan.md) 已在生产开启，后台 `/admin/meta` 可查看接收状态；源码默认开关仍为关闭。预构建镜像已分别发布主站及后台，独立 worker 运行，实际加购和结账准备 CAPI 均被 Meta 接收。见 [生产验收](meta-production-validation.md) 与 [SOP](meta-ads-sop.md)。真实 Shopify Purchase、广告购买归因及目录匹配仍待单独验收。

> 2026-11-08：已实现并分步部署[dt_id落地PV与匿名浏览器UV](collabs-traffic-proposal.md)，与短链请求、官方Visits和财务报告分开。KOL对外合作邮箱改为contact@whimcoreofficial.com；管理员登录不变。生产发布与原生邮箱验证边界见[本轮验收记录](collabs-landing-validation.md)。

> 2026-11-08：增加 [短链打开观察及 Flow 官方归属同步](collabs-observation.md)；与导入财务报告分开，不新增本地计佣或付款。启用及生产验收状态另见发布记录。

> 2026-11-07 更新：已按用户确认加入 Collabs 主计佣模式，详见 [Collabs 运行说明](collabs-operations.md)。本文件下文的当次 session 归因、Offy 生成优惠码与本地月结属于兼容保留的 `offy` 模式；`collabs` 模式禁用这些写入，改为官方门户、报告导入和只读核对。本次生产发布与官方设置的完成状态以发布验收记录为准。

日期：2026-10-31。依据：当前源码、现有测试与本地运行抽查，不等同于生产基础设施或真实支付验收。

## 已实现

- 2026-11-07 后台资源保护与生产独立发布已验收：构建默认1 CPU / 1536 MiB，检查额外可用内存和旧systemd服务，镜像标记Git revision；最新后台功能及worker已单独发布，主站容器和代理保持原样。实际运行版本和边界见 [发布验收](safe-admin-release-validation.md)。

- 英文单语、默认语言无前缀。中文保留代码，`/zh/*` 308 去前缀；`/en/*` 307 去前缀。
- 品牌首页：五屏 Hero → NEWS → FEATURED（精选缺失/失败时按原日期选品）/REGIONAL EXCLUSIVE/All Products 圆形名册 → 包挂预告 → 联名 → 订阅 → 未来 IP。新首页选品布局已于 2026-11-11 发布并核对实际 FEATURED 集合顺序。
- NEWS 的五张宣传图使用 `lib/content.ts` 登记的本地品牌素材；仅用 Shopify 核验绑定商品的市场可售状态，不以商品首图覆盖宣传构图。2026-11-02 从 `808d9b8` 之前的映射恢复；商品详情、价格、库存和结账继续使用 Shopify。见 [恢复验收](news-editorial-restoration-validation.md)。
- 三大系列名称来自 Shopify；slug/Collection handle/系列图/tagline 的站点映射仍本地配置。
- 实时商品清单、详情、市场金额/币种、SKU、多图、售罄列表状态；周边仅在 All Looks，排在公仔之后。
- localStorage 购物袋、公开商品 API 验证、抽屉与独立页、手机 sticky 购买条。
- 购物袋直接跳 Shopify Checkout；备用 `/checkout` 仍收集表单再提交 Shopify。
- 品牌故事、六款包挂图预览、10 条 FAQ、四条 Shopify 政策、静态联系信息。
- SQLite 订阅/旧支付会话/订单；Stripe 验签 webhook，PayPal 同步 capture。
- 自 canonical、首页语义 H1、Product/Offer、BreadcrumbList、Organization/WebSite、FAQPage；sitemap/robots。
- Docker/Compose、nginx、服务启动迁移、GeoIP 国家判定与配置诊断。
- 可选KOL平台：合作、优惠码、订单、月结及诊断五个后台栏目、独立入口/管理员、合作版本、自定义佣金、当次链路、双方式码、Shopify财务核对、分币种账本/月结与审计；默认关闭。见 [运行手册](kol-platform-operations.md)。
- 2026-11-04 合作表单：单一 KOL 名称输入、服务端自动分配固定唯一链接，社媒主页可选，落地页选择，字段级中文错误；保留旧别名和历史条款，无数据库迁移。见 [表单验收](partner-form-validation.md)。
- 2026-11-04 后台侧栏采用站内导航与持久控制台，切换栏目后台刷新、保留框架及各账簿栏目独立筛选，错误和认证失效状态明确处理。首次进入连接态与结账诊断局部读取仍保留。见 [导航验收](admin-navigation-validation.md)。
- 2026-11-04 后台完成交互/视觉专项改造：统一字段、清空和日期反馈，手机折叠筛选与带标签记录，独立弹窗正文/页脚及操作目标摘要；五栏目隔离数据、空库与45组宽度验收完成。交互62→86、视觉58→86为专家启发式评分，非用户实验；见 [专项验收](admin-usability-validation.md)。实现已完成本地验收，生产状态以服务器部署结果为准。

2026-11-01 新增匿名结账诊断：购物袋点击、前置验证、服务端商品核对、Shopify 请求/响应与生成链接写入共用 SQLite；后台第五页筛选、时间线和有审计的原文查看。采集独立于 KOL 开关，记录 30 天/原文加密 7 天。见 [运行说明](checkout-diagnostics.md) 与 [验收](checkout-diagnostics-validation.md)。尚未部署生产。

## 当前数据事实与限制

Shopify 是唯一商品事实来源。本地商品快照、旧 enrich 富化器和 check:catalog 已删除。商品名、描述、图、首variant价格/库存、币种、SKU和系列成员不采用本地覆盖。品牌/预告素材和路由配置保留。

商品/系列/区域探测均 no-store，商业页面与共享布局 force-dynamic；React cache 仅在一次服务端渲染内去重。商品读取5s超时，分页每页250并跟随游标；归属超过250个Collection则拒绝不完整归类。政策仍缓存300s。

公开API区分200成功空集、404确认缺失、503不可用，均no-store。页面故障为动态200+noindex，不输出Product/Offer或假数量；sitemap.xml失败503，不发布部分名册。页面独立成功的商品/品牌区块可保留。

购物袋挂载、加购/打开、恢复可见、结算前验证；失败保存code/quantity，隐藏商品字段/小计/结算并提供重试，只有明确404自动删行。成功恢复后采用当前金额。网络/5xx结算失败原地提示，不再跳到同样依赖Shopify的备用页。三provider校验失败不建单，Stripe/PayPal仍USD-only。

## 验证与未覆盖部分

最新自动化、真实市场读取、故障/恢复与响应式证据见 [实现验收](shopify-authority-validation.md)。商品数量是随市场变化的取样，不写入业务断言。

- 本地部分Shopify远程缩略图优化请求曾超时；商品信息不因此替换成本地图片。
- 未进行真实付款、退款、发货或生产发布；当前工作不等同于生产支付验收；KOL完整交互采用独立本地模拟器验证，见 [验收](kol-platform-validation.md)。
- legacy Stripe/PayPal订单幂等写入仍没有单一事务，并发订单号仍需独立改造；KOL账本/结算使用新表及事务。
- Shopify结算返回地址只是Cart attribute，商家仍需配置回跳；KOL已新增独立验签/同步/核对链路，真实Shopify回跳与付款联调仍未完成。
- 首variant是当前唯一可选规格，尚无多规格选择器；金额仍按×100/÷100建模，前台未抽象所有币种小数位语义；新增KOL财务层单独采用币种精度与BigInt，不沿用×100假设。

## 尚未实现

内容CMS、内容覆盖表、全站行为事件表、`/api/events`、产品缓存webhook、PostgreSQL、多规格选择、Shopify SEO字段读取。KOL最小访问与`/api/kol/webhook`已实现，不等同全站BI；主站之外的后台端口需按模板配置，没有在生产开启。旧文档中的相关代码示例不得当作现有接口调用。

## 规范维护

2026-10-31 对主规范做文档纠错，校准现有行为，不改变应用。`2026-10-12-owner-simplifications` 已以 --skip-specs 归档为历史；原四项未完成记录仍保留，未声称补做。它的旧 delta 已由当前基线覆盖，不应再次合并覆盖主规范。历史资料见 [历史索引](history/README.md)。

随后用户确认故障设计，已完成Shopify唯一商品来源改造、TDD与生产模式验收，并将对应delta合入主规范归档。见 [实现验收](shopify-authority-validation.md)。

KOL平台实施与隔离验收见 [记录](kol-platform-validation.md)；运行配置和真实上线门槛见 [手册](kol-platform-operations.md)。

已补齐服务器Git一键Docker部署：同仓库独立主站/admin容器和镜像。`deploy/update-storefront.sh --kol`只更新主站并保留KOL，不动后台/worker/Nginx；`deploy/update-admin.sh`只更新后台与worker，不重启主站。首次启用可先主站后后台分次发布，共用原SQLite卷、锁、在线备份和1 CPU构建器。后台/整套发布验证worker与HTTPS；主站独立发布只验证app健康。共享工程仍整体编译，不是两个Next.js项目。见 [部署说明](deployment.md) 与 [独立主站验收](storefront-deployment-validation.md)；未执行生产发布。

构建流程已改为lint先行，随后Next.js编译和内置类型检查，避免两类检查并发；阶段进度/耗时与私密Docker构建日志已补齐。服务器日志位于 `.deploy-logs/`，不进入源码交付；仍需在tmux内启动长任务，不能凭本地测试认定服务器长等待根因已修复。见 [串行构建验收](serial-build-validation.md)。

2026-11-05：Shopify Admin 连接支持后台专用应用凭据自动获取、内存缓存和到期续取，保留手动令牌模式。无凭据仍可登录、读取本地记录和结账诊断；远程同步暂停并保留队列。Client ID/Secret 仅传入 admin，不进入主站、worker 或构建；可单独更新后台。自动续取不扩大 Shopify 权限，当前已安装应用为 `read_orders,read_discounts`，追加优惠码写权限仍未获批。应用卸载、无效凭据和授权失败继续明确报错。见 [运行手册](kol-platform-operations.md#admin-令牌自动续取与手动兼容) 与 [自动认证验收](admin-token-auto-renewal-validation.md)；此前手动模式验收保留为历史记录。

## 2026-11-09 国家选择与判定

Ship to 与会话国家偏好已实现、测试并独立发布主站；优先手动/已存会话、可信 IP、地理时区、区域语言，最后 US。GeoLite Country 自动更新已于 2026-11-10 独立启用：首次下载通过，每 72 小时检查新版，限 CPU 0.1 / RAM 96 MiB，不重建或重启主站、后台或订单 worker。实现与操作见 [market-localization.md](market-localization.md)，生产证据见[验收记录](market-localization-verification.md)。

2026-11-10：自动推荐改为固定 30 分钟有效，手动选择仍保留 90 天。旧版无时间戳自动 Cookie 失效，读取不续期；导航/返回前台同步过期上下文，购物袋国家冲突先阻断再刷新，保留商品及数量。全量 886 项测试、生产构建及浏览器验证通过，版本 `9618d5c` 已用 GitHub 预构建镜像独立发布主站，后台和各 worker 未被替换。见[有效期验收](market-preference-expiry-verification.md)。

2026-11-11：首页选品读取用户已配置的 Shopify FEATURED（handle featured），失败回退原每系列时间逻辑，限定商品在名额前排除并独立展示。按用户纠正恢复原宽度、4:5 大图卡和 All Products 圆形名册；FEATURED 与 REGIONAL EXCLUSIVE 标题等大。原三系列和支付链路不变，当前待截图确认、尚未发布。见[选品说明](homepage-merchandising.md)与[截图验收](homepage-merchandising-verification.md)。
