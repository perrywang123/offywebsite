# About Us / OFFY 故事页生产发布与验收

2026-11-11，上海时区约 21:00 完成独立站切换，随后完成线上验收。运行源码为 `a787ae7b143711854b36a116ba74de78f5e7342a`；本记录为后续文档，不改变运行代码。

## 范围与发布

用户已确认两份 PSD 的页面实现与手机排版，并授权上线。与原生产镜像 `114cb56` 的应用差异仅为 About、新故事页、其共享内容/样式及 sitemap；购物袋、结账、Shopify 商品/市场/库存、数据库迁移和部署配置没有修改。

服务器在原 `/root/offywebsite` checkout 通过 Git fast-forward 到该提交。[质量 CI](https://github.com/perrywang123/offywebsite/actions/runs/43023938754) 的 lint、类型、测试及构建通过；[镜像工作流](https://github.com/perrywang123/offywebsite/actions/runs/43024316641) 完成 Linux amd64 构建、原生 SQLite 绑定/迁移检查和制品打包。此前本地 153 个文件、931 项测试及构建通过。

服务器仅下载、校验和导入预构建镜像，没有生产编译。ZIP 摘要、压缩镜像摘要、REVISION 和 OCI revision 均校验；运行镜像为 `sha256:0b7abea2f07b6e2c2d42cfa74112047e9f7e9562e94cb9544008aca05024d064`。使用 `bash deploy/update-storefront.sh --kol --prebuilt --skip-pull`，保留部署锁及数据库在线备份。发布任务由独立后台进程执行并保存日志，避免终端断开取消。

仅 app 容器替换。admin、kol-worker、meta-worker、geoipupdate 的容器 ID、镜像及启动时间保持；运行环境哈希、挂载、3000/3001 loopback 绑定、服务器 `.env` 哈希、Nginx 哈希及 admin 镜像标签均保持。没有重启后台或 worker，没有修改 Shopify 后台配置。详见 [部署对照](design/about-story/production/deployment.json)。

## 页面验证

- [About Us](https://isoffy.com/about)、[故事页](https://isoffy.com/our-story)、首页、真实商品页及健康接口 HTTPS 200；公网 `/admin` 继续 404。
- About 的 6 项来源文本及故事页的 68 项来源文本全部存在，canonical 分别指向自身；38 个公开 WebP 与本次源码逐字节一致。见 [内容与素材](design/about-story/production/content-assets.json)、[HTTP 检查](design/about-story/production/http-checks.json)。
- Chrome 的实际 CSS 视口 320、375、1440px × 两页，共 6 组检查通过：单一 h1、无横向滚动或可见正文溢出。浏览器原站点缩放影响工具的名义尺寸，因此按实际 `innerWidth` 校准，没有把名义尺寸冒记为实际 CSS 宽度。见 [布局数据](design/about-story/production/geometry.json)。
- 手机 About 为左对齐分层正文；桌面保留居中宣言及双图。真实点击 EXPLORE OUR STORY 到故事页，底部 Back to About 正确返回。
- 完整滚动故事，34 张正文图（含 25 个角色）全部完成浏览器加载。见 [图片数据](design/about-story/production/story-images.json)。
- 上线前本地两页共 6 组 200% 字号压力检查已通过；线上核对同一实现及素材。实际 Safari / 微信客户端未在此次环境直接测试。

## 购物与支付边界

原浏览器购物袋为 DOTTY DARLING 1 件及 LITTLE HEIRESS 1 件、USD 91.80。真实商品 CARAMEL RÊVE 页面显示 USD 45.90；点击 Add to Bag 后变为 3 件、USD 137.70。移除唯一新增的 CARAMEL RÊVE 后，原购物袋的可见内容/数量/金额完全恢复，Checkout 可用。

随后点击该商品 Buy Now，经过原链路进入 `ujc6x6-41.myshopify.com` 的托管结账。展开真实订单摘要：仅 CARAMEL RÊVE 1 件、USD 45.90，收货国家 US；地址未填写，运费仍待 Shopify 地址核算，没有缺货或可见结账错误。回到 Offy，原两件购物袋保持。

没有填写联系/支付资料，没有点击付款，没有创建订单、退款或发货。本次验证到达未付款页，不代表实际扣款到账验收。浏览、加购和结账准备可能产生正常分析事件，不是 Purchase。

服务器记录该次 attempt 为 redirect_ready，阶段包括 started、server_received、catalog_checked、shopify_request、shopify_response、server_result、redirect_requested。通过时间、商品/数量、国家及浏览器实际 checkout token 交叉匹配唯一记录；先保存私密加密审计备份，再仅清空该测试 Cart，并删除对应诊断及级联事件，没有按时间批量删除。见 [去敏结账验证](design/about-story/production/checkout-validation.json)。

## 健康与恢复点

app / admin healthy；后台 readiness 的 ownerReady、workerReady、shopMatched 为 true；共享 SQLite quick_check 为 ok。现场采样主站 CPU 0.05%、服务器负载 0.05/0.14/0.09；这是验收时采样，不是峰值承载保证。

旧镜像保留为 `offy-app:before-about-story-20261111`；一致性 DB 备份为 `/data/deploy-backups/offy-2026-11-11T13-00-40-426Z-37792454.db`。服务器 `.deploy-backups/about-story-20261111/` 保留对照与日志。导入校验后仅移除本轮两个临时镜像下载文件，保留回退镜像、业务卷和既有备份。

## 截图

- About：[手机](design/about-story/production/about-mobile.jpg)、[桌面](design/about-story/production/about-desktop.jpg)。
- 故事：[手机](design/about-story/production/story-mobile.jpg)、[桌面](design/about-story/production/story-desktop.jpg)、[完整手机长页](design/about-story/production/story-full-mobile.jpg)。
- 购物：[新增验证商品的购物袋](design/about-story/production/cart-check.jpg)、[Shopify 未付款摘要](design/about-story/production/checkout-unpaid.jpg)。
