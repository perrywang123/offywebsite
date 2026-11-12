# Offy 广告投放与看数：详细版

2026-11-12。[简练版](meta-ads-sop.md)适合每日操作；本文保留设置、证据口径与维护步骤。

## 谁负责上报

| 环节                      | 上报责任                         | Offy 后台能确认什么                                   |
| ------------------------- | -------------------------------- | ----------------------------------------------------- |
| 页面/商品浏览             | Offy Pixel                       | 许可内本地观察、是否调用 Pixel；实际接收看 Meta       |
| 成功加购                  | Offy Pixel + CAPI，共用 event ID | CAPI 接收回执、来源、金额与目录 ID                    |
| 成功生成 Shopify 结账链接 | Offy 本地 CheckoutReady          | Shopify 购物车结果、国家、结账诊断编号；不发 Meta IC  |
| 托管结账/成交             | Shopify 官方 Meta 集成           | 只读 Shopify 订单事实；实际 IC/Purchase 与去重看 Meta |
| 广告归因、花费、ROAS      | Meta Ads Manager                 | 不由 Offy 或来源标签重算                              |

选择来源不是声明 Meta 一定给该广告记功。来源标签在新带标签落地时整体更新；真实 Meta 点击的 fbc 保留原始时间，观察上限 30 天，不因再次浏览延长。没有真实点击不构造点击 ID。许可拒绝或 GPC 时不记录营销观察；撤回会删除许可内营销及关联订单证据，不修改真实 Shopify 订单。

## 投放设置与广告 ID

广告账户 `1301113714798915`，数据集 `1120625754196383`。广告目标 Sales、转化位置 Website、优化事件 Purchase；Instagram 主页访问不能当成网站购买。网站 URL 使用真实 Offy 页面。下列内容放入 Meta 广告的 URL parameters 栏：

```text
utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.id}}&utm_content={{ad.id}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}
```

Offy 后台的折叠链接助手能复制这段参数并预览拼接结果。它不会创建、编辑或发布广告。Meta 在真实投放时替换动态参数；手动打开带花括号的 URL 不会得到真实广告 ID。不要编造 fbclid；utm_source、ad_id 也不能取代平台广告互动证据。预览后由投放负责人单独确认预算、地区、日期、素材、目标及最终发布；不提交账号内其他草稿。

## 看效果和排障

**Ads Manager**：选好日期、账户时区和归因窗口，增加 Amount spent、Website purchases、Cost per purchase、Website purchases conversion value、Website purchase ROAS，结合 Link clicks、Landing page views、CTR、CPC。CPA=花费/归因购买数；ROAS=归因购买金额/花费。例：同币种花费100、归因购买金额300，ROAS=3，不等于净利润。Shopify全店成交包含其他来源，和 Meta 不必逐笔相等。

**Events Manager**：看 Overview、Diagnostics、事件的 Browser/Server 去重与匹配质量。总览处理前事件数不是订单数。一次 AddToCart 的 event ID 应一致；单有同名事件或“Meeting best practices”不能证明两套不同编号的结账已去重。本次停止 Offy 自发 IC，只影响上线后的新代码；旧页面未重新加载时仍可能调用旧 Pixel，历史数据保留。

**Offy 广告诊断**：默认近7个上海日历日（最多保留30天），排除明确标记的内部测试及 Shopify 测试订单。可以按 campaign_id/ad_id、事件、状态筛选。四个数字是事件观察次数，旁边的浏览器标识按匿名标识去重，不是实际人数或严格转化漏斗。点击“查看浏览 → 结账 → 订单”，最多显示当前范围内同浏览器最近50条许可内事件，再进入对应结账诊断。没有记录可能是未许可、拦截、保留期/容量或未带参数，不等于没有流量。

Shopify 只读扫描由**管理后台的 KOL worker**执行，复用 Admin API 认证，主站不注入 Admin Client Secret。首次最多回看30天；每次最多25笔，分页间隔至少10秒，完成扫描后15分钟检查；失败5分钟后重试。只保存带本站签名结账编号且仍存在许可观察的订单，不猜历史关联。退款/取消更新覆盖原快照，不累加重复订单。金额按币种分组，订单总额含运税、退款单列，不能当广告收入或跨币种相加。明细最多50笔，汇总覆盖全部符合筛选的订单。

令牌缺失/权限不足时订单证据不可用，浏览、加购和结账继续。后台“CAPI 已接收”只说明 Meta 接受请求，不保证匹配广告。CAPI 永久错误停止，网络/429/5xx最多5次有限退避。未映射的商品仍可发金额事件，但不能宣称动态商品匹配完成。

