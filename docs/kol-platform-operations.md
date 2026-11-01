# KOL 平台运行手册

2026-11-01；已实现，默认关闭。设计依据 [V2.1方案](kol-admin-proposal.md)，实现与测试证据见 [验收记录](kol-platform-validation.md)。本次没有部署生产、申请店铺权限、创建真实优惠码或付款。

## 技术结构

同仓库 Next.js 工程、独立 app/admin Docker 容器、两个 Nginx 入口、一个持久 SQLite 库。主站443负责商店、`/r/[alias]`与验签webhook；后台HTTPS独立端口（示例8443）负责`/admin`及`/api/admin/kol/*`。主站/后台源站分别仅暴露loopback3000/3001，后台服务端直接查询同一数据库，无需RPC。Docker运行Next.js，两者不冲突。

- `src/server/kol/core.ts`：KOL身份、版本条款、随机推广链路、签名checkout及cartToken关联。
- `auth.ts`：scrypt密码、仅存摘要的8小时session、撤销、持久限流、入口和Origin/CSRF验证。
- `shopify.ts` / `codes.ts`：Admin GraphQL、已有码核验、持久异步追加新码与回读恢复。
- `ledger.ts`：精确币种金额、成功交易/退款核验、增量佣金、批次快照及人工付款凭证。
- `sync.ts`：最小事件收件箱、租约/退避、分页增量扫描、90天访问明细清理。
- `snapshot.ts`：后台专用读模型；管理API在调用前逐请求验证身份，不向公开商品接口提供内部账目。

数据库首次使用即绑定配置店铺；更换SHOPIFY_STORE_DOMAIN会拒绝KOL读写并提示accounting_shop_changed，需专门迁移，不能混账。

新表以`kol_`开头，与Stripe/PayPal保留表独立。schema集中在原文件，迁移0005新增模型、0006新增不可变结算条目快照。WAL、外键和5秒busy_timeout；事务保护条款、绑定、账本差额与批次唯一性；外部请求在事务外执行。历史别名/代码保留，批次取消释放条目，已付批次不释放。

## 配置与初始化

先在隔离环境确认流程，再填运行时配置；不要把Admin token和秘密放Docker build args。模板见`.env.production.example`。

| 配置                                           | 用途                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `KOL_ENABLED=false`                            | 无显式发布选项时默认关；`--kol`/后台独立发布为当次启用，内部认证自动准备 |
| `KOL_SETTLEMENTS_ENABLED=false`                | 独立结算门槛；开启KOL不自动允许锁单/登记付款                             |
| `ADMIN_ORIGIN`                                 | 精确HTTPS origin，包括独立端口，例如`https://管理域名:8443`              |
| `KOL_INGRESS_SECRET`                           | 部署工具自动准备的入口认证值；可兼容已有私密值                           |
| `KOL_SIGNING_SECRET`                           | 自动准备并稳定保留的 checkout 归因签名值；不要随意轮换                   |
| `KOL_WORKER_SECRET`                            | 自动准备的内网 worker 认证值                                             |
| `SHOPIFY_ADMIN_TOKEN`                          | 订单与优惠查询，生成代码需受控写入优惠权限                               |
| `SHOPIFY_WEBHOOK_SECRET`                       | 可选实时通知验签；为空时接口404，仍按原计划通过 Admin API 扫描/核对订单  |
| `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_API_VERSION` | 仅接受本店事件，API继续固定2026-07                                       |
| `KOL_ADMIN_BOOTSTRAP_HASH`                     | 可选生产初始scrypt哈希，只在owner尚不存在时创建；禁止明文                |
| `DATABASE_URL`                                 | 应用迁移、管理员初始化指向同一持久卷文件，默认`/data/offy.db`            |

部署工具会自动生成和稳定保留内部认证参数，保存到服务器项目 `.offy-runtime-secrets.json`（0600），不用手工生成三组值。已设置的环境值和匹配运行容器的值会保留；冲突时停止，避免破坏在途归因。该文件不提交 Git、不进 Docker 构建、不随源码同步覆盖，需私密备份。

初始化前先运行迁移。无网页注册。生产白名单仅允许`wangperry666@gmail.com`（忽略大小写/首尾空白），账号创建、重置、登录及已有session逐次检查；其他历史管理员不能进入生产。本地隔离环境保留虚构测试账号。

生产首次启动默认从服务端 `config/admin-account.json` 的唯一邮箱和已授权 scrypt 哈希初始化管理员；不包含明文密码、不发送到客户端。已有 owner 和后续重置密码保留，不在每次部署时覆盖。通常无需手工初始化；如需私密覆盖首次初始化密码，可隐藏输入生成 `.env` 中的哈希：

```bash
pnpm kol:admin prepare-production wangperry666@gmail.com
```

