# Meta 观察可靠性修复验收

2026-11-14。已完成确定性问题的修复、测试和生产部署。功能版本 `f783b2c` 于北京时间 03:34 完成预构建镜像发布，主站、后台及两个 worker 已更新；没有修改 Shopify、Meta 广告/目录、订单或业务配置。

## 修复结果

- 同路径首屏的 ViewContent 比 PageView 提前不超过2秒时，可进入原漏斗；超过2秒、跨路径或缺失前序仍被排除。后续结账编号、订单时间及付款状态约束保留。该修复影响保留记录的查询结果，不伪造事件或改写订单。
- URL 没有任何有效来源标签时不再清空最后有效标签；出现新的有效标签则整体替换，真实 fbc 独立保留捕获时间。受控 Meta paid_social 纯数字 UTM 可补缺失的广告/系列/广告组 ID；历史只读查询与新事件一致。保存的旧标签不能证明后续无标签点击的广告身份。
- 浏览器观察网络失败、4秒超时、429/5xx时最多尝试3次，同 ID/时间/请求体，Pixel 不重复发送；同页内存队列50条、并发2、最长60秒。撤回、禁用、过期或身份不匹配时不再重试，不等待队列才结账，不补发未许可事件。
- 内测标签不初始化/发送 Pixel，不生成 CAPI 匹配载荷；服务端也抑制旧待发内测任务。保留历史 sent 事实，无法撤回已经发到 Meta 的历史测试。
- 后台提示、简版/详细 SOP 和既有本地协议验收脚本同步现行规则：Shopify 官方拥有 InitiateCheckout/Purchase，Offy 仅记 CheckoutReady。

## 验证记录

先写失败测试：5个定向文件在最小实现前为红灯，覆盖顺序、来源、内测及缺失重试模块；实现后首轮39项通过，追加超时、队列上限和首次内测初始化边界后42项通过。再补充实际 React 初始化、重试不重放 Pixel 的回归用例。

最终全量回归 `pnpm test --maxWorkers=1 --testTimeout=30000`：**161个文件、982项全部通过**，包括部署保护、购物/结账、营销观察及订单证据测试。单 worker 避免本机并发子进程超时，不修改仓库测试超时设置；原有用例显式超时约束保留。

生产构建 `pnpm build`（关闭外部商业/营销配置，使用正式生产模式）通过，包含 lint 和 Next 类型检查；独立 `pnpm typecheck` 通过。首轮隔离构建误用了禁止在生产启用的 integration 标志，随后移除该标志；未放宽生产保护。

本轮修改文件的 Prettier 检查通过。仓库级 `pnpm format:check` 仍报告65处原有格式问题（历史规范和其他未改文件），本轮未批量格式化或改写历史材料。首次全量测试发现1处旧文案断言，已同步更新；并发执行中既有部署脚本测试出现超时，随后停止构建/模拟服务、单 worker 重跑，不改业务逻辑或部署测试代码。

浏览器实际操作与模拟接收器/数据库交叉核对通过：

- 商品页初始受控 UTM 正确解析到广告 ID `123456789`；无模板 ID 被当作真实 Meta 点击。
- 加购前注入一次 loopback 503，浏览器自动重试后只有1条数据库记录；Pixel 仅调用1次，与模拟 CAPI 共用事件 ID，单件100 USD。该 ID 的观察、CAPI接收及同浏览器后续结账可在后台证据抽屉查看。
- 购物袋2件跳到模拟托管结账为200 USD；返回后 Buy Now 为当前商品1件100 USD，不改袋内数量。两次本地 CheckoutReady 均关联已生成链接的结账编号；Offy 没有发送 InitiateCheckout 或 Purchase。
- 内测首次加载、加购及后续无标签导航留下5条本地观察，Pixel/CAPI 外发均为0；加购状态 suppressed 且无加密匹配载荷。默认后台排除这些记录。
- 后台按广告 ID 筛选、同路径初始化倒序进入漏斗、点击商品浏览阶段下钻、打开加购证据抽屉均可用。正常观察队列的访问→商品浏览→结账准备均为1个浏览器；未付款，所以关联付款为0。
- 测试结束后购物袋恢复原1件；浏览器临时页关闭，模拟器/worker停止，测试数据库只在独立临时目录，未写入仓库。