## 受控验收

先在隔离环境运行 `OFFY_TEST_META=true pnpm exec tsx scripts/kol-integration.ts`，它使用独立端口和临时DB、模拟 Shopify/Pixel/CAPI。可用 `__test_consent=allow`/`deny` 测试许可，生产不使用这些参数。模拟订单不能证明真实付款、Meta归因或平台最终去重。

线上无付款检查使用内部测试标签：`utm_source=offy_validation&utm_medium=internal_test`，浏览→加购→打开托管结账，检查国家、商品、币种及后台证据后恢复购物袋，不输入支付资料。不要给线上全站临时启用 CAPI 测试码而污染真实事件。最后由投放负责人使用已发布的网站购买广告与获授权成交，核对具体订单、金额币种、Meta Purchase及广告归因；平台处理可能延迟，不反复刷新或付款。

## 二、服务器首次配置和分步发布

先确认代码已推送并拉取。所有命令在服务器 `/root/offywebsite` 执行，不需要输入服务器 IP。长任务建议在 tmux 中运行；本次不要求一起编译两个服务。

```bash
cd /root/offywebsite
git pull --ff-only
python3 deploy/configure-meta.py --env-file .env
```

脚本通过隐藏输入读取 **Meta CAPI access token**，不会显示在终端或写入 Git；它不是 Shopify Storefront/Admin 的令牌。令牌由管理员在 Meta 数据集的 Conversions API 设置中按当前页面权限生成/配置，相关新增授权应由资产管理员确认。不需要改 Shopify 线上支付密钥。暂时不提供令牌时按回车，只启用 Pixel，CAPI 关闭；已有令牌不会因回车被删除。脚本保留其他 .env 配置，并创建仅服务器可读的私密备份；不会自行部署或发布广告。

生产还需要原有 SHOPIFY_ANALYTICS_SHOP_ID、SHOPIFY_STORE_DOMAIN 等隐私运行时配置。缺少隐私许可接口时追踪保持关闭，不跳过许可。META_TRACKING_ENABLED、META_CAPI_ENABLED 默认 false。Meta 令牌注入一次后保留在私密 .env；后续拉 Git 不需要重复输入，除非过期/撤销/轮换。

