# 独立站发布与验收

2026-11-11，亚洲/上海时区约 16:09 完成主站切换，随后完成线上验收。运行源码为 `2bf473b92e94f0a9c6cbecf6c7d3ad74258f6be9`；本记录及截图属于随后补充的文档，不改变运行代码。

## 发布范围与证据

本次发布带上已确认的首页 FEATURED / 区域限定 / All Products 名册、SWAN QUEEN 新闻主图、紧凑手机顶栏及 Help & Support、完整同系列推荐，以及单款 Buy Now。顶部公告保留，没有启用两行手机导航，没有新增 SWAN QUEEN 特殊规则。

服务器通过 Git fast-forward 取得源码；[GitHub 镜像工作流](https://github.com/perrywang123/offywebsite/actions/runs/42984000368) 完成 Linux amd64 构建、原生 SQLite 迁移检查及制品上传，[质量 CI](https://github.com/perrywang123/offywebsite/actions/runs/42981795502) 成功。此前本地 149 个文件、935 项测试及生产构建通过。

服务器只下载、校验、导入预构建镜像，再执行 `bash deploy/update-storefront.sh --kol --prebuilt`，没有生产编译。制品 ZIP SHA256 为 `502b425982db8ecad24876e5b53e6421231da6e1eccb893f24ee1946d70e5f1f`，镜像压缩包 SHA256 为 `9185a1ab726cf7aca45596a2b783a1de853258be0f9b00d1ee6d5557b580acfe`；校验了制品 REVISION、OCI revision 和平台。运行镜像为 `sha256:b649b4f3f9acec963bf3c8fb6535526761a55db8dff19fe366d6db58e2a4cd39`。

仅替换 app。admin、kol-worker、meta-worker、geoipupdate 的容器 ID、镜像、启动时间及环境哈希均与发布前一致；镜像导入时也恢复了原 admin 标签。app 的运行配置哈希、服务器 `.env` 文件哈希与 Nginx 配置哈希未变化。3000/3001 继续仅绑定 loopback，443/8443 原入口不变；KOL/Collabs、Meta/CAPI 与 GeoIP 原配置保留。

## 线上验证

- 首页及商品页 HTTPS 200，公网 `/admin` 404。app/admin 均 healthy；后台 readiness 显示 ownerReady、workerReady、shopMatched 为 true。SQLite quick_check 为 ok。
- 只读核对 Shopify：集合标题 `FEATURED`，handle `featured`。线上主推荐依次为 `burger-doll`、`feral`、`ease`、`gurardian-angel`，与集合返回顺序一致；没有修改集合、商品、价格、库存或优惠配置。
- 美国区域款 `lemon-fizz`、`cold-kitten` 独立展示，主精选不重复；All Products 名册有 33 件当前市场非周边商品。NEWS 使用内置 `news-swan-queen.jpg`，指向 `/products/swan-princess`，旧 ROMANTICIZING 标题未显示。
- 手机实际 CSS 视口 390×844，无横向溢出；两按钮各约 174×48px。保留原顶部公告、紧凑购物袋图标及 sticky 购买条。
- 从真实生产 PDP 点击 Buy Now，进入 Shopify 托管结账；摘要仅 CARAMEL RÊVE 1 件，商品小计 USD 45.90、国家 US。没有填写邮箱、地址或支付信息，没有付款、订单、退款或发货操作。之后模拟带 buy-now 来源的回站，原站内购物袋 2 件保持不变。
- 同一 PDP 的 More from this series 有 11 件其他商品，未截断为六款。
- 只读诊断证据确认本次单款 checkout 为 redirect_ready，国家 US，商品 warm-biscuit 一件，包含原诊断阶段；之后按专属 attempt ID、时间、商品和实际浏览器 checkout token 四重匹配，清空唯一测试 Cart，并仅移除该条诊断及级联事件。服务器保留加密审计备份；既有顾客购物袋、其他诊断、订单和财务记录未改动。浏览与结账准备产生的正常分析事件不代表 Purchase，本轮未验证广告购买归因或到账。

## 恢复点与资源

旧主站镜像保留为 `offy-app:before-buy-now-20261111`。切换前 SQLite 一致性备份位于共享卷 `/data/deploy-backups/offy-2026-11-11T08-09-25-547Z-3433bb6f.db`；服务器 `.deploy-backups/buy-now-20261111/` 保留前后容器、配置哈希对照。临时制品 ZIP/压缩镜像已在导入后移除，未清理其他镜像或备份。

现场采样主站 CPU 0.00%，后台及 worker 约 0.01%–0.02%；主站内存约 336 MiB，服务器根盘余量约 7.8 GiB。此为验收时采样，不能代表峰值或承载上限。

## 页面证据

- [线上手机商品页](design/buy-now-production/mobile-product.jpg)
- [线上 FEATURED](design/buy-now-production/featured-desktop.jpg)
- [Shopify 未付款摘要](design/buy-now-production/shopify-unpaid.jpg)

入口：[独立站](https://isoffy.com/)、[商品页](https://isoffy.com/products/warm-biscuit)。
