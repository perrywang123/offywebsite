# Collabs 接入发布验证记录

> 当前联系邮箱更新（2026-11-08）：KOL 对外合作统一使用 contact@whimcoreofficial.com。下文旧邮箱和截图仅保留当时的验收事实，不再作为现行联系方式。

2026-11-07。本记录随验证推进更新；未勾选事项不得解释为已完成。

## 变更范围

新增 Collabs 主计佣模式、官方 Analytics/Privacy 与安全折扣/个性化跳转适配；后台新增报告预览、显式字段映射、加密原文、不可变快照、分批只读订单核对及复核说明。关闭 Collabs 模式下的本地发码、当次 session 归因及应付佣金写入；历史账本保留。合作联系邮箱统一 yifangu3@gmail.com，独立于管理员登录。

发布支持预构建 Linux 镜像并分别更新后台和主站；保留配置检查、数据库及密钥备份、迁移与健康检查，不编译生产服务器。Git re-exec 的预构建标志保留及陈旧镜像拒绝已单独回归。

## 本地与隔离证据

- [x] OpenSpec delta 在实现前验证，追加数据库迁移0008在临时 SQLite 运行。
- [x] CSV、币种精度、缺失金额、来源去重、修订、历史核对及归因模式保护采用失败测试先行。
- [x] TypeScript、ESLint、首次 standalone 构建通过；首次本机构建55.4秒。最终 Linux 生产镜像结果见下文。
- [x] HTTP 隔离链路19项检查：登录与认证、Collabs模式、旧财务/优惠码写入拦截、官方参数及短链、创建模拟 cart、模拟订单、报告预览/幂等导入、同币种订单核对、退款提示、追加复核、无新增本地应付/付款。
- [x] 浏览器真实上传 CSV、选择字段、来源确认、预览与保存；桌面和390px手机检查。手机document宽390、scrollWidth390，无全页横向溢出。金额缺失明确显示“未提供”，真实导入与核对状态分开。
- [x] 本地模拟进程已停止，临时数据库及过程文件目录已清理。未向真实 Shopify 创建测试优惠码、测试订单、退款或付款。
- [x] 最终业务及部署单测：107个测试文件、760项通过。新增追踪超时隔离、公网origin和代理后折扣HTTPS跳转回归。多进程CLI测试曾因默认5秒总时限偶发超时，相关部署测试组统一采用15秒预算；业务断言及禁止生产编译等保护不变。
- [x] 本地生产浏览器加载官方analytics/privacy脚本，无浏览器错误；追踪代理真实读取Shopify店铺成功。网络超时返回独立503，不抛未处理异常。临时浏览器页与本地生产进程已关闭。
- [x] 最终Linux amd64镜像在GitHub构建并验证原生SQLite及迁移；生产app/admin/worker的OCI revision均为5dcb670590c29fc880e7cb0ccac76396fc504aa5。

