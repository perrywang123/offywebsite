# Meta 订单追溯验收记录 · 2026-11-12

本轮目标：Shopify 官方独占 Meta 结账/购买上报，Offy 记录结账准备及可核对的订单证据；不发布广告、不付款、不修改线上商品/市场/订单。生产发布和真实广告验收分开记录。

## 变更与静态验证

先冻结并验证 `2026-11-12-meta-order-trace`，先观察失败测试再实现事件责任、旧队列停止、来源替换/过期、签名关联、退款/取消幂等、分页/退避、撤回和默认测试过滤。商品国家、币种、数量、Collabs 折扣及 return_url 与新增 attribute 同时保留。可选元数据异常被隔离，不阻断购买。

本地 `pnpm build` 已通过 lint、Next TypeScript、24页生成与 standalone traces。完整测试 `pnpm test --maxWorkers=1`：157文件/950项全绿；类型与lint通过。首次全并行与构建同时运行发生部署夹具超时，改为与CI一致的单worker后全绿，未放宽测试断言或超时。最终发布结果后续补记，不将进行中步骤记为通过。

## 隔离动态验收

`OFFY_TEST_META=true pnpm exec tsx scripts/kol-integration.ts`，仅4511/4512/4513端口、临时数据库与模拟 Shopify/Meta，无真实外部订单或付款。

- 模拟来源 campaign_id=900001、adset_id=900002、ad_id=900003（显式模拟值，无假 fbclid），浏览→商品→加购→结账准备→两笔模拟订单已关联。
- 立即购买为1件USD100，回跳 source=buy-now 后保留原购物袋5件；普通购物袋为6件USD600，回跳后清袋。首次回跳快照处于hydration之前，随后实际袋数验证；不能仅凭回跳页面标题判断。
- 模拟 `#TEST-1000` / `#TEST-1001` 被只读扫描为 PAID，各关联对应结账编号；不存在重复插入或用回跳推断付款。
- AddToCart Browser eventID 与 CAPI event_id 同为 `3db384f8-3a5f-4407-8088-303d2b4388cc`；模拟 CAPI 只收到加购，浏览器无 Offy InitiateCheckout/Purchase。
- 后台已显示模拟标识、来源ID、结账准备、CAPI状态和关联订单；按需展开，不把观察次数当最终转化率。

手机360/375、平板768、桌面1440/1920px均检查，页面宽度等于scrollWidth、无横向溢出；ID可换行。补了订单说明段落行距和中文财务状态。广告ID筛选999999显示无匹配，900003恢复链路。拒绝许可仍能加购；撤回后营销事件与关联订单均为0，再触发只读同步仍为0；模拟Pixel/CAPI加购各保持1次，没有拒绝后的新增发送。

## Meta 只读检查与真实归因边界

实际检查 Ads Manager 广告层级（14条广告记录）：可见未发布草稿及已关闭/已完成广告；活动视图中5条历史广告均显示 Completed。未发现可用于本轮真实点击成交验收的在投网站购买广告。未保存界面视图变更、未发布现有草稿、未改预算。

过去 Events Manager 已有 Shopify 官方 Purchase，不是“从未上报”。本轮解决不同 event ID 的双重结账责任，不能删除历史重复，也不能保证旧未刷新页面不再发送旧Pixel。CAPI接收、真实订单存在、Meta最终归因/去重是三个层级。

真实广告验收仍需投放负责人启用指向Offy、带动态ID的购买广告后，按获授权成交核对 Shopify 订单与 Meta 报表。模拟和无付款验证无法替代此项，不会为通过验收虚造购买事件或擅自下单。

## 发布状态

功能提交 `e87262801264d4a48b2dd163e7337cd819ade319` 已推送。GitHub CI及 Linux amd64 构建均成功，镜像原生SQLite迁移 smoke通过。构建产物由服务器直接下载，REVISION一致，压缩包 SHA256为 `9150ed755378337c577448aaec7076a82ebd8a39f11f2698422b50282e949792`。服务器已备份私密配置、容器信息和旧镜像标记；发布前主站与后台健康、无项目编译进程。随后补服务切换、订单只读查询及无付款购物验证。

## SOP

仓库已整理[简练版](meta-ads-sop.md)与[详细版](meta-ads-sop-detailed.md)。[飞书原图文SOP](https://my.feishu.cn/wiki/L0Ptw9zhHiVj7akJcG3cRwFenLy)已在原有截图前加入原生标题、五步简版、详细说明和投放checklist，旧IC CAPI说明明确标为历史；已看到云端保存并核对新目录与正文。未修改文档分享权限。

## 生产部署与部署后验证

2026-11-12 17:16主站、17:17后台分别经 `--prebuilt` 独立发布；服务器没有 Next 编译。两次替换前分别保存一致性SQLite备份，新增0014迁移成功；所有四个应用/worker运行revision均为 `e87262801264d4a48b2dd163e7337cd819ade319`，重启计数0。旧 Meta worker 在主站替换前停止，新worker复用新主站镜像启动。后台就绪检查首次等待心跳，随后 owner/worker/shop全部通过，HTTPS公私入口边界通过。原GeoIP服务未操作。

私密.env逐字比较未变，Nginx配置SHA256未变，数据库quick_check=ok。资源时点采样：主站约249.5MiB、后台200.3MiB、两个worker约18.5/16.4MiB，CPU约0–0.04%；不作为压测或长期SLA。

生产浏览器使用内部标签 `utm_source=offy_validation&utm_medium=internal_test&utm_campaign=meta_order_trace_20261112`，正常Shopify许可运行时，无模拟开关/测试码/假fbclid。DOTTY DARLING新增1件，实际增量USD45.90；原袋为DOTTY DARLING×1和LITTLE HEIRESS×1，结账共3件USD137.70。Shopify托管页显示US、正确商品数量和USD137.70小计；运费待填写地址后计算，未输入买家/地址/支付信息，未提交订单。返回后将DOTTY减回1件，原袋2件/USD91.80已恢复。

- 生产 AddToCart `eb4c085b-3a16-4983-9595-760b309c241d`，CAPI第1次发送成功，last_error=null。
- CheckoutReady /结账诊断 `5fea930c-df77-4a0e-8f12-a912cc42418b`，status=observed、pixel_attempted=0，无CAPI任务；结账状态redirect_ready、US、无错误。
- Shopify cart attribute同时包含 `return_url` 和 `offy_checkout_ref`；未改checkoutUrl。
- 订单只读扫描已成功，last_error=null、分页结束；未猜测/回填旧订单来源。没有实际付款，所以没有新关联订单是正确状态。
- 线上后台默认排除内部测试；勾选后能看到本站记录，展开同浏览器链路及对应Shopify结账状态。包含旧历史时明确显示截断，不将历史IC改名混入新的准备计数。

最后的真实广告互动成交与Meta最终归因/去重仍未执行：未发现可用在投网站购买广告，未发布广告/改预算或付款。需投放负责人使用新版动态参数开启对应广告后，安排获授权成交完成最后核对。目录国家价格及两件US限定商品未映射等先前事项仍按原目录验收边界处理，本轮未新增商品或发布范围。

手机生产后台另检查无横向溢出。飞书验收状态已补记实际发布、无付款结账及待真实广告验收边界，已确认“已经保存到云端”；未改变分享权限。临时模拟数据库不进入Git/镜像，生产内部验证记录有明确标签且默认隐藏；未删除真实客户记录。