协议证据：[JSON](design/meta-reliability/protocol-proof.json)；页面截图：[后台漏斗](design/meta-reliability/admin-funnel.png)、[事件链路](design/meta-reliability/trace-proof.png)、[立即购买模拟结账](design/meta-reliability/buy-now-mock.png)。复现入口为 `OFFY_TEST_META=true OFFY_TEST_COLLABS=true pnpm kol:integration`；仅访问该脚本明确输出的 loopback 地址，先在本地模拟器 `/test/meta-ingestion` 设 `failures:1`，再操作页面，最后执行 `node scripts/meta-integration-checks.mjs`。

本地 Shopify、Pixel、CAPI 均为显式 loopback 模拟器；数据库位于独立临时目录，不读写生产数据库、不向真实平台发送模拟事件、不支付订单。模拟器仅验证协议和现有购买跳转，不代表真实广告购买归因已经通过。

## 生产发布与发布后验证

源码版本为 `f783b2c9ef68b4c76336238d7cb33cf5b5e6ae8b`。[GitHub CI](https://github.com/perrywang123/offywebsite/actions/runs/43489582544) 和[预构建镜像工作流](https://github.com/perrywang123/offywebsite/actions/runs/43491761383) 均成功；镜像为原生 Linux amd64，包含 SQLite 原生模块及迁移冒烟验证。生产服务器只下载、校验和加载镜像，没有执行源码编译。

下载归档 SHA-256 为 `45faa725ae295e6b3af68456c39b2af30202be9385109e7fa602324333ebc4d5`；四个业务容器运行镜像均为 `sha256:cd2b24f1046b59af12af40db114578eff383a14aa5e66b6358dee3fe265db845`，revision 标签与上述源码一致。服务器通过 `git pull --ff-only` 获取源码；生产凭据没有参与 Git 或镜像构建。

发布沿用现有独立脚本：暂停旧 Meta worker，运行 `bash deploy/update-storefront.sh --kol --prebuilt`，等待主站实际健康后启动同版本 Meta worker，再运行 `bash deploy/update-admin.sh --prebuilt` 更新后台及 KOL worker。各步骤退出码为 0。两次替换前的 SQLite 一致性备份校验通过，保留旧镜像回滚标签；验证后仅删除本次下载的临时镜像归档，没有清理其他镜像或业务数据。

发布后的验证结果：

- 主站、商品详情和管理端入口返回 200；主站端口的 `/admin` 为 404，管理 API 未登录为 401，入口隔离保持。主站和后台 Docker 健康检查正常；两个 worker 持续运行、无重启，KOL worker 有成功心跳。订单读取的自然分页已完成，最近同步没有错误。
- `.env`、内部认证文件、管理员密码哈希、Shopify/Meta 等已有运行配置、共用数据卷、Nginx 配置及 GeoIP 容器保持原样；数据库 `quick_check` 为 `ok`。
- 生产浏览器实际浏览、商品价格和加购正常；购物袋 3 件、137.70 USD 跳入真实 Shopify 托管结账，商品与金额一致，没有售罄错误。返回后 Buy Now 仅包含当前商品 1 件、45.90 USD，原购物袋保留。
- 两次结账均停在填写信息之前，没有提交买家信息、付款或订单。测试完成后购物袋恢复为原 2 件、91.80 USD，主站临时测试页关闭。
- 本次浏览带明确内测标签，Offy Pixel 调用和 CAPI 匹配载荷均为 0；加购记录状态为 `suppressed`，两条 `CheckoutReady` 仅本地观察。内部记录保留标签并被后台默认排除。这不代表 Shopify 托管结账自身的官方事件被关闭。
- 后台按真实广告 ID 筛选、来源说明及漏斗显示正常，完成后恢复默认筛选。订单分页未结束时显示未知，同步结束后恢复已同步状态，没有把未知付款显示成 0。

脱敏发布证据见 [JSON](design/meta-reliability/production-deployment.json)。真实业务页面截图保存在本机验收目录，不提交 Git。上述验证没有发布广告、调整目录/商品或进行真实付款；Meta 最终广告购买归因和平台去重仍需用实际投放结果单独核对。

## 仍需单独确认的事项

Meta 最终购买归因、平台浏览器/服务端去重结果、未许可前流量丢失、动态商品目录范围及国家价格不在本轮修复范围。保留期/容量和浏览器关闭导致的尽力上报缺口仍存在。来源标签、CAPI 接收回执和 Shopify 付款事实均不能替代 Meta 最终归因。

后续继续使用构建机预构建镜像、服务器分别更新主站与后台的流程。本文发布记录对应功能版本 `f783b2c`；其后的纯文档提交不要求再次替换镜像。
