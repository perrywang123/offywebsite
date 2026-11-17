# 手机滑动松手吸附修复

2026-11-17。仅修复 Hero 与商品详情图共用的手势事件归属，不改变布局、商品、购物袋、结账、支付或归因逻辑。

## 原因和修复

旧逻辑使用 Touch Events 处理手指，Pointer Events 处理鼠标/笔，但 `lostpointercapture` 不区分归属，直接取消当前手势。Chrome iPhone 16 触摸模拟实际生成 `pointerup → lostpointercapture → touchend`；捕获释放先取消了手势，后续 touchend 已没有距离/速度记录可计算目标。问题并非拖动距离不足。见 [原生事件记录](design/touch-settling/native-event-order.txt) 和可复验的 [事件探针](design/touch-settling/event-probe.html)。此前鼠标浏览器验收没有覆盖这条组合事件流。

现在鼠标/笔的取消与捕获释放仅能处理所属 pointerId；触摸保留至自身 touchend/touchcancel，再按既有距离和最近速度吸附。未扩大阈值、延迟或跳过取消保护。

## 验证

- Red：先添加 5 项回归，旧实现 5 失败、46 通过；实现后相关 51 项全部通过。覆盖两处组件、慢速长拖、快速短扫、连续手势、无关指针与捕获释放顺序。
- 全量 163 个文件、1013 项测试通过；独立 typecheck 和含 ESLint/类型检查的生产构建通过。未修改测试超时或关闭检查。
- 旧线上版本在 Chrome iPhone 16 触摸模拟中复现：拖动后仍停留原索引，见 [修复前采样](design/touch-settling/before-touch.json)。
- 同一触摸模拟、本机修复版本：首页连续三次滑动依次到索引 1、2、3，393px 视口位移精确为 -393、-786、-1179px，见 [首页采样](design/touch-settling/local-home-touch.json)。
- 详情图：正向到索引 3、反向回 2、短拖保持 2；345px 图区位移分别为 -1035、-690、-690px，见 [详情采样](design/touch-settling/local-pdp-touch.json)。
- 桌面 1489px 视口，鼠标拖动从索引 2 到 3，位移为三倍图宽，见 [桌面采样](design/touch-settling/local-desktop.json)。
- 浏览器使用原生输入触发实际触摸流；不是手动 dispatchEvent。它仍是 Chrome 设备模拟，不等同实体 iPhone/Instagram 验收。纵滚、多指、取消由既有事件测试覆盖；本机一次纵向模拟未产生滚动，不将其记为动态通过。

截图：[首页](design/touch-settling/local-home.jpg)、[详情图](design/touch-settling/local-pdp.jpg)。

## 发布状态

2026-11-17 上海时间 15:21 已完成独立主站发布。运行源码为 `6168d358c2e8dfe3a01559655ca044cc064901a9`，镜像为 `sha256:2d6889d6278e2f54280cf99a8f6419fe78b9f48735ae6e046ebfc7090be01d60`。[质量 CI](https://github.com/perrywang123/offywebsite/actions/runs/44037165919) 与 [Linux 镜像 CI](https://github.com/perrywang123/offywebsite/actions/runs/44037166061) 均成功。

服务器从原 Git checkout fast-forward 拉取，校验 Git revision、制品 ZIP 校验和、镜像压缩包校验和、Linux amd64 架构和镜像 OCI revision 后，以 `bash deploy/update-storefront.sh --kol --prebuilt --skip-pull` 仅替换 app。生产没有编译；制品的 admin 标签导入后恢复为原镜像。见 [发布对照](design/touch-settling/production/deployment.json)：后台、KOL worker、Meta worker、GeoIP 的容器 ID/镜像/启动时间保持；主站环境哈希、数据挂载、3000 绑定、私密 .env 和 Nginx 均保持。

上线后用同一 Chrome iPhone 16 原生触摸模拟重新验收：首页 393px 视口从索引 0→1、2→3，精确吸附为 -393、-1179px，期间自动轮播仍可运作；详情图从 0→1→2，345px 图区精确吸附为 -345、-690px。两张优化图片加载正常，Add to Bag / Buy Now 可用。桌面 1489px 从 0→1，位移约 -705.016px，等于一张图片宽度；两种视口无页面横向溢出。见 [首页采样](design/touch-settling/production/home-touch.json)、[详情采样](design/touch-settling/production/pdp-touch.json)、[桌面采样](design/touch-settling/production/desktop.json)。浏览器设备模拟已关闭，本次验收标签已关闭。

线上购物袋原为空袋，加入 LITTLE HEIRESS 一件后显示 USD 45.90、Checkout 可用，再移除本次新增商品恢复空袋。使用 `offy_validation / internal_test` 来源标记；没有点击 Checkout 或 Buy Now，没有创建订单或执行付款。见 [购物回归](design/touch-settling/production/shopping.json)。购物与支付实现未修改；本次不冒称完成新的支付到账测试。

主站及后台 healthy；首页、详情、health、8443 后台入口均为 200，主站 /admin 仍为 404。只读 SQLite quick_check=ok，迁移数仍为 16。

回滚镜像 `offy-app:before-touch-settling-20261117` 和一致性数据库备份 `/data/deploy-backups/offy-2026-11-17T07-21-24-808Z-d0541502.db` 已保留。服务器 `.deploy-backups/touch-settling-20261117/` 保留前后对照、发布日志及校验文件；仅清理本轮临时下载 ZIP/镜像压缩包。

线上截图：[首页手机](design/touch-settling/production/home-mobile.jpg)、[详情手机](design/touch-settling/production/pdp-mobile.jpg)、[详情桌面](design/touch-settling/production/pdp-desktop.jpg)、[购物袋](design/touch-settling/production/bag-check.jpg)。
