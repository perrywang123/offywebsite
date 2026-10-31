# KOL平台技术方案

2026-10-31；依据用户批准的 docs/kol-admin-proposal.md V2.1。默认功能关闭，生产数据不参与开发验证。

## 架构与入口

沿用一个Next.js15应用与SQLite/Drizzle。新增 /admin（独立root layout）及 /api/admin/kol；middleware绕过next-intl的admin/r，管理页及每个API都要求Nginx覆盖写入的秘密入口头，再校验数据库中的管理员session。主站代理清除该头并封锁admin路径；管理HTTPS端口只代理admin/API/必要静态资源。源站绑定loopback。API写操作检查精确ADMIN_ORIGIN与CSRF header；登录同样检查Origin。密码scrypt，随机session仅存摘要，8小时过期，退出撤销，登录持久化限流；无注册。管理员CLI经stdin读密码，不通过网页初始化。所有管理响应no-store/noindex。

## 数据与一致性

新建kol_*表，独立于legacy orders。KOL稳定ID和别名、版本化合作条款、匿名链路、checkout意图、码/操作、最小事件收件箱、Shopify订单快照、增量佣金账本、结算/条目、审计、运行状态。SQLite WAL+busy_timeout；本地事务保护唯一绑定/账本差额/结算锁定，外部I/O不占数据库事务。金额整数最小币种单位，decimal字符串→BigInt校验后安全整数；百分比basis points。未知币种/交易/税/退款分摊fail closed至review。

## 前台链路

/r/[alias]查有效合作，过滤HEAD/预取/已知机器人，写随机访问ticket，no-store 303至allowlist内部目标。前端落地确认后将opaque ticket置于sessionStorage；导航/用户加购确认延长站内30分钟，过期不恢复，不无人操作轮询续期。新推广链接替换本tab来源；每次checkout独立意图，服务端锁定合作版本/比例、30分钟截止，附HMAC引用到Shopify Cart，保存返回cartToken；订单同时校验签名引用、本地意图、Shopify cartToken、实际全额成功付款时间。单个意图最多一单。无证据不凭优惠码补归因；采集失败不阻断购物。

## Shopify适配

Admin API固定现有2026-07版本。订单查询包含cartToken、customAttributes、成功SALE/CAPTURE交易、行折扣后金额/税、退款行及交易；分页不足/编辑/争议等不确定情况暂停结算并显示原因。按presentment currency，含税价扣税，商品退款扣商品与退款税，不将运费退款当商品退款。原始订单不存客户资料。HMAC原始体、店铺、主题白名单校验；只存订单ID等最小事件，不存买家原始payload。持久化事件租约/退避；worker串行处理、持续分页重叠增量核对。每次锁单/付款都重新读取所涉订单，不以旧快照宣称已核对。

优惠读取 codeDiscountNodeByCode；生成只支持已验证的原生code-discount活动，先本地预留操作/候选码，再 discountRedeemCodeBulkAdd；保存异步job、具体码结果、回读所属campaign ID后绑定。网络不确定则先核对，禁止盲目另发码。多个KOL可共享campaign但码不复用。权限查询无write_discounts禁用生成；暂停/解绑不改远端活动。

## 财务闭环

成功付款30天后可选月结，按KOL/币种分开，0%有效。精确半入舍入，按订单当前剩余净额重算目标佣金后入差额账本。异常订单阻止关联结算。未付锁单有新退款时标为需重新核对并需重建；已付款退款新增负差额，后续批次冲抵；负余额保留。草稿/锁单/人工付款使用版本与唯一条目约束，付款流水不触发网关转账，更正记录以新增审计保留。CSV按行导出不含客户PII并转义公式。

## 测试与运行

默认KOL_ENABLED=false、未配置secret/origin不可进入。新增worker脚本持续调用仅秘密认证的内部消费接口；compose共享应用，worker仅内网访问。迁移可向前追加，保留原表；备份建议SQLite在线backup。隔离启动使用独立dist目录、临时DB、独立端口、仅loopback的Shopify模拟器（专用integration flag且生产环境拒绝）。验证前后台真实点击链路、签名订单/退款、多币种与异常/权限/幂等，并保存截图和报告。模拟器不代替真实Shopify联调；未完成真实店铺税/支付/争议/cart关联、TLS与备份压力验收时不开正式结算开关。
