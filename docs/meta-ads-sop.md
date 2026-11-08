# Offy Meta 投放、数据查看与排障 SOP

适用对象：Offy 品牌管理员及广告运营。更新于 2026-11-09。生产已启用独立站 Pixel、购买前关键事件 CAPI 及独立 worker，并验证真实加购 / 结账准备的接收回执；没有发布广告或下真实订单。证据和未完成的真实购买归因、目录验收见 [生产记录](meta-production-validation.md)。

## 一、先明确三个看数入口

| 入口                                                                                                                                       | 主要用途                                                                                                              | 不能据此认定                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [Meta Events Manager](https://eventsmanager.facebook.com/events_manager2/list/pixel/1120625754196383/overview?business_id=837128189448656) | 检查 PageView、ViewContent、AddToCart、InitiateCheckout、Purchase 是否收到，来源 Browser/Server、去重、匹配质量及诊断 | 所有事件都是广告带来的               |
| [Meta Ads Manager](https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=1301113714798915&business_id=837128189448656)           | 按系列/广告组/广告查看花费、购买次数、购买金额、CPA、ROAS                                                             | 等同 Shopify 全店订单或净利润        |
| Offy 管理后台 → 广告诊断 `/admin/meta`                                                                                                     | 检查本地观察、来源标签、CAPI 回执/重试和结账诊断编号                                                                  | Meta 广告归因已成功，或 KOL 应付佣金 |

使用 Whimcore 业务资产，广告账户 1301113714798915，数据集 is.offy's pixel / 1120625754196383。不要另建重复 Pixel。这里的 Meta 归因与 Collabs 的 KOL 计佣分别由各自平台决定。

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

事件金额来自实时 Shopify 当前市场数据。目录 ID 不根据商品名、SKU 或内部 code 猜测。需要在 Meta Commerce Manager 对照商品的实际 retailer/content ID，配置 `META_CATALOG_IDS` 为“Offy 当前商品 code → 该商品实际 Meta 目录 ID”的 JSON。示例结构：

```dotenv
# 仅说明格式，不能把下面示例 ID 当成真实映射发布。
META_CATALOG_IDS='{"商品实际code":"Meta目录实际retailer-id"}'
```

未配置映射时，浏览、加购事件仍可发送金额/币种/件数，但不编造 content_ids。后台会提示未提供目录 ID；动态商品广告及商品级匹配必须完成这项核对。修改后分别发布主站/后台以读取新运行配置。不要因后台“已按配置映射”就跳过 Meta 目录里的实际匹配核验。

## 四、投放前验收清单

- [ ] 主站可正常打开，商品价格、币种与 Shopify 结账一致；原 Collabs 链接与优惠不受影响。
- [ ] 数据集与广告账户 ID 正确；Shopify 官方“增强”配置仍保留。
- [ ] 官网隐私说明已覆盖 Meta 营销用途；接受/拒绝/撤回许可均实测。
- [ ] Events Manager → Test events 用其网站测试入口打开 Offy，依次浏览、看商品、加购、结账；能看到对应 Browser 事件。
- [ ] 如使用 CAPI 测试码，将测试页给出的代码配置为 META_CAPI_TEST_EVENT_CODE，发布读取配置并启动 worker，验证 AddToCart 和 InitiateCheckout 的 Server 事件及去重。测试码只作用于 CAPI，不自动把全部浏览器事件变成测试事件。
- [ ] 一次加购的 Browser eventID 与 Server event_id 相同；同一次事件重试没有换编号；页面刷新不是加购，恢复旧购物袋不重复加购。
- [ ] 商品目录 ID、数量和金额/币种正确；未混加 USD/HKD 等金额。
- [ ] 由管理员授权的测试店/真实订单验证 Shopify 官方 Purchase 实际进入 Meta，检查金额、币种和重复情况。Offy 不另发 Purchase，不能拿打开回跳页证明付款。
- [ ] 经授权的小额真实广告互动订单验证广告归因；普通自然访问或手工 UTM 测试只能证明传输，不能证明真实广告归因。
- [ ] 验证完清空 META_CAPI_TEST_EVENT_CODE，分别让服务读取正式配置，再检查生产事件。关闭本地模拟参数；生产拒绝 META_TEST_ORIGIN。
- [ ] 明确预算上限、日期、收货市场、素材、落地页及负责人，再人工确认发布本次广告；不批量提交无关草稿。

只有全部对应项通过，才称为“完整投放归因验收通过”。本次生产传输验证已完成，不代表清单里的真实购买归因和目录匹配全部通过。官方界面可能延迟处理；不要连续刷新，也不要为验证重复付款。线上有真实访问时，不应为一个连接测试给全站设置测试码；可发送单独、明确标记的 TestEvent，不改变正式客户事件模式。

## 五、创建面向独立站购买的广告

进入 Ads Manager，确认广告账户 1301113714798915。新建时以网站购买为目标：选择 Sales，按当前界面选择 Website 转化位置、正确数据集和 Purchase 优化事件；如账户资格/事件尚未满足，先处理原因，不将 Instagram 主页访问当成网站购买。预算和发布由负责投放的管理员确认。[Meta 目标与转化设置说明](https://www.facebookblueprint.com/student/path/253165-selecting-objectives-course)

落地 URL 使用 `https://isoffy.com/products` 或实际商品页。URL 参数可通过 Meta 页面提供的构建器选择 campaign/ad set/ad ID；记录到我们支持的 campaign_id、adset_id、ad_id 及 utm_source/medium/campaign/content/term。一个便于辨认的静态命名示例是 `utm_source=meta&utm_medium=paid_social&utm_campaign=offy_launch`，它不是有效广告点击证明。不要手工填造 fbclid，也不要把邮箱、电话或收货信息放入 URL。

广告预览中实际打开一次，确认落在 Offy 页面且跳转后来源参数未被删。动态商品广告另核对目录商品落地链接，避免回到错误店铺页面。此 SOP 不要求将 isoffy.com 改成 Shopify Online Store 主域名。

## 六、日常看数与解释

Events Manager 选正确数据集、包含今天的日期。Overview 看事件数量和来源，Diagnostics 查问题，具体事件查看平台提供的匹配质量/去重信息。CAPI 的接收回执表示请求已被接受，不保证每次都成功匹配广告，也不保证测试 UI 立即刷新。[官方 Pixel 与 CAPI 配合说明](https://www.facebookblueprint.com/student/activity/291700-connect-your-website-data-for-better-ad-performance)

Ads Manager 先统一日期、账户时区、币种及归因窗口，再选择列：Amount spent、Website purchases、Cost per purchase、Website purchases conversion value、Website purchase ROAS，同时结合 Link clicks、Landing page views、CTR、CPC 分析漏斗。原有 Instagram 推广“Results”可能是主页访问，应读清单位。

CPA = 广告花费 ÷ 广告归因购买次数；ROAS = 广告归因购买金额 ÷ 广告花费。例如同币种花费100、购买金额300，ROAS为3；不等于净利润。Shopify全店收入包含自然流量、其他渠道与不同时间口径，不能要求与Meta归因收入逐项相等。

Offy 后台按事件及状态筛选，展开来源与发送明细：浏览器“已调用 Pixel”仍需 Meta 侧确认；CAPI“已接收”仍需平台归因确认；“结账诊断编号”可在结账诊断列表搜索同一编号，查看服务器创建购物车及 Shopify 响应。这里不展示原始 fbc/fbp、访问标识或令牌，不重算 KOL 佣金。

生产已观察到：Offy 的结账准备和 Shopify 官方托管结账都可能发送 InitiateCheckout，使用不同事件编号。当前不保证这两个集成之间去重；不要将事件总数视为独立结账用户或订单数。正式投放以经过单独核验的官方 Purchase 为购买优化依据；如需精确的结账漏斗，另行统一事件责任，不直接关闭官方购买上报。

## 七、排障与回退

无任何事件：检查代码是否已部署、两个开关、Pixel ID、隐私 API/营销及分享许可、GPC和拦截器。加购有浏览器但无 Server：检查 CAPI 令牌、版本、worker 状态和后台错误。pending 持续不变：看 worker 是否运行及内部认证；不要重跑整套构建。

```bash
python3 deploy/meta-worker.py status
docker compose --env-file .env -f docker-compose.prod.yml --profile meta logs --tail=60 meta-worker
```

http_400/401/403 或 meta_rejected：由管理员核对令牌、数据集权限和版本/字段；后台只保留错误类别，不返回上游原文和密钥。429/5xx/网络失败最多5次，指数退避；过期/永久错误停止，避免无限请求。开启 CAPI 之前的 unconfigured 观察不会自动回填为服务器事件。浏览器广告阻拦/许可拒绝可能使传输不完整，不能绕过用户选择。

紧急关闭：私密 .env 将 META_TRACKING_ENABLED=false、META_CAPI_ENABLED=false，独立更新主站让配置生效，再 `python3 deploy/meta-worker.py stop`。无需改支付密钥或停独立站。后台更新仅用于反映新状态。记录最多保留30天/最近约2万条；达到容量时提前清理已结束的观察，保留待发送队列；全是未结束任务时拒绝新观察且不影响购买。清理由运行中的接收器/worker驱动，停用后需保留相应清理运行或由管理员清理。

本地复现：`OFFY_TEST_META=true pnpm exec tsx scripts/kol-integration.ts`；独立端口4511/4512/4513及临时数据库，许可测试通过 URL `__test_consent=allow` / `deny`。此模拟只验证代码交互与发送协议，不证明真实 Shopify 或 Meta 广告效果。
