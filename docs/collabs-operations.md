# Collabs 为主的 Offy 合作核对

2026-11-07。此文说明本次实现，生产部署及店铺设置核验记录另见发布报告；不能仅凭此文认定 Collabs 已完成全部配置。

操作流程参见[管理员 SOP](collabs-admin-sop.md)与[KOL SOP](collabs-kol-sop.md)；两份飞书文档链接和已部署版本见[最新复验记录](collabs-flow-revalidation.md)。已发现的点路径跳转校验边界也在该记录中，等待用户确认后修复；不要将“常规流程测试通过”理解为无已知边界问题。

## 业务责任

品牌与 KOL 的合作联系人、Collabs 品牌联系人及合作沟通统一使用 **yifangu3@gmail.com**（用户2026-11-07纠正）。这是合作邮箱，与 Offy 后台管理员登录身份独立。先前发送到其他邮箱的 Collabs 验证邮件不作为配置完成依据。

Collabs 管理创作者邀请、专属链接、优惠码、原生归因、佣金与自动付款。首期采用邀请制，目标冻结期为30天，KOL 使用 [Collabs 官方门户](https://collabs.shopify.com/) 查看自身数据。真实合作的佣金比例、粉丝优惠和邀请对象在 Collabs 分别确认；Offy 不替代这些设置。自动付款处理费及其他费用以 Shopify 当前账单和官方规则为准。

`KOL_ACCOUNTING_MODE=collabs` 时，Offy 停止新增旧的当次 session 归因、发码任务和本地应付佣金，停止旧财务 worker 的自动归账；历史账本保留。服务端直接调用同样有保护。`KOL_SETTLEMENTS_ENABLED` 保持 false。不要为 Collabs 订单登记第二次线下付款。

## 独立站

使用 `@shopify/hydrogen` 官方 SDK 的框架通用能力，Next.js 仍为15，不切换框架。官方脚本、Customer Privacy 与默认隐私横幅按访客授权发送浏览事件；首页及客户端导航发布 page_viewed。服务器仅暴露必要的同源追踪和同意代理路径，管理后台/API 不参与 Shopify 的兜底路由。

`/discount/<code>?redirect=/&dt_id=...` 保留归因和 UTM 参数，记录当前浏览器会话的优惠码。创建 Shopify cart 时，将代码通过原生 `discountCodes` 输入传递，同时通过 SDK 请求上下文传递 Shopify Cookie、隐私信号与来源；只回传 Shopify 合法响应 Cookie。Offy 登录 Cookie 不转发。优惠码是否有效、是否可叠加、是否满足门槛均由 Shopify 决定，Offy 不显示推算折扣价。

未知公共路径可以只读查询 Shopify 配置的个性化 URL redirects。`/r/<alias>` 为数据库动态映射，记录 Collabs 复制出的官方链接，不为每个 KOL 新建页面，不产生旧本地归因。接受本店 Offy 或本店 myshopify.com 的 HTTPS 官方链接；后者的个性化路径会只读解析 Shopify URL redirect，保留 dt_id 和优惠码后转为 Offy 链接。后台不接受其他店铺或不含官方追踪的任意路径。此方式不改变 Shopify 主域名、结账域名和 DNS；KOL 从官方门户原样复制的链接域名仍由 Collabs 当前可选域名决定。只接受安全落地路径；关闭本地短链不等于结束 Collabs 合作。国家判定、商品选择、价格来源和返回的 checkoutUrl 保持原有 Shopify 链路。

## 报告导入与核对

合作短链可在没有报告时先建档，`creator_key` 留 NULL，不用昵称、邮箱或内部占位值伪造报告身份。待取得实际报告后可绑定一次；已绑定标识不可改写或清空，别名始终不可转让。多个待绑定合作可共存。工作台与核对结果显示待绑定状态，不按姓名或别名匹配来源；独立订单核对不代表创作者归因已验证。此项迁移保留既有记录、报告和审计，旧独立站只读链接逻辑仍兼容，可以只更新管理后台。

在管理后台打开「Collabs 核对」，先去官方后台导出 CSV。导入上限2 MiB、2000行。选择销售/佣金、账单或付款报告，声明真实粒度、起止日及数字格式，再映射实际列。没有预设虚构的官方字段模板。币种不能推测；来源为空与真实0严格区分；不同币种分别汇总，负数调整保留，重复订单行提示人工复核。至少映射币种和一个金额字段；逐笔报告还需订单号或 Shopify Order GID。

管理员预览并确认来源后保存。系统保存文件 SHA-256、映射与期间、导入人、时间和规范化行；原 CSV 使用 AES-GCM 加密。密钥沿用服务器私密数据目录的诊断密钥，备份数据库时同时备份该密钥，不能只恢复数据库。相同源内容和口径幂等；重叠报告需要明确确认或选取被替代报告。报告为独立快照，不把多份重叠报表累加成佣金余额。

只读核对每请求处理5行，浏览器连续发起下一批，服务器校验进度游标并持久化证据。中断显示未完成，不宣称已全部检查。按报告订单标识读取 Shopify Admin；校验身份、币种和明确的同口径销售额。未确认口径、缺失历史权限、连接失败、汇总报告无法逐笔核对，均明确提示资料不足。当前退款或取消而源文件仍有正佣金时提示在 Collabs 复核，不自动撤佣。

没有完整公开的 Collabs 过程与付款 API；Shopify 订单 API 无法证明 Collabs 付款到账。来源状态仅为文件标签。Offy 不根据“订单已支付”推断“达人已到账”，也不凭订单金额重新计算官方佣金。账单手续费、币种转换、税和实际银行到账仍以对应官方账单/付款证据核对。复核说明追加保存，每次检查及来源修订保留历史。

## 配置与独立部署

服务器私密 `.env` 的新增配置：

```dotenv
KOL_ACCOUNTING_MODE=collabs
KOL_SETTLEMENTS_ENABLED=false
SHOPIFY_ANALYTICS_SHOP_ID=<本店数字Shop ID>
SHOPIFY_STOREFRONT_ID=
```

Shop ID 是公开统计元数据，不是 token；Headless channel 无需填写 Hydrogen storefront ID。现有 Storefront 与 Admin 应用凭据分别保留。安装 Collabs 不应旋转主站 Headless token。

先备份共享数据及密钥，再部署后台的追加式数据库迁移，最后单独部署主站。主站3000与后台3001、现有 Nginx TLS/8443 不变。可先在另一台设备构建 Linux amd64 镜像，镜像 `org.opencontainers.image.revision` 必须等于 Git 源提交；服务器 Git 拉取同一提交、载入镜像后分别执行：

```bash
bash deploy/update-admin.sh --prebuilt
bash deploy/update-storefront.sh --kol --prebuilt
```

`--prebuilt` 不编译，仍执行配置校验、备份、迁移和健康检查。缺少镜像或 revision/platform 不匹配会在替换容器前失败。常规不带此参数的脚本仍支持原来的受限构建。两个脚本都通过 Git 更新源码；镜像必须由受信的同一提交构建，不能随意重打标签绕过校验。

仓库 Actions 的 **Build release image** 支持手动选择分支构建 Linux amd64 镜像；不包含生产凭据，不自动部署服务器。构建内验证原生 SQLite 及迁移，成功后保留3天的镜像、SHA256SUMS和REVISION工件。下载并解压工件，将这三个文件传到服务器的私密临时目录。在该目录执行 `sha256sum -c SHA256SUMS`、`docker load --input offy-image.tar.gz`；确认服务器 Git HEAD 与 REVISION 一致，再执行上面的两个 `--prebuilt` 命令。若分支又有新提交，应重新构建对应工件，不能把旧镜像标签冒充新代码。

该流程采用 [Docker 官方镜像工件方案](https://docs.docker.com/build/ci/github-actions/share-image-jobs/)。私有仓库工件按 GitHub 仓库权限下载；无需把个人 GitHub API 凭据复制到生产服务器。

## 官方参考

- [Collabs 自定义独立站](https://help.shopify.com/en/manual/promoting-marketing/collabs/merchants/custom-storefronts)
- [官方 SDK Analytics 与 Consent](https://shopify.dev/docs/storefronts/hydrogen/analytics)
- [请求处理器](https://shopify.dev/docs/storefronts/hydrogen/request-handlers)
- [Collabs 服务条款](https://collabs.shopify.com/terms)