GitHub 原 CI 使用 Node20，真实日志显示 jsdom30/undici8 在初始化时出现 `webidl.util.markAsUncloneable is not a function`，导致组件测试 worker 未启动。这不是支付链路报错；现将 CI 与 Docker 对齐为 Node22，并串行运行含进程调用的测试，保留全部断言。最终提交5dcb670的[质量CI](https://github.com/perrywang123/offywebsite/actions/runs/42357461756)和[Linux镜像工作流](https://github.com/perrywang123/offywebsite/actions/runs/42357478383)均已成功。

测试使用项目隔离模拟器，商品、订单、退款、报告均为明确的测试数据，模拟报告不等同于实际 Collabs CSV格式。导入依照实际字段映射，暂不假设官方拥有订单级数据或完整付款 API。

## 官方店铺设置

- [x] 用户于实际安装页确认权限后安装官方 Collabs；用户于首次启用页确认条款后完成启用。
- [x] 实际读取 Payments设置：佣金冻结30天。链接原生归因窗口90天，与冻结期不同，保持原生设置。
- [x] 初始 Overview 显示 Open Access 未启用。没有发送 KOL邀请，没有建立实际佣金付款。
- [x] 原主站 Storefront token 可只读查询 Shopify URL redirects，无需更换主站凭据。
- [x] 实际 Affiliates域名下拉仅有本店 myshopify.com；未修改主站 DNS、主域名或结账设置。后台支持安全解析该店官方链接后生成保留 dt_id 的 Offy 链接。
- [x] 用户手动清理Shopify站点数据、重新登录并打开Settings → Email后，已只读核对：Collabs联系人为yifangu3@gmail.com，旁边明确显示绿色Verified；通知接收邮箱同为yifangu3@gmail.com。保留[邮箱验证截图](design/kol-admin/collabs-release-2026-11-07/collabs-email-verified.png)。没有刷新页面、修改字段或重发验证邮件；旧邮箱的验证邮件不作为验收依据。
- [x] 用户手动打开原生Payments页后，只读核对当前为automatic/holding视图；页面明确显示30-day holding period，期满后加入next Shopify bill。Holding period、In dispute、Waiting for creator、Scheduled、Paid、Canceled均为$0.00，页面显示No new payments。保留[自动付款页面截图](design/kol-admin/collabs-release-2026-11-07/collabs-payments-automatic.png)。此证据确认当前界面提供的自动付款流程与30天冻结期，不代表已发生扣费或创作者到账；没有修改字段、提交付款或刷新页面。
- [ ] 按首位真实KOL合作条件建立邀请计划，并核对真实官方报告可导出字段、归因与到账。无真实创作者合作时不将空表或样例标作真实转化验收。

Collabs内嵌页此前持续空白，由用户手动清理Shopify站点数据并重新登录后恢复；外层导航曾与内嵌内容不同步，最终以用户手动打开的应用内部Email页面为准。遵照用户要求，不持续刷新或反复导航。本轮没有为此旋转线上凭据、变更店铺权限或改动订单。

## 生产发布与回归

发布前基线：isoffy.com返回200；app/admin健康，worker运行；旧offy-website.service为disabled；Nginx配置hash为c621ec067afbdb95d9518901fab5c09a2acf283be5623869c5334dd270fc267e；可用内存约1.8GiB。Shop ID通过已有Admin权限只读核验，未扩权。

- [x] 源提交先同步Git，服务器fast-forward到5dcb670；镜像Linux amd64、revision及GitHub工件/镜像双重SHA256全部匹配。
- [x] 两次发布前均一致备份SQLite及诊断/报告加密密钥，备份完整性检查通过。旧镜像保留pre-collabs-20261107标签，原私密配置另存服务器备份目录。
- [x] 先后台/worker，再独立站分别通过`--prebuilt`发布，无生产编译。后台阶段逐项比对原主站容器ID、image和启动时间均未变。主站阶段不替换后台/worker，Nginx文件hash与端口保持原样。
- [x] 线上16项访问/认证检查：公共主站200、公共管理入口/API404、worker GET405且未授权POST404、私有登录、Cookie安全属性、唯一管理员、Collabs模式、本地财务写入拦截、CSRF及退出登录。另验证折扣303公网HTTPS跳转、Secure/HttpOnly会话Cookie、拒绝不安全落地和官方unstable追踪代理只读查询。
- [x] 实际商品WILD SWEETIE在主站及购物袋均为USD45.90；另外通过真实生产API创建一份无邮箱cart并在浏览器打开Shopify结账，默认美国、单件USD45.90、没有Sold out。未填写个人/支付信息，没有付款或订单。诊断记录保存country、商品、请求、Shopify响应和redirect_ready完整阶段。
- [x] 测试完清空该唯一Shopify cart；以返回的专属attemptId及原始checkoutUrl双重核对后，仅删除其诊断与级联事件。购物袋恢复为空，测试会话退出。原103条诊断、133条Shopify订单映射及1条既有合作记录保留；本地账本/月结仍为0，Collabs所有表无测试行，SQLite integrity_check为ok。
- [x] app/admin均healthy，worker运行且fresh heartbeat通过；旧宿主机build服务仍disabled。现场采样app CPU0%、admin1.06%、worker0%，没有生产构建。

主站五张新闻图均读取内置assets/news素材并已完整加载；线上侧栏切换到结账诊断再返回，不出现重新连接占位。合作联系邮箱显示yifangu3@gmail.com，管理员登录身份保持独立。

部署后的[后台画面](design/kol-admin/collabs-release-2026-11-07/production-admin.png)与[未付款的Shopify结账画面](design/kol-admin/collabs-release-2026-11-07/production-checkout-unpaid.png)为本次证据。没有用模拟报告冒充真实Collabs转化或付款。联系人Verified、自动付款页面与30天冻结期均已实际读取；当前剩余外部验收是首次真实合作后的报告字段、归因和到账，不能由普通cart成功或空付款页面推断这些也已验证。
