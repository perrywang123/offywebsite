# Collabs 落地浏览与访客验证记录

2026-11-08。本次只增加 Offy 第一方观察，不改商品、结账输入、Shopify Analytics、Collabs 原生归因、佣金或付款规则。

## 发布前验证

- OpenSpec `add-collabs-landing-traffic` 校验通过。先运行缺失模块的失败测试，再实现采集、去重、许可、保留期限与界面。
- 完整 Vitest：121 个文件、832 项通过；类型、ESLint、生产构建通过。
- 隔离 HTTP：40 项通过，包括原有报告/订单核对和新采集链路。Shopify、数据库及订单均为本地模拟，不调用生产支付。
- Chrome 真实页面验证：拒绝分析时 `dt_id=0` 没有记录；同浏览器允许后首次 PV=1、UV=1，刷新后 PV=2、UV=1，再经 `/r/qa-collabs` 落地后 PV=3、UV=1。撤回后 PV=3、UV=0，数据库完整性正常。
- 360、768、1440、1920 宽度检查通过，页面没有横向溢出；周期选择、每日明细及未采集日显示 0 已核对。截图保留在本次本地验证目录，不将模拟数据带入生产库。
- 商品详情 → 加购 → 购物袋 USD 100.00 → 模拟 Shopify 结账页面回归通过，停在未付款页面，未触发真实支付。
- [桌面统计截图](design/collabs-landing-20261108/landing-desktop.png)、[移动统计截图](design/collabs-landing-20261108/landing-mobile.png)；本次隔离数据库及进程已清理。

## 对外邮箱与 SOP

当前合作联系人为 `contact@whimcoreofficial.com`。生产管理员登录及测试创作者身份不变。已保存 Collabs 的公共联系邮箱并发送验证邮件，用户已完成验证。2026-11-08 用户手动打开 Settings → Email 后，已只读核对新公共邮箱旁明确显示绿色 **Verified**，见[验证截图](design/collabs-landing-20261108/collabs-public-contact-verified.png)；没有刷新、重发验证邮件或改动设置。

该页下方的内部 Collabs notifications 仍列出 `yifangu3@gmail.com`，Marketing 和 Notifications 均勾选。此项是系统通知接收设置，与向创作者展示的公共 Point of contact 分开；本次仅记录，不修改通知偏好或员工账号。

两份飞书 SOP 已更新邮箱、保留原有链接和检查清单，并向管理员解释新 PV/UV 口径：

- [管理员 SOP](https://my.feishu.cn/wiki/F1omweS8siJKxFks3GrcXl20nBe)
- [KOL SOP](https://my.feishu.cn/wiki/T0EwwseiHiwUYXknMMmcKbDQnOe)

已核对飞书“已经保存到云端”；[KOL 文档新邮箱截图](design/collabs-landing-20261108/kol-sop-public-contact.png)。不更改文档分享权限，不发送 KOL 邀请。

## 采集边界

PV 只计已允许分析并实际触发采集的 Offy 落地页；只访问 Shopify 域名不计入 Offy PV。UV 按匿名浏览器标识去重，不是准确人数。期间 UV 独立去重，不累加每日 UV。访客标识、成员及事件去重记录最多保留 90 天；匿名 PV 聚合保留。拒绝许可不新增标识，撤回会移除对应 UV 成员，浏览器限制、网络或脚本失败均可能少计。

同一个官方 `dt_id` 的历史别名合并显示。新增和改绑沿用已上线的唯一绑定限制，不拆分原有测试组；原短链请求数、官方 Flow 归属快照和 CSV 财务核对分别展示。

## 生产发布

运行镜像来源 `215eed1b3fa1852808f806082695c557bd1f3283`，已推送 Git。[全量 CI](https://github.com/perrywang123/offywebsite/actions/runs/42446511917) 与 [Linux 镜像构建](https://github.com/perrywang123/offywebsite/actions/runs/42446516158) 均成功。镜像直接传到服务器，核对 GitHub artifact 摘要、REVISION 和 SHA256SUMS 后导入，没有在生产服务器编译。

先以 `update-admin.sh --prebuilt --skip-pull` 发布后台及迁移 0012：主站容器 ID、镜像、启动时间和端口与发布前完全一致。再以 `update-storefront.sh --kol --prebuilt --skip-pull` 单独发布主站：后台及 worker 容器保持不变。两步 Nginx 配置哈希均未变化，各自保留一致性数据库备份及原运行镜像回滚标签。

2026-11-08 04:28 UTC 验收：首页、商品页、主站/后台健康接口均为 200；三项服务运行同一已测源码镜像，worker ready，SQLite `integrity_check=ok`、外键异常 0。既有 133 条 Shopify 订单、116 条结账记录、3 条合作索引及 1 次短链打开记录保持原样。

生产 `POST /api/collabs/landing?validate=1` 返回 200、`validationOnly=true`，不设置访客 Cookie；前后新采集三张表均为 0 行，证明该检查未补造 PV/UV。未重放历史真实订单，也未制造 Collabs 归属事件。

已重新登录生产后台，核对公共邮箱、周期选择、每日 0 值和 `dt_id=3689395` 的历史三个别名合组显示；[生产后台截图](design/collabs-landing-20261108/landing-production.png)。新 PV/UV 从上线后有效许可浏览开始，历史不会回填。独立站支付、原生 Shopify Analytics、Flow 配置和 Collabs 付款未作改动。