将生成的`KOL_ADMIN_BOOTSTRAP_HASH`私密运行配置部署至服务器（不要提交或复制进build args）。Docker迁移后自动运行bootstrap，只在owner不存在时创建；不会覆盖现有密码，重置后重启也不恢复旧密码。裸Node部署在迁移后先运行`NODE_ENV=production node scripts/kol-admin-bootstrap.mjs`。此准备命令不连接生产服务器或修改本地测试账号。

手动创建/重置仍可使用：

```bash
pnpm db:migrate
pnpm kol:admin create admin@example.com
# 交互输入12–256字符密码，不显示输入、不把密码写进命令行
pnpm kol:admin reset admin@example.com
# reset撤销该管理员全部旧会话，操作进入审计
```

Docker内同理：`docker compose -f docker-compose.prod.yml exec app node scripts/kol-admin.mjs create admin@example.com`。不要从网站端口提交初始化请求，那里没有引导接口。

## 一键部署

在服务器原有 Git checkout 执行 `bash deploy/update-admin.sh`：自动 Git fast-forward 更新，仅构建/替换独立 admin 与 worker，不重启主站，无需填写服务器 IP 或上传源码。首次启用归因/切换新拓扑、或变更共用设置时先执行 `bash deploy/update.sh --kol` 整套发布。两者共享锁、备份/就绪/HTTPS检查及原持久卷。详见 [部署手册](deployment.md)、[独立后台验收](admin-deployment-validation.md)。

## Nginx、端口与Docker

采用 [双入口模板](../deploy/nginx-kol.conf)，结合已有站点配置调整域名、证书路径、后台端口和秘密，先`nginx -t`。本次仅提交模板，未操作服务器。

- 若用IP＋端口，改后台`server_name`、Host检查、`ADMIN_ORIGIN`及证书；证书必须覆盖该IP。自签名证书警告不能当作正式TLS验收。
- 主站拒绝admin、管理API、locale/编码变体，并清空客户端传入的秘密标记；后台仅代理管理路由与必要Next静态资源。未知Host拒绝。
- 源站3000/3001保持loopback；不发布数据库端口。独立端口仍需登录，可以配置管理员IP白名单。
- 每个管理API再次校验入口秘密及session；变更操作要求精确Origin与自定义CSRF请求头。生产cookie Secure/HttpOnly/SameSite=Strict，不存在开放CORS。
- 后台响应no-store/noindex；应用worker入口在主站禁止，Shopify webhook仍公开验签。

```bash
docker compose -f docker-compose.prod.yml --profile kol up -d --build
```

`app`使用`offy-app:local`，`admin`和`kol-worker`复用独立的`offy-admin:local`镜像；worker不暴露端口，也不直接打开DB，只通过Docker内部`http://admin:3000/api/kol/worker`消费持久任务。app/admin共同挂载原项目的`offy-data:/data`。启用前填写运行配置；不启用KOL时保持profile关闭。不要用`down -v`排障。

## Shopify授权与webhook

Webhook 现在是可选增强，不是后台登录/发布的前置条件。未连接时，订单沿用现有 Admin API 分页增量扫描（完整一轮后15分钟再扫）及逐单核对，处理进度还受分页/队列影响，不宣称实时到账；结账诊断仍由站内 checkout 直接记录。通知接口在未配置签名密钥时返回404，后续配置后才接收验签事件。

使用本店隔离测试环境核对实际授权。需要`read_orders`；优惠绑定需要读取优惠能力，生成需要`write_discounts`。写权限可能涵盖读能力，以`currentAppInstallation.accessScopes`实际值为准。不申请写订单、退款或转账权限。超过60天订单的重核对涉及历史读取权限；读取不到就阻止该结算，不能声称已核对。

在Shopify应用配置中注册HTTPS `https://主站/api/kol/webhook`，按支持情况订阅：

- `orders/create`、`orders/paid`、`orders/updated`、`orders/cancelled`
- `refunds/create`
- 可用时的`shopify_payments/disputes/create`、`shopify_payments/disputes/update`

处理器校验原始体HMAC、店铺与主题，仅保存事件ID、订单ID、主题与任务状态，不保存完整买家payload。返回200代表已持久入队，不代表已计佣。重复事件幂等；失败退避重试。每轮最多2个收件任务＋1个发码任务，外部调用15秒超时，轮次租约2分钟；普通worker每5秒触发一轮。增量扫描每页50，跟随游标，完成后15分钟再扫并重叠5分钟；初始化取最近59天。锁单和付款另外主动核对所涉全部订单。

后台“连接与同步”显示实际scope、最近worker/扫描、失败次数及归因采集告警；日常应关注worker长时间未运行、持续重试和待核对码。未绑定码时也能开展链接分佣。Cart的return_url只是一条属性，不能自动保证Shopify回站；原商家回跳配置仍需另行验收。

