# Shopify 唯一商品来源：实现验收

日期：2026-10-31。用户已确认原型并授权实现；以下是本地源码、生产构建与浏览器证据，不代表生产发布或实际支付验收。

## 实现范围

- 删除本地商品快照、旧enrich、check:catalog；品牌/预告内容移至lib/catalog/brand.ts，系列配置不再提供本地商业名称。
- Storefront统一校验HTTP、GraphQL、字段、金额、首variant、分页与归属完整性；合法零价保留。商业fetch no-store、5s超时，React cache只在单次渲染去重。
- 商品API区分200空集/404确认缺失/503不可用；三provider数据校验失败503且不建单。
- 首页局部失败合并一处提示，独立成功模块保留；NEWS只显示已验证可售商品。2026-11-02 按用户要求恢复五张本地宣传图，原“使用对应Shopify图片”的展示约定已被替代；不恢复本地商业数据回退。列表/系列/详情/购物袋使用已批准的恢复展示。
- 购物袋仅保存code/quantity；初始、加购/打开、恢复可见和结算准备重新验证。失败不清袋、不显示旧字段/小计/结算；确认404才删。请求世代号防止旧响应恢复已清空行。
- 结算失败留在原地；同步提交闸门、超时、有效HTTPS跳转检查和可重试提示覆盖当前与保留入口。
- 页面force-dynamic；故障动态200+noindex，无Product/Offer或假数量；sitemap失败503+no-store，不发布部分清单。

## 自动化与构建

完整Vitest：68文件、478测试通过；typecheck、lint（无警告）、production build、OpenSpec strict（5份主规范）、变更文件Prettier及git diff --check均通过；107个当前文档本地链接无失效。构建表受generateStaticParams影响仍会显示部分●；实际prerender-manifest仅含favicon、robots与not-found，没有商业页面快照。动态行为以生产HTTP的no-store和故障/恢复切换为证。

覆盖超时、鉴权/HTTP、GraphQL、字段缺失、真实空集、404、合法零价、不同市场币种、首variant价格/库存、分页中断、残缺区域探测、三provider停止建单、购物袋保留/重试/异步竞态、首页局部失败、API缓存与SEO。

## 实际故障注入与响应

不修改真实.env；仅在独立的本地生产进程中临时以空Shopify环境变量启动，随后停止并恢复正常凭据。另在正常环境实际遭遇过Storefront超时：详情呈现故障态，没有退本地或伪404。

[HTTP记录](design/shopify-unavailable/runtime/failure-http.json)：商品列表/详情API为503、Cache-Control:no-store；三provider均503 catalog_unavailable。商品HTML为200，private/no-cache/no-store，robots=noindex；sitemap为503/no-store，没有部分XML名册。

## 浏览器与可访问性

使用真实本地生产页面，在375、768、1440、1920px检查列表、详情、系列总览/详情、购物袋、保留checkout和首页：scrollWidth等于viewport，无横向溢出；页面一个H1，故障面板无价格或Product Offer。详情/列表/系列故障页noindex，购物袋/checkout始终noindex。重试按钮48px。

[故障布局记录](design/shopify-unavailable/runtime/failure-geometry.json)包含详情/系列/购物袋的20次断点检查；列表与首页同样四档通过。首页保留品牌Hero、合作、订阅、预告等，只显示一个商业故障提示，无商品详情链接。

手机抽屉375px下宽330px（88%），桌面上限448px；关闭按钮44px。Tab从末个联系入口回到关闭按钮，Escape关闭后焦点恢复Open bag，body滚动恢复。故障期间Bag(1)仍保留已选数量；无小计或Checkout。

实际截图保存在本目录下的design/shopify-unavailable/runtime/。仅模拟技术失败，不执行真实付款。

## 正常环境与恢复

同一个浏览器中的Bag(1)在故障期间保留。恢复正常凭据后点击Try again，无需重新加购即恢复LITTLE HEIRESS、$45.90、小计和可用Checkout；未点击Checkout创建真实Cart。

[正常HTTP记录](design/shopify-unavailable/runtime/healthy-http.json)：US42条/USD、GB41条/GBP、HK41条/HKD；同一royal-grey分别为4590/3390/36900（站内×100整数模型）。这些仅是本次取样，不是业务固定数量或价格。三个响应均no-store。

专用不存在handle的API与HTML均返回真实404；恢复后的sitemap为200/no-store，包含42个产品路径。正常生产首页加载无故障面板，54个商品详情链接，未带故障noindex。同一构建临时缺配置→恢复凭据后，原首页点击Try again也恢复上述内容；没有重新构建或更改真实.env。

## 边界与取舍

新鲜读取增加Storefront请求量和首屏等待，尤其区域探测需要整个配置范围成功；不以旧价换表面可用性。区域徽章仅基于配置范围推断，不能证明全球独占；多国可见时不打单国ONLY徽章。

首variant仍是唯一可选规格，详情图最多10张，归属超过250个Collection会明确不可用；没有多规格选择器、订单webhook回传、生产发布或真实付款。本地仍遇到个别Shopify图片优化超时，不用别的商品图替代。

缓存说明：不将构建表的SSG符号单独作为静态缓存结论，已核对manifest与实际响应。

OpenSpec变更已归档，15/15任务完成，主规范合入3个新增与8个修改要求。
