# 当前测试与验收契约

基线：2026-10-31。最新代码/浏览器验收见 [实现验收](../shopify-authority-validation.md)；测试数是记录，不是功能完成目标。

## 已有层次

- lib纯函数：cart/price/geo/HTML描述/消毒/slug/邮箱/FAQ/JSON-LD/目录类型。
- Testing Library：Hero、News、未来IP、导航、Footer、gallery、sticky购买条、购物袋、quick view与页面内容/metadata。
- 服务：内存SQLite、订阅唯一性、订单幂等、三provider、Storefront映射、实时目录、健康检查与checkout API。
- src/mobile-rules.test.ts 扫描源码类名，防止部分窄屏字号/边距/命中区回退。

外部Shopify和支付调用在单测中mock；绿色不代表真实凭据或支付到账已通过。jsdom补IntersectionObserver/matchMedia/localStorage，不计算真实CSS布局。

## 现有工具

pnpm test/typecheck/lint/build；scripts/audit-mobile.mjs是既有Chrome/CDP审计脚本，不在当前pnpm test中执行。使用浏览器工具检查几何、滚动、断点、图片与键盘状态。旧check:catalog已随本地商品快照移除；正常商品事实通过Storefront读取和受控mock验证。

## 每次行为变更

按spec-first→Red→Green→Refactor；只为真实行为写测试，不测试文档文字或镜像实现。服务测试内存SQLite，首行node环境标记；外部请求有注入或mock，不创建真实订单。

## 本次覆盖

取消fallback已覆盖：成功空集/确认404/超时/鉴权/GraphQL错误/必需字段缺失；不能返回旧价或零价；三provider不建单；Cart保留记录和恢复；no-store与整页缓存；SEO不输出虚假Offer；首页局部降级。详见 [变更任务](../../openspec/changes/archive/2026-10-31-shopify-authoritative-catalog/tasks.md)。

KOL专项新增内存迁移数据库服务测试、隔离Shopify模拟器与独立端口、HTTP边界和业务工作流、真实浏览器操作/响应式证据。详见 [KOL验收](../kol-platform-validation.md)，不把模拟支付称为真实Shopify验收。