## 归因与金额规则

- 推广入口动态查DB，新KOL不用新增页面/部署。过滤HEAD、预取和已知bot，不能把请求数当自然人数。
- tab内sessionStorage只存随机ticket；有效前台活动延续站内30分钟，没有后台定时心跳续命。过期不恢复。点击新链接只替换当前tab链路。
- 每次checkout保存独立意图、合作版本、整数basis points和30分钟截止；订单需签名、本地记录、Shopify cartToken一致。按成功付款实际时间判断，不按通知到达时间。一个checkout意图仅能认领一个订单。
- 优惠码仅提供Shopify权益，不产生/覆盖归因。仅用码的订单显示“无链接归因”，佣金为未知/不适用，不冒充0佣金收入。
- 百分比0–100、最多两位小数；无默认8%。使用BigInt解析小数、币种精度白名单、half-up舍入；不支持币种进入待核查，不猜精度。Shopify金额一律使用presentmentMoney。
- 原价减所有行分摊优惠，再扣含税价税额；排除gift-card产品。核验成功商品退款并按当前剩余净额重算佣金，再追加差额；运费退款不扣商品净额。保存规则版本和计算依据。
- 订单编辑/取消/争议、分次付款、未成功退款、不完整分页、无法解释的退款调整/分摊或币种变化均进入review。不会用客户端“成功页”或授权未扣款当作收入。详细订单最多250行、交易最多99条；更大/不完整订单保守待核查。
- 人工冻结需原因；解除后仍重新读取Shopify，不支持填任意金额或凭优惠码补认领。

## 发码与月结

绑定已有或选择原生有效活动追加新码。只支持已验证的Basic/Bxgy/FreeShipping code活动；第三方App活动不能生成，仍可走远端已有绑定。每个代码按大小写无关保留唯一归属，多个代码可共享活动。本站不创建/编辑活动权益，也不自动加赠品或停用活动。

新码先保存操作ID/候选码，再提交异步任务；核对done、该码结果及所属活动回读后绑定。任务未确认时不进入合作包，旧绑定保留。超时先核对原操作；确定失败可重试同一码。暂停合作/本地解绑不更改Shopify权益。

每月按KOL/币种创建草稿：该月及更早已解冻正佣金＋现有负调整。每个条目只能进入一个未取消批次。锁单/登记付款都重读Shopify；变化会要求取消并重建。负/零批次仅可导出或取消释放，不可登记正向付款；负债仍保留，可在后续正佣金中抵扣。付款仅记录品牌在平台外完成的凭证，不调用银行/支付API。已付退款新增负调整。已付清单按批次快照导出，不随当前订单变化；凭证更正保留审计。

CSV不含买家邮箱/地址/电话，文本处理公式注入。时间UTC毫秒存储，界面及合作日历按Asia/Shanghai。原始访问明细90天清理，累计访问/到站数保留；未采集持久访客ID，因此不提供虚假的自然人UV。财务、合作与审计记录不跟流量删除，品牌应按合同与隐私政策确定保留安排。

## 备份与恢复

生产备份使用SQLite在线backup API或SQLite backup命令，覆盖同一时间点的完整库，不仅复制正在WAL写入的主文件。加密存放在受控位置，不通过后台公开下载。恢复到新文件后运行`PRAGMA integrity_check`，比较账本分币种合计、批次/条目与审计，再在隔离环境验证迁移与只读页面。只有停写且确认恢复文件无误后切换路径；保留原卷。

本次对隔离测试库实际执行在线backup、重新打开备份、完整性检查、7类表行数及分币种账本合计核对通过。生产异地备份、灾备切换和写入压力仍需部署环境验收。

## 可重复本地验证

```bash
pnpm kol:integration
# 主站 http://127.0.0.1:3901，后台 http://127.0.0.1:3902/admin
# 控制台只打印本次临时库路径与虚构测试账号，不读取项目.env密钥
node scripts/kol-integration-checks.mjs
# 浏览器先创建alias=maya、7.25%且有效的合作
node scripts/kol-integration-workflow.mjs
```

仅loopback，独立编译目录`.next-kol-integration`、系统临时库、虚构商品与优惠、签名mock事件。生产配置禁止integration变量，HTTP结账例外只允许开发测试且两端都loopback。`/test/mature`只存在模拟器进程，用于在临时库中模拟31天时间经过，不是产品接口。停止用Ctrl+C，只结束本测试进程组，不关闭其他本地服务。可传入控制台打印的同前缀临时目录继续查看测试数据；模拟器重启不持久保存其远端订单，所以完整重复验收请新开测试库。
