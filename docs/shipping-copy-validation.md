# 运费文案更新与验收

日期：2026-11-09。来源为所有者提供的两页 `OFFY_三处运费文案调整说明.pdf`，其中 FAQ 采用随后在对话中确认的最终英文原文。

## 已实现的范围

1. Header 的运费轮播消息改为 `OFFY GOES GLOBAL · WORLDWIDE SHIPPING FROM $15 USD`；移除旧的固定运费国家列表和 MORE REGIONS COMING SOON。原赠品消息、轮播、颜色和响应式结构保持不变。
2. 已验证且非空的购物袋侧栏在 Subtotal 下方、Checkout 上方展示 `Worldwide shipping: $15 USD per order.` 和 `For US orders of 3+ OFFYs, shipping is $20 USD.`。第二句按所有者后续消息修订；提示以线性购物车图标、竖分隔线及两段说明组合展示。固定文案不随 IP、商品币种或数量切换，不向商品小计加入运费。
3. Shipping 新增默认折叠的 Q1 `How much does shipping cost?`，答案为以下三个独立段落：

   > We ship worldwide for $15 USD per order.
   >
   > For US deliveries only, shipping is $20 USD when you order 3 or more OFFYs.
   >
   > Shipping is charged once per order.

原 Shipping Q1–Q5 顺延为 Q2–Q6，其他两个部分保持不变，FAQ 与 FAQPage JSON-LD 均为 11 条。与 Git 改动前数据逐项比较，去除新增 Q1 后，原 10 条问题、答案段落及加粗片段完全一致。

## 验证记录

- OpenSpec `shipping-copy-notices` 在实现前校验通过。公告与购物袋测试先失败再实现；收到最终 FAQ 原文后补充其失败测试，再实现 FAQ 与结构化数据的期望。
- 检查 USD 1 件、USD 3 件、GBP 3 件的提示位置和小计，固定 USD 运费说明未改变商品币种或小计；空袋保留原展示。
- 本地浏览器使用真实 Shopify 只读商品数据，Meta、CAPI 与 Collabs 模式关闭。没有打开或提交 Shopify checkout，没有订单、付款或服务器配置写入。
- 1440×900、375×812、320×812 的页面与抽屉已检查。375px 和 320px 下页面/购物袋均无横向溢出，Checkout 为 48px 高且完整处于视口内。测试商品为 DOTTY DARLING；1 件小计 USD45.90，3 件小计 USD137.70，未加入运费；本地原购物袋为空，测试后恢复为空。
- FAQ 首次加载 11 项均折叠；Shipping Q1 展开后逐段核对原文、编号及 JSON-LD。桌面和手机截图保存在本机 `/Users/peiyuwang/.codex/artifacts/offy-shipping-copy-2026-11-09/`，不提交原始截图或构建产物。
- 最终 standalone 生产构建在本地 localhost:4314 启动后，再次确认 FAQ 默认折叠、最终三段原文、运费公告与购物袋提示；生产构建截图文件名含 `production`。这仍是本地验收，不是线上发布。
- 本地预览最初因绑定 127.0.0.1、内部 locale rewrite 使用 localhost 而循环跳转，统一使用 localhost 启动/访问后恢复；没有更改 middleware、路由或线上入口。

最终全量回归 `pnpm test --maxWorkers=1`：130 个测试文件、862 项测试通过。早期与构建同时运行的回归触发既有部署脚本 15 秒超时；降低并行、结束构建干扰后完整重跑通过，没有修改部署实现、断言或超时门槛。类型检查、针对性 ESLint、格式及 diff 空白检查通过。包含最终 FAQ 的 `pnpm build` 完整通过：全量 ESLint、Next.js 编译、内置类型检查、23 页生成和 standalone traces 成功。

## 发布和业务边界

此处记录代码与本地验收，不代表已部署生产。独立 `/cart` 页面未扩展。商品价格、库存、销售范围、实际 Shopify 运费配置、结账参数及支付逻辑未修改；`Worldwide` 不会自动开放新的配送国家。

PDF 给出的收费口径为美国 1–2 个付费 OFFY 收 USD15、3 个及以上收 USD20，其他支持配送地区每单 USD15，赠品不计入门槛。本次只落实展示文案，未核验 Shopify 后台的实际运费档位、赠品排除或当地币种折算，因此不能凭此文案验收认定这些规则已配置。最终 FAQ 按所有者消息原样录入，不额外加回 PDF 中已删去的 paid-item/gift 句子。

## 后续购物袋提示视觉调整

所有者随后确认购物袋第二句改为 `For US orders of 3+ OFFYs, shipping is $20 USD.`，并提供图标、竖分隔线和分组文案的参考图。实现沿用现有颜色、字号与 Checkout，增加装饰性线性购物车图标和竖线，适当强化 Subtotal，并用短段落均衡换行避免孤立的 USD 后缀；不增加新的依赖或运费计算。

已先观察新文案的 3 项失败，再实现并通过 25 项公告/购物袋相关测试；类型和针对性 lint 通过。浏览器检查 375×812、320×667、360×800、768×1024、1440×900、1920×1080，提示均无横向溢出，Checkout 保持 48px 高并处于视口内。375×667 下 4 行真实商品的列表可独立滚动，商品小计 USD240.70 未含运费；测试后移除本轮新增的 DOTTY DARLING、COLD KITTEN 和 WILD SWEETIE，保留用户原有 SWAN QUEEN 1 件及 USD99.00 小计，恢复原页面和视口。未进行结账、订单或生产上报操作。

两轮视觉检查修正了窄屏断行，最终截图和几何检查保存在本机 `/Users/peiyuwang/.codex/artifacts/offy-bag-shipping-design-2026-11-09/`。本轮全量回归 130 个测试文件、862 项测试通过；生产构建通过全量 ESLint、Next.js 编译、内置类型检查、23 页生成和 standalone traces。最终 standalone 在本地 localhost:4314 启动后，再次核对桌面与手机展示、SWAN QUEEN 1 件和 USD99.00 小计，保存 `production-desktop.jpg`、`production-shipping-footer.jpg` 与 `production-mobile-375.jpg`，并恢复原视口。代码随本轮 Conventional Commit 同步 Git；未部署生产。
