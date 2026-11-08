# Collabs 自动归属与短链观察

本功能将五种证据分开显示：Offy推广落地PV/浏览器UV、Offy短链打开请求、Collabs经Flow推送的官方归属关系与累计快照、Shopify Admin只读订单事实、人工导入的官方财务报告。它不调用Collabs私有API，不重新计佣、不付款。

## 已核实的官方契约

2026-11-08 在本店 Advanced 套餐的 Shopify Flow 编辑器中，实际选择 **Shopify Collabs → Order Attributed**，确认变量：

| 变量                                          | 实际类型及含义                                        |
| --------------------------------------------- | ----------------------------------------------------- |
| `communityMemberId`                           | Float；官方描述为创作者唯一编号，应用仅接受安全正整数 |
| `firstName` / `lastName` / `primaryUsername`  | String；官方创作者识别信息，不取买家邮箱或地址        |
| `salesNumber`                                 | Float；累计归属订单数                                 |
| `linkVisitsCumulative`                        | Float；累计链接访问                                   |
| `salesCumulativeCents`                        | Float；累计归属销售 cents 值                          |
| `commissionCumulativeCents`                   | Float；累计佣金字段                                   |
| `order.id` / `order.name` / `order.createdAt` | Order 对象中的 ID、订单号、订单创建时间               |

这些累计金额字段没有同时提供币种或本笔佣金，不能拿店铺 HKD、买家 USD 或结算币种补填。因此后台仅在展开详情后显示原始字段值，不格式化为美元，也不拿累计差额生成本笔佣金。累计值只反映该归属事件发送时的快照；没有新归属订单时，访问次数不会由这条 Flow 单独刷新。

`communityMemberId` 与推广别名、`dt_id`、CSV 创作者标识独立。首次收到未知编号会保留未关联记录；管理员核对 Collabs 后，将它显式关联到一条 Offy 合作记录，关联后不得转给另一人。系统不按姓名或邮箱猜测归属。

多个 Offy 别名若共用同一个官方链接，访问量可以逐短链观察，但该官方编号的订单只能证明归属于同一创作者，不能区分具体点击了哪一条短链。关联到合作索引不等于证明订单来自该索引唯一的别名。

原触发器没有提供归属事件发生时间或可验证事件 ID。本模板的 `sentAt` 是 Flow 执行时生成的发送时间，不是归属发生时间；另存服务器接收时间和订单创建时间。以店铺、官方编号、订单 GID 去重，一条归属关系只保留一次，不将重试累加。乱序事件不覆盖较新的累计快照。

## 配置和发布

1. 先通过 CI 构建 Linux 镜像，用 `bash deploy/update-admin.sh --prebuilt` 更新后台和 worker，并执行新增表迁移。核对独立站健康。
2. 再单独运行 `bash deploy/update-storefront.sh --kol --prebuilt` 更新短链记录及公开接收端。现有 Nginx 转发即可，不新增管理员公网入口。
3. 在服务器仓库运行 `python3 deploy/collabs-flow-credential.py`。凭据写入仅服务器可读的 `.offy-runtime-collabs-flow.local`，已被 Git 忽略；从现有内部签名密钥按独立用途派生，不改变原签名密钥，不新增必填环境变量。
4. 在 **Flow → Settings → Secrets** 建立 `offy_collabs_events_v1`，值取上述私密文件。不要将值粘入仓库、工单、截图或普通日志。主密钥不交给 Flow。若轮换内部签名密钥，须同步替换 Flow 的这个密钥。
5. 建立独立流程 **OFFY · Collabs attribution observation**，触发器 `Order Attributed`，唯一动作 `Send HTTP request`：
   - POST `https://isoffy.com/api/collabs/attributed`
   - `Content-Type: application/json`
   - `Authorization: Bearer {{secrets.offy_collabs_events_v1}}`
   - Body 原样使用 [已核实模板](../deploy/collabs-flow-body.liquid)。保持 `json` 过滤器，不额外给 JSON 值加引号。
   - 4XX 选 Fail；5XX/429 选 Retry。不要选忽略错误。
6. 核对触发器和唯一动作后启用。原有弃单恢复流程保持原样，不增加通知、审批、标签、退款或付款动作。

启用前先使用 Flow 测试工具检查 Liquid 渲染。当前工具会在 HTTP 动作处安全停止，不会实际发送请求；预览通过不能证明 HTTP 送达或鉴权成功。如需校验接收端，由可信客户端将同一份渲染后的负载发送到 `https://isoffy.com/api/collabs/attributed?validate=1`，使用上述专用凭据。该模式只校验，返回 `validationOnly:true`，不打开或写入数据库，不改变统计。正式工作流 URL 必须没有 `validate=1`。真实 Flow 外发送达仍须在首个启用后的真实归属事件到来时确认；不能把模拟成功当作真实 KOL 转化成功。

