# KOL 平台实现与验收

2026-10-31。用户批准V2.1后采用spec-first/TDD实施。技术冻结记录：[design](../openspec/changes/archive/2026-10-31-implement-kol-platform/design.md)；运行说明：[operations](kol-platform-operations.md)。

## 交付范围

四页真实管理后台、独立入口与登录、合作版本/自定义佣金、动态链接及到站确认、当次会话checkout签名/cart关联、双方式优惠码、HMAC收件箱/持久worker/分页核对、精确佣金与退款调整、月结/批次快照/CSV/人工付款及审计。默认关闭；不涉及商品本地回退、自动转账、优惠规则编辑、CMS或KOL门户。

## 隔离证据

- 新应用端口3900（localhost loopback）、主站代理3901、后台代理3902、Shopify模拟器3903。
- 独立`.next-kol-integration`与系统临时目录`offy-kol-integration-*`中的SQLite库；未改项目`.env`、原数据文件或现有3000服务。
- Shopify Storefront/Admin均显式转向loopback模拟器，令牌为虚构值。生产环境拒绝集成模式；没有创建真实优惠码、订单、退款、付款或生产部署。
- 浏览器实际操作，不只调用业务函数；HTTP边界与业务回归另行执行，模拟器不代替真实Shopify联调。

## 自动化与构建

本轮记录在最终收尾时更新：全量Vitest、typecheck、ESLint、生产standalone构建、Prettier与OpenSpec检查。核心服务使用迁移创建内存SQLite，避免依赖用户数据。首轮全量75文件/500测试通过；随后补充边界与店铺绑定保护，最终计数见下方最终检查。

覆盖：0%/7.25%/非法比例、别名保留/跳转白名单、合作版本、站内/checkout超时、cart复制/重放、签名运输、cookie过期与撤销、CSRF/入口/限流、折扣分摊/税/商品退款/运费/礼品卡/币种/舍入、异常交易与争议、重复/乱序事件、发码超时恢复、冻结与并发保留、历史账单快照、生产集成模式隔离。

## 浏览器完整链路

1. 使用虚构管理员登录3902，新增Maya Local Test：Instagram、别名maya、佣金7.25%、有效日期、落地商品。
2. 绑定模拟Shopify的MAYA-EXISTING；向同一已有活动提交MAYA-NEW-2026，任务先同步中，远端done与回读后才替换绑定。
3. 新浏览器tab打开主站`/r/maya`，到达真实应用商品页；点击Add to Bag→Checkout→模拟Hosted Checkout，输入ELI-FANS并点击Pay test order。
4. 返回主站，购物袋清空；HMAC订单入队，worker读最新模拟订单：Maya归属、USD90.00净额、7.25%快照、USD6.53佣金、付款后30天冻结。
5. 仅测试库模拟31天经过，再通过后台创建月结、重读Shopify、锁单、填写LOCAL-TEST-RECEIPT-001并确认登记。没有银行转账。
6. 模拟成功商品退款USD30.00；当前净额变USD60.00、佣金USD4.35，已付批次仍USD6.53，新增USD-2.18负差额。
7. 后续HTTP端到端再次验证：新码全流程、先创建checkout后改佣金至12%仍按旧7.25%、负余额抵扣、锁单/付款、退款后已付CSV字节一致；仅用优惠码的新订单为unattributed且无佣金。**17项回归通过**。

22项HTTP边界通过：public admin/API/locale/编码/尾斜杠/伪造秘密头、直接源站无秘密、未登录读、跨Origin写、cookie属性、no-store、退出撤销、HEAD/已知bot不计数、伪造webhook拒绝。此前22项使用本地等价入口代理；随后另用真实Nginx完成13项隔离TLS检查，仍未操作生产服务器或防火墙。

## 响应式与视觉复审

| 实测视口  | 证据                                                                                                                                                               | 结果                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 360×800   | [自动候选码表单](design/kol-admin/implemented-generate-360.png)                                                                                                    | viewport与scrollWidth均360；自动候选可改；Esc后焦点返回触发按钮 |
| 375×900   | [合作名单](design/kol-admin/implemented-partners-375.png)、[表单](design/kol-admin/implemented-form-375.png)、[优惠码](design/kol-admin/implemented-codes-375.png) | body无横溢；名单重排；表格仅内部横滚；手机可退出                |
| 768×1024  | [优惠码](design/kol-admin/implemented-codes-768.png)                                                                                                               | viewport与scrollWidth均768                                      |
| 1440×900  | [订单](design/kol-admin/implemented-orders-1440.png)、[结算](design/kol-admin/implemented-settlements-1440.png)                                                    | 四页导航、金额和核验依据清楚                                    |
| 1920×1080 | [结算](design/kol-admin/implemented-settlements-1920.png)                                                                                                          | viewport与scrollWidth均1920，容器保持可读                       |

最弱三项已调整：窄屏原退出入口隐藏→增加页头退出；优惠码/结算搜索提示与实际字段不符→各页专属搜索并实现结算过滤；已付款导出原先读取当前订单→改为不可变批次快照并添加失败→通过的回归测试。原型的历史QA见 [原型记录](design/kol-admin/QA.md)，不与本次真实运行截图混同。

## 恢复与运行限制

隔离库实际在线backup、重新打开、integrity_check=ok；合作、checkout、Shopify账目、ledger、批次、条目、审计7类表行数及分币种合计一致。

未进行真实店铺付款/退款/争议、税与多币种样本或真实Cart→Order关联联调，未验证真实优惠权限/第三方活动，也没有部署Nginx8443、IP证书、防火墙或生产持久卷。Compose模板已通过`docker compose config --quiet`；真实Nginx在loopback49080/49443/49444使用独立测试证书和显式CA验证，13项TLS边界检查通过，并修复了正则引号问题。Docker CLI可用但本机daemon未运行，未进行容器构建/启动；隔离Nginx验收也不等同目标服务器上线。**正式结算默认关闭**，完成这些真实门槛后由部署配置启用。

没有持久匿名访客ID，不声称精确UV；页面展示累计请求/到站和已核验成交会话。大订单/不完整财务证据、订单编辑/取消/争议、分次付款及复杂退款调整保守review。没有任意金额/凭码补认领入口。列表订单最多最近500，批次最近200，账本/结算选择查询完整库，不按截断列表算钱。

## 最终检查

收尾最终版本：77个测试文件、508项测试；typecheck、lint、standalone生产build通过。新增店铺绑定回归防止同一财务库静默切换Shopify；CSV文本仍做公式转义，数字列（包括负调整）保留可计算的精确格式。检查报告与OpenSpec归档在本次交付时完成。另实际验证管理员CLI创建→API登录→CLI重置→旧session拒绝；未记录或使用生产账号。
