# 首页与商品详情滑动验收

2026-11-17。产品、交互、前端专家已对齐并实现：Hero 从叠层淡入改成真实横向轨道；PDP 增加同一商品图集的手势切换。保持五屏原图、文字/摄影分区、共同自然高度、指示条、原跳转，以及 PDP 图片比例、缩略图和购买按钮。

## 已完成的验证

- 相关回归 46 项通过；全量 163 个文件、1008 项通过。TypeScript、ESLint、生产构建通过。测试与构建并行时有三项既有部署脚本测试超时，停止构建竞争后单独重跑全量通过，没有扩大测试超时或跳过检查。
- 测试覆盖方向意图、距离/最近速度、停留后不误判轻扫、拖动回原点的点击保护、首尾阻尼、取消/多点/失焦/丢失捕获、外部松开、自动轮播暂停恢复、减少动态、空/单图和换图集重置。
- 真实 Chrome 指针拖动：390px 首页从第二屏向第三屏拖动，active 仍为第二屏时实际位移依次为 -390、-421.87、-453.75、-485.62…；松手从 -645 继续吸附到 -780，没有换图跳回。详情主图同样从 0、-30.62、-61.25…连续移动，并同步第二个缩略图。见 [首页采样](design/smooth-galleries/local/home-drag-samples.json)、[详情采样](design/smooth-galleries/local/pdp-drag-samples.json)。
- Chrome 实际 CSS 宽度 360、390、768、1440px：页面没有横向溢出，五屏总高在同一宽度相等，促销及系列文案与摄影区域分离。见 [布局记录](design/smooth-galleries/local/geometry.json)。
- 真实鼠标验证桌面拖动、首页第一屏边界、正常轻点仍到原系列地址；PDP Home/End/左右键、最后一张不绕回、缩略图选中及图片加载正常。购物/立即购买按钮保持可用。
- 本机图片优化器读取 Shopify PNG 一度超时，本地交互预览切换到已有 integration 模式直读原 CDN；生产构建使用正常优化器配置。此环境差异未修改上线图片策略。

截图：[首页手机](design/smooth-galleries/local/home-mobile.jpg)、[首页桌面](design/smooth-galleries/local/home-desktop.jpg)、[详情手机](design/smooth-galleries/local/pdp-mobile.jpg)、[详情桌面](design/smooth-galleries/local/pdp-desktop.jpg)。

## 交互边界

一次手势最多相邻一张，手动首尾不循环。Hero 五秒自动轮播保持循环，末屏到首屏直接归位，避免横扫五屏；PDP 不自动播放。吸附动画 280ms 内的新拖动暂不接管，防止位置跳变。减少动态设置保留直接跟手、关闭自动播及松手动画。

当前浏览器工具提供真实鼠标拖动与响应式视口；触控取消/多指和减少动态由自动化事件测试验证。没有直接操作实体 iPhone/Safari/微信客户端，不将鼠标验收等同于真机触控性能保证。

## 发布

2026-11-17 上海时间 12:05 完成主站独立发布。运行源码 `4699ee608bf931a27752f0a1bcfbc216f583ee40`；镜像 `sha256:8b63fd477c5a85b1067412d16daab7f9f1e62db3540362c635abbe1408c1f620`。这是源码发布后的验收记录，不改变运行代码。

[质量 CI](https://github.com/perrywang123/offywebsite/actions/runs/44013866319) 与 [Linux 镜像 CI](https://github.com/perrywang123/offywebsite/actions/runs/44013866317) 均成功。服务器从原 Git checkout fast-forward 拉取；下载制品 ZIP、镜像压缩包、REVISION 与 OCI revision 均校验，架构为 linux/amd64。使用 `bash deploy/update-storefront.sh --kol --prebuilt --skip-pull`，生产没有编译。镜像制品自带 app/admin 标签，导入后已恢复原 admin 标签，未更新后台或 worker 容器。

本次代码提交只改媒体组件、共享手势及测试/文档；运行镜像还包含此前已授权并发布后台的 Collabs 归档代码。其迁移在本次发布前已存在，前后迁移数均为 16，没有新增购物或支付改动。实际核对：[部署对照](design/smooth-galleries/production/deployment.json) 中主站环境哈希、挂载、3000 绑定、私密 .env、Nginx，以及后台/KOL worker/Meta worker/GeoIP 的容器 ID、镜像和启动时间全部保持。

上线后再次实际拖动首页和 PDP：390px 和 1440px 无横向溢出；首页拖动中位移连续、释放吸附，桌面五屏共同高度 904.3125px；主图从第一张切到第二张、桌面再切到第三张，缩略图同步且 Shopify 优化图片正常加载。真实点击原 Hero 链接进入 `/collections/outdoor-sporty`。见 [线上采样](design/smooth-galleries/production/home-drag-samples.json)、[浏览器检查](design/smooth-galleries/production/browser-checks.json)。

原线上浏览器为空袋；添加 LITTLE HEIRESS 一件后金额为 USD 45.90，Checkout 可用；移除新增商品后恢复为空袋。验证来源标记为 `offy_validation / internal_test`。没有点击结账或付款，没有创建订单；因此这是购物入口回归，不是新增一次支付到账验收。

主站与后台 healthy，首页/商品页/health/8443 后台入口 200，主站 `/admin` 继续 404，共享 SQLite quick_check=ok。现场采样 app CPU 0%、内存约 399MiB；不是峰值性能承诺。

回滚镜像为 `offy-app:before-smooth-galleries-20261117`；一致性数据库备份为 `/data/deploy-backups/offy-2026-11-17T04-05-26-483Z-91601044.db`。服务器 `.deploy-backups/smooth-galleries-20261117/` 保留发布日志及前后对照；仅清理本轮临时下载的 ZIP/镜像压缩包，不清理业务数据、旧镜像或回滚备份。

线上截图：[首页手机](design/smooth-galleries/production/home-mobile.jpg)、[首页桌面](design/smooth-galleries/production/home-desktop.jpg)、[详情手机](design/smooth-galleries/production/pdp-mobile.jpg)、[详情桌面](design/smooth-galleries/production/pdp-desktop.jpg)、[购物袋](design/smooth-galleries/production/bag-check.jpg)。
