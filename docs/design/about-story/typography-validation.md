# About / Story 手机文字排版修订

2026-11-11，按用户对手机端文字零碎的反馈调整。本记录为本地修订阶段；用户确认后的生产上线见[正式发布验收](../../about-story-production-validation.md)。

## 调整

此前 About 四段全部居中、同一字号，长句换行的左右边线不稳定。现在 <768px 使用 24px 边距、统一左对齐：标题 28–34px；前三段宣言 18px / 1.6；末段说明 16px / 1.75、灰色，段前 28px。保留原词句、顺序、双图和 CTA。

故事页手机正文统一为 16px / 1.75、段间 16px；导语 17px；章节标题 24–28px；作者标签 12px、辅助标题 14px。长引述改为正体，保留左侧细线，减少连续斜体阅读负担。桌面原居中 About 和故事双栏保持。

## 验证证据

- 只改 CSS；既有逐段源文、语义层级、图片数量、导航和 metadata 测试继续校验。没有编写镜像 CSS 声明的测试。
- `pnpm build` 通过，包括 lint 和 Next 类型检查。
- 首轮全量回归中，未改动的部署脚本数据库不匹配用例超时；随后独立复测该文件 38 项通过。未改部署代码或放宽测试超时。
- 最终 `pnpm test --maxWorkers=4`：153 个文件、931 项全部通过（83.73s）。
- 两页真实 standalone 在 320/375/390/768/1440px 共 10 组检查，无页面横向溢出或可见正文裁切；排除专用于读屏的 1px 隐藏 h1。见 [布局记录](type-layout-checks.json)。
- 以最终 SSR HTML/CSS 生成无应用脚本的本地字号压力页，在两页 × 320/375/768px 共 6 组检查正文/标题 200% 字号，无横向溢出。见 [压力结果](type-text-stress.json)。此项不是实际 iOS 或浏览器原生缩放。
- 手机实际点击 EXPLORE OUR STORY 进入 `/our-story`，顶部 Back to About 返回 `/about`。桌面 1440px 截图核对原构图保持。
- Chrome 仍有不可展开的 `Object` 控制台条目，与上一轮现象一致；无可读错误栈或链接失败。未据此宣称控制台完全无错，也未修改站点脚本。
- 最新隔离预览运行目录 `/tmp/offy-about-type-runtime/`，原地址保持 [About](http://127.0.0.1:4317/about) / [Story](http://127.0.0.1:4317/our-story)。关闭跟踪和财务功能，未发订单、未操作 Shopify、服务器或生产。

## 截图

- About：[修订前](about-type-before.jpg)、[375px 修订后](about-type-after-375.jpg)、[手机全页](about-type-full-375.jpg)、[桌面](about-type-desktop.jpg)。
- Story：[首屏修订前](story-type-before.jpg)、[首屏修订后](story-type-after-375.jpg)、[引用修订前](story-type-body-before.jpg)、[引用修订后](story-type-body-after.jpg)。
