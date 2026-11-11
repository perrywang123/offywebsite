# About / OFFY Story 本地验收

2026-11-11。状态：设计、实现、测试及隔离本地预览已完成，待用户体验；**未发布生产，未操作线上服务器或 Shopify 配置**。

后续用户反馈手机文字排版零碎，已进一步调整手机对齐、字号和段落层级；以下首版尺寸描述与截图保留为历史，最新结果见[手机排版修订](typography-validation.md)。

## 预览

- [About Us](http://127.0.0.1:4317/about)
- [The Story of OFFY](http://127.0.0.1:4317/our-story)

About 的 EXPLORE OUR STORY 在当前标签进入故事页；顶部和末尾 Back to About 均返回品牌入口。保留原全站 About 入口、导航、购物袋及页脚。

## 设计与来源

产品、交互、美术 UI 三位专家分别审阅用户两份 PSD，随后审阅实现/截图。三者最终均无剩余阻断项。具体设计约定见 [DESIGN.md](DESIGN.md)。

- About 依次保留 Where She Came From、四段品牌宣言、OFFY / Gia 双图及黑色胶囊主操作；替换原页的长文、新 IP、定制内容。
- 故事保留黑白横幅、Creator、OFFY / Briar Island、四块手稿、三组自述和 Collection / IP 说明。两章同名是原稿内容，不改写主题；不把角色草图包装成可售商品。
- 直接提取 PSD 文字与原画；仅清理 CameFrom 空格、vdon't 的误字、排版断行，并用英文数字章节标点。逐段对照稿见 [source-copy.json](source-copy.json)，源文件摘要见 [sources.json](sources.json)。原始 PSD、完整原始照片及本地数据库不进入 Git。
- 38 个原始视觉资产共约 3.7 MB WebP，按需通过 Next Image 加载；拆出 25 个角色供手机名册重排。每张图的来源、尺寸和裁切坐标见 [assets.json](assets.json)。配对插画另移除外围白边，保留所有图形及 30px 净空；完整原图仍保留给 OG。
- 美术复审后放大配对插画的视觉分量，桌面 CTA 改为约 552×80px，手机 335×56px（375px 视口）；桌面宣言字重调为 400，手机继续保持 20–22px。没有为塞入首屏而压缩正文。

## 自动化与运行验证

先新增失败测试，证实旧页标题/配图/CTA 不符、新故事路由缺失、sitemap 未列故事；再最小实现。

- 新页相关 7 项测试覆盖完整源文段、章节顺序、两页结构、38 图中的原画分区、25 款名册、真实链接和独立 metadata / sitemap。
- 最终 `pnpm test --maxWorkers=4`：153 个文件、931 项通过。旧 About 专属断言按已获授权的新 PSD 替换，其他测试保留。
- `pnpm build` 通过，包含 ESLint 和 Next.js 类型检查；修改文件格式及 OpenSpec 验证通过。
- 38 张静态图片全部实际请求 200、可解码且与属性尺寸一致；抽样 banner / 肖像 / 角色的 Image Optimizer 均返回有效图片。两页实际 HTTP 200，canonical 分别指向自身。见 [local-http-checks.json](local-http-checks.json)。
- 本地运行拷贝在 `/tmp/offy-about-runtime/`，独立于 `.next`，避免再次构建清空活动预览素材。开发中曾发现该共用目录问题，最终运行目录隔离后，重新走完整图片验证；这不是生产变更。
- 预览读取 Shopify 真实商品/导航，不运行 KOL/Meta 跟踪或财务 worker；数据库仅使用已迁移的 `/tmp/offy-about-preview.db`。未创建测试订单、checkout 或交易数据。

## 浏览器验证

- 真实 standalone 两页各检查 320、375、390、768、1440、1920px，共 12 组：单一 h1、无横向溢出或正文裁切。见 [layout-checks.json](layout-checks.json)。
- 从最终编译页面提取 HTML/CSS 的独立文字压力页，320 / 375 / 768 / 1440px × 两页，200% 字号共 8 组通过。首次发现 320px 下 Collection 标题溢出，补上 flex 换行和可收缩文本后重测全部通过。见 [修正前](text-stress-before.json)、[修正后](text-stress-after.json)。这是字号压力验证，不冒充实际 iOS/微信或浏览器原生 200% 缩放。
- 逐段滚动完整故事：34 张正文图片（含 25 款角色）均完成实际加载；见 [图片检查](story-image-checks.json)。肖像、手稿和原型角色保持自然比例，About 左角色使用 contain，完整保留发髻、翅膀和脚。
- 从手机 Menu 使用 Tab，焦点正确到 CTA，`:focus-visible=true` 且 2px 轮廓；Enter 成功进入故事。顶部/末尾返回、浏览器后退、直接刷新故事均通过。
- 手机菜单打开/关闭、空购物袋加载后 Escape 关闭通过；数量前后均为 0，body 滚动恢复。见 [交互记录](interactions.json)。
- 新内容没有 Reveal 或依赖交叉阈值的隐藏态；CTA 的 reduced-motion 媒体规则关闭过渡。未修改系统偏好来模拟 OS 减弱动态。
- 浏览器有数条不可展开的 Object 控制台记录，其中一条明确来自 Chrome 扩展；未发现可读的 hydration 错误或功能失败。最终服务器无运行错误记录、全部图片请求成功。实际 Safari / 微信客户端未在本次环境验证。

## 截图

- About：[桌面最终](about-desktop-after.jpg)、[手机最终](about-mobile-after.jpg)、[手机 CTA / 键盘焦点](about-mobile-cta.jpg)。首版对照：[桌面](about-desktop-first.jpg)、[手机](about-mobile-first.jpg)。
- Story：[桌面首屏](story-desktop-after.jpg)、[桌面全页](story-desktop-full.jpg)、[手机首屏](story-mobile-after.jpg)、[手机全页](story-mobile-full.jpg)。
- Story 手机细节：[世界观](story-mobile-world.jpg)、[手稿](story-mobile-sketches.jpg)、[自述](story-mobile-reflections.jpg)、[原型](story-mobile-prototype.jpg)、[角色名册](story-mobile-collection.jpg)。