生产服务器资源有限，优先使用构建机产出的预构建镜像，完成架构、Git revision 和校验和核对；具体见 [预构建发布](deployment.md#预构建镜像)。逐个发布，前一项完成并健康后再执行下一项：

```bash
bash deploy/update-storefront.sh --kol --prebuilt
bash deploy/update-admin.sh --prebuilt
python3 deploy/meta-worker.py check
python3 deploy/meta-worker.py start
python3 deploy/meta-worker.py status
```

前两条沿用现有独立 Git/Docker 更新脚本，`--prebuilt` 不在服务器编译；所需镜像必须事先加载并与拉取的源码 revision 一致，否则会拒绝发布。明确在服务器编译时才去掉该参数，构建资源检查仍适用。新 worker 启动命令只复用当前健康主站的已构建镜像，不编译、不重启 app/admin、不修改 Nginx。worker 0.25 CPU、96 MiB，每10秒处理一次小批量；内部认证自动读取正在运行的主站配置，不要求手工复制私密文件。当前 KOL 环境可以复用既有私密 KOL_WORKER_SECRET；没有 KOL 的新环境需单独配置至少32字符的 META_WORKER_SECRET。

每次以后更新主站后，再执行一次 `python3 deploy/meta-worker.py start`，确保 worker 使用本次 app 镜像。只更新后台时无需重启主站或 worker。模板已禁止公网直接调用 worker；真实 Nginx 不会由本次代码修改自动重载。即使尚未应用模板，worker 接口仍校验内部凭据。

## 三、目录 ID 配置

2026-11-09 只读核对：现有目录 `1430885911973275` 已有41个商品，并关联正确数据集。DOTTY DARLING 的实际单件 Content ID 为 `53547250549025`，父组 ID 为 `10557524934945`；Offy 页面为 `/products/black-pearl`。目录默认价格为 SGD55.90，Product Link 指向 `ujc6x6-41.myshopify.com/products/black-pearl`；Shopify 设置显示新加坡市场。目标为 Offy 网站及其他国家时，还需核对目录市场/币种和最终落地地址，不能只补商品 ID。是否存在其他国家的价格覆盖尚未核验，不将默认 SGD 价格直接判为所有国家配置错误。同步来源为 Shopify，应先设计可持续的链接/市场同步方案，避免 Meta 手改后被同步覆盖。

上述首次只读检查时，Offy 的映射为0项，目录 Events 显示0%匹配，Products → Actions 的1项提示为商品未匹配广告事件；这与 Events Manager 是否收到普通事件是两项检查。后续已逐项比对美国、英国、新加坡和香港的 Shopify 实时变体，现有 Meta 目录的41个 Content ID 均能唯一对应，已保存于 `config/meta-catalog-ids.json`。这份文件仅保存标识映射，不包含价格、库存或新的商品发布。

在生产 Git 更新后，用以下命令先检查、再仅写入映射。命令不会创建目录/商品、同步市场、发布广告或重启服务；执行前应核对目录仍为 `1430885911973275`，商品关系未变。写入时只更改 `META_CATALOG_IDS`，其他配置保留，原文件备份为600权限的本地文件。

```bash
python3 deploy/configure-meta-catalog.py --check
python3 deploy/configure-meta-catalog.py
```

运行中的应用需要重新读取环境变量才能生效。仅配置变化且应用代码没有变化时，维护人员应先记录/备份运行镜像和数据库，保留运行中的 KOL 开关及服务器自动准备的内部认证值，检查解析后的环境与现有容器相比只有 `META_CATALOG_IDS` 改变，再逐个重载同一镜像。不要直接执行缺少运行期认证准备的裸 Compose 命令，不要重打旧镜像 revision 冒充新代码，也不要执行整套构建。新应用代码发布仍遵循前述 revision 校验的独立发布流程。

**投放边界：**美国为优先市场。COLD KITTEN（`cold-kitten`）与 LEMON FIZZ（`lemon-fizz`）在美国 Storefront 可见，但不在当前 Meta 目录；它们未加入映射、未新发布到 Meta。未经所有者另行确认，不新增目录、添加商品或更改商品销售范围。Meta默认地区已改为美国、语言保持英语；现有商品源已保存并应用 `link` 域名替换规则，Meta提示等待下一次完整同步，实际商品字段仍需复查。基础新加坡价格和四国地区覆盖尚未完成验收，不能把映射上线等同于四国动态商品广告全部就绪。投放普通图片/视频广告时可直接使用对应的 `https://isoffy.com/products/...` 作为网站落地页，商品价格和可售范围仍由 Shopify 决定。详细边界及证据见 [现有目录上线验收](meta-catalog-activation-validation.md)。

事件金额来自实时 Shopify 当前市场数据。目录 ID 不根据商品名、SKU 或内部 code 猜测。需要在 Meta Commerce Manager 对照商品的实际 retailer/content ID，配置 `META_CATALOG_IDS` 为“Offy 当前商品 code → 该商品实际 Meta 目录 ID”的 JSON。示例结构：

```dotenv
# 仅说明格式，不能把下面示例 ID 当成真实映射发布。
META_CATALOG_IDS='{"商品实际code":"Meta目录实际retailer-id"}'
```

未配置映射时，浏览、加购事件仍可发送金额/币种/件数，但不编造 content_ids。后台会提示未提供目录 ID；动态商品广告及商品级匹配必须完成这项核对。修改后分别发布主站/后台以读取新运行配置。不要因后台“已按配置映射”就跳过 Meta 目录里的实际匹配核验。

## 运维和关闭

两个服务更新仍独立。上线本版前暂停旧 Meta worker，发布主站/后台后用 `python3 deploy/meta-worker.py start` 复用新主站镜像。后台更新会重启 KOL worker，使只读订单扫描生效。无论代码或配置变化，不在2核生产服务器并发编译。新增表是可加迁移，不修改订单和支付配置。

紧急关闭：关闭 META_TRACKING_ENABLED/META_CAPI_ENABLED，独立更新主站读取配置，再停止 Meta worker；无需修改支付密钥。营销记录最多30天/约2万条，运行中的接收/消费驱动清理；全部停用时需要保留清理任务或由管理员处理保留期。真实凭据始终只存服务器 .env，不进入 Git、文档或截图。

依据：[Shopify Meta 数据共享](https://help.shopify.com/en/manual/promoting-marketing/analyze-marketing/meta-data-sharing)、[Customer Privacy API](https://shopify.dev/docs/api/customer-privacy)、[Admin Order 字段](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order)。
