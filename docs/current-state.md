# 当前实现与验证基线

日期：2026-10-31。依据：当前源码、现有测试与本地运行抽查，不等同于生产基础设施或真实支付验收。

## 已实现

- 英文单语、默认语言无前缀。中文保留代码，`/zh/*` 308 去前缀；`/en/*` 307 去前缀。
- 品牌首页：五屏 Hero → NEWS → New Looks/区域限定/商品名册 → 包挂预告 → 联名 → 订阅 → 未来 IP。
- 三大系列名称来自 Shopify；slug/Collection handle/系列图/tagline 的站点映射仍本地配置。
- 实时商品清单、详情、市场金额/币种、SKU、多图、售罄列表状态；周边仅在 All Looks，排在公仔之后。
- localStorage 购物袋、公开商品 API 验证、抽屉与独立页、手机 sticky 购买条。
- 购物袋直接跳 Shopify Checkout；备用 `/checkout` 仍收集表单再提交 Shopify。
- 品牌故事、六款包挂图预览、10 条 FAQ、四条 Shopify 政策、静态联系信息。
- SQLite 订阅/旧支付会话/订单；Stripe 验签 webhook，PayPal 同步 capture。
- 自 canonical、首页语义 H1、Product/Offer、BreadcrumbList、Organization/WebSite、FAQPage；sitemap/robots。
- Docker/Compose、nginx、服务启动迁移、GeoIP 国家判定与配置诊断。
- 可选KOL平台：四页后台、独立入口/管理员、合作版本、自定义佣金、当次链路、双方式码、Shopify财务核对、分币种账本/月结与审计；默认关闭。见 [运行手册](kol-platform-operations.md)。

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

已补齐服务器Git一键Docker部署：同仓库独立admin容器/镜像，`deploy/update-admin.sh`只更新后台与worker，不重启主站，共用原SQLite卷；整套与独立发布复用锁、在线备份、只读就绪与显式Nginx管理。见 [部署说明](deployment.md)；本轮仅本地隔离验证，未执行真实容器或生产发布。