官方支持的 [HTTP 动作](https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-http-request) 有 30 秒等待和最多 24 小时重试。接收端先鉴权、限制 32 KiB、校验契约及店铺、持久写入，成功后才应答；数据库不可用返回 503。专用凭据仅允许这条接收路径，不是 Shopify Admin token，也不开放后台登录。

## 管理员查看与核对

**Collabs 核对 → Offy 短链打开次数**：选择具体 `/r/别名` 和最近 7/30/90 天，查看累计、期间已记录打开、UTC 每日趋势、首笔采集和最近打开。HEAD、常见预取/机器人/社媒预览不计；重复打开重复计。没有 IP、完整 UA、访客 cookie，因此不是 UV。未采集历史不补零；首笔当天可能仅覆盖部分时间。写入在跳转响应后尽力执行，锁等待上限 50ms，丢失统计不影响目的地。

每日明细的请求数按负责人要求将未采集日期显示为数字0，并在表旁解释其含义。数据接口仍保留null，图表仍标识未采集；这个展示约定不证明历史实际访问量为零。

**Collabs核对 → 推广落地浏览与访客**：按官方dt_id选择7/30/90天，查看Offy实际落地PV和期间独立去重的浏览器UV，不把每日UV相加。多个历史别名共用一个dt_id时只显示一个追踪组。该功能只在Shopify隐私API允许分析后采集，使用单独用途的90天第一方签名标识；拒绝或撤回许可、清理Cookie、脚本/存储受限、跨设备都会影响观察。Cookie和去重明细不用于计佣，原始IP/完整UA/买家信息不入库。细节见[落地PV与匿名UV口径](collabs-traffic-proposal.md)。

公开接收端`/api/collabs/landing`只接受同源、至多2KiB的严格契约；每进程最多1200次/分钟、同匿名标识最多60次/分钟，常见预览/机器人/预取排除。统计尽力写入，超过限流或存储异常可能少计；不能作为防作弊或结算依据。`?validate=1`只验证契约、不打开数据库或设置访客Cookie。worker每小时清理90天前的事件收据与UV明细，独立于Admin令牌；无身份关联的PV汇总保留。

合作链接新增或改变绑定时，同一官方dt_id或优惠码不能用于另一条记录；停用记录仍保留当前标识。比较忽略落地路径和UTM参数，优惠码不区分大小写。历史测试重复记录会在合作链接索引提示，不自动删除或停用；未改变标识的名称、状态和报告身份维护仍可保存。

**官方转化与订单核对**：查看 Flow 接收时间、官方创作者编号和累计快照，显式关联已核实的合作记录。最近 100 条归属关系显示当前订单金额、币种、支付/退款/取消状态及最近核对时间。worker 每批最多核对两笔；正常 15 分钟后刷新，90 天前记录每日刷新，失败退避重试。缺少 Admin 权限时仍保存官方归属事件，订单事实显示暂不可查，而不是未付款。

**报告与账单核对**：继续导入 Collabs 官方财务报告，以明确币种、冻结、佣金调整、处理费、账单及付款记录。不能把 Shopify 买家已付款、累计佣金或 Offy 打开量当作 KOL 已到账。原有报告快照不与 Flow 累计字段相加。

## 合作前检查

- [ ] Collabs 已接受合作，计划、佣金与 30 天冻结已核实。
- [ ] 合作联系邮箱为 `contact@whimcoreofficial.com`，KOL 使用自己的官方门户。
- [ ] 在 Offy 后台建立短链，官方目的地址含真实 `dt_id`，实际落到 Offy 商品页。
- [ ] Flow 流程已启用，HTTP 指向本品牌服务器，使用专用 Secret；没有额外邮件或付款动作。
- [ ] 短链统计页面能区分采集前未知与上线后的记录，不以打开次数结算佣金。
- [ ] 收到首个真实归属事件后核对官方编号，并关联正确短链；暂无事件时不猜编号。
- [ ] 正式合作前核对一笔已有真实订单或由负责人自行安排的付款结果，在 Collabs 官方门户确认归属；无需为了后台测试额外下单。
- [ ] 财务报告和付款结果仍以 Collabs 为准，退款核对不会在 Offy 触发二次付款。

本流程只从启用后的事件开始接收。#1134 已在 Collabs 产生佣金不等于 Flow 能自动回放它；不会将普通 Admin 订单伪造成历史官方归属事件。静态/隔离测试事件只能写入隔离数据库，不得混入生产统计。
