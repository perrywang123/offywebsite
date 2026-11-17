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

本地验证通过，待 Git 推送、外部 Linux 镜像构建及独立主站发布后补充线上证据。后台、worker、Nginx 和私密环境配置保持现状；保留当前镜像及一致性数据库备份以便回滚。
