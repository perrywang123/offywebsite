# Shopify 不可用时的展示方案

状态：**2026-10-31 已获用户确认并实现**。本文件和 [HTML 预览](design/shopify-unavailable/index.html) 保留为批准设计依据；实际验收见 [实现记录](shopify-authority-validation.md)。

## 核心决定

取不到可信商品数据时不展示本地商品、旧名称、旧价、0 元小计或假售罄。保留可独立提供的品牌内容和购物袋 code/quantity。用户看到清晰的短暂停顿与可执行的下一步。

品牌故事、FAQ、静态联系信息、品牌主张和设计资产不是商品事实，不在此轮迁为 Shopify CMS。系列名称、成员、商品描述/图/价格/币种/库存/SKU/变体都属于本轮权威化范围。

## 页面展示

| 场景           | 用户看到                                        | 操作/保留项                                                      |
| -------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| 列表/系列失败  | All Looks + “A little pause.”；说明暂时无法加载 | Try again、Our story、Contact us；隐藏数量、卡片和无来源的系列名 |
| 详情失败       | “This look is taking a moment.”；通用说明       | Try again、All looks；不显示旧名字/图/价/加购                    |
| 购物袋失败     | “Your bag is safe.”；已选记录保留在此设备       | Try again、继续了解品牌；不显示小计和 Checkout                   |
| 购物袋抽屉失败 | 相同语义，紧凑排版与明确关闭入口                | 88%手机宽/448px桌面上限，关闭/遮罩/Escape                        |
| 首页局部失败   | 品牌 Hero 仍在；商品模块合并成一处恢复提示      | 重试商品区；故事、订阅、联系等独立模块不受阻                     |

成功空集合使用真实空态，不用故障面板。确认不存在的商品返回 404，提供 All Looks；售罄保留真实商品信息并禁用购买。这三种状态不能因一次请求失败而推断出来。

## 文案与视觉

使用主站黑白灰与手写字标，不加红色报错大屏、工程术语或假的修复倒计时。主操作统一 Try again。英文为顾客界面，中文仅用于预览审阅工具。

列表正文：`We can’t load the collection right now. Please try again in a moment.`

详情正文：`We can’t load this look right now. Please try again, or explore the world of OFFY while you wait.`

购物袋正文：`We can’t refresh your items right now. Your saved items are kept on this device.`

重试失败：`We’re still having trouble loading the shop. Please try again shortly.` 不声称订单、支付或网络已经恢复。

## 重试与恢复

手动重试期间按钮显示 Trying again…，防重复点击，保留原面板以免布局跳动。失败后按钮恢复，结果由 aria-live 宣读；不循环自动重试。成功后只恢复本次已验证的内容。局部推荐失败不能覆盖已验证的主商品。

购物袋记录不会因为超时、鉴权或 5xx 被删除；恢复前不显示未确认商品事实，确认 404 才清理失效项。Checkout 前再次做 Shopify 权威验证。失败时不转去另一个同样依赖 Shopify 的页假装可以完成付款。

## 已实现的工程边界

- 明确区分成功、成功空集、确认 404、503；不得用 catch→本地数组/undefined/零价代替。
- 商业读取使用 no-store + 请求级去重；要同时取消整页 ISR/数据缓存的旧价回退，不是只删 products.ts。
- 商品 API 失败 503 + no-store；HTML 故障态首版动态 200 + noindex，不输出 Product Offer。若需要 HTML 503，另做真实响应集成验证。
- 配置缺失和无效凭据同样进入不可用；区域探测失败隐藏不确定推断。
- sitemap 不得因失败改用本地名册，也不能发布部分商品的“完整清单”。
- 三个支付 provider、公开 API、metadata、首页商品绑定的 NEWS 卡片都纳入回退清理。

完整工程与测试任务见 [OpenSpec](../openspec/changes/archive/2026-10-31-shopify-authoritative-catalog/tasks.md)。本轮不改 `src/` 或真实支付行为。

## 预览使用

打开 HTML 后切换五种场景及桌面/手机；“模拟恢复成功”只控制重试演示，不请求真实数据。品牌/支持链接指向现有公开站点。页面内无价格、虚构商品或外部字体。

验收记录见 [预览说明](design/shopify-unavailable/README.md)。确认内容包括场景处理、英文文案、视觉密度和重试/购物袋呈现；用户确认后已按 TDD 实现。
