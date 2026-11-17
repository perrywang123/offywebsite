# OFFY SEO 第一批确认稿

状态：2026-11-17，等待用户确认图标和文案；未实现网站行为，未发布生产。

本地预览：<http://127.0.0.1:4318/>。服务器仅监听回环地址。

需要重新打开时，在项目根目录执行：

```bash
python3 -m http.server 4318 --bind 127.0.0.1 --directory docs/design/seo-phase1-preview
```

## 内容

- 图标 A：OFFY 头像，参考实际品牌角色与官方插画，简化卷发、眼镜和睡眼表情。
- 图标 B：紧凑字标，将 is. 与 offy 放入更紧凑的上下构图。它是概念稿，不是已批准的新商标。
- 13 个页面/模板示例：首页、全部商品、系列总览、三个系列、About、故事、包挂预告、FAQ、两个普通商品和 SWAN QUEEN 赠品。
- 点击图标可联动搜索预览；支持页面下拉、桌面/手机宽度、当前线上 metadata 对照、全部文案清单。
- 完整建议与线上基线：[copy-preview.json](copy-preview.json)。当前文案来自当日公开 HTML，不等同 Google 实际摘要。

## 确认事项

1. 选 A 或 B，或反馈需要调整的形象/字标细节。
2. 确认英文搜索标题、摘要；网站现有可见商品名和正文保持不变。
3. SWAN QUEEN 赠品单独确认；预告页维持预告含义，不改售卖条件。

确认后再创建实现阶段 OpenSpec、补失败测试、接入经确认的图标/metadata/Shopify SEO 字段。www 证书、Search Console 的执行也留待确认后的阶段；本轮没有访问或修改相关账号配置。

## 验证记录

- `node --check`：preview.js、preview-data.js 均通过。
- HtmlDesign 静态审计：HTML 语言、标题、viewport、唯一 main/H1、图片 alt 通过；外置 CSS 的变量/焦点样式须人工核对。
- Chrome 360×800、768×1024、1440×900、1920×1080 均未产生页面横向溢出；另保存 390×900 手机截图。
- 所有图标资源加载成功，实际 16/24/32px 对比；A/B 选择与结果图标一致。
- 页面选择验证了普通商品、赠品和预告三种边界，当前/建议标题正确区分；完整清单为 13 项。
- 下拉框 Tab 后聚焦“桌面预览”，`:focus-visible` 为 true，outline 为 solid。
- 复制按钮具备失败提示；为保留用户当前系统剪贴板，本轮未点击执行复制。
- 浏览器报告扩展通信、语言检测和不透明 Object 日志；预览代码不调用扩展通信或语言检测。未调整用户扩展，页面交互正常。
- 两轮视觉修正：缩短手机图标标签，减少介绍留白，取消预览页锚点滚动动画以便准确定位；临时视口覆盖已复原。
- 没有改动 src/、public/、Shopify、服务器配置、购物袋、结账、支付或归因；没有创建购物/支付测试数据。

截图：[图标对比](desktop-icons.jpg)、[首页 A](desktop-home-a.jpg)、[首页 B](desktop-home-b.jpg)、[手机图标](mobile-icons.jpg)、[手机首页](mobile-home-a.jpg)、[完整页面](desktop-overview.jpg)。图标生成方式、提示词与参考素材见 [image-generation.json](image-generation.json)。

## 2026-11-17 后续决定

用户已确认主页面文案，随后提供完整黑白 OFFY Logo 替代原 A。当前预览默认展示该原图；原 A/B 图片和旧截图只作历史对照。实现状态见 [SEO 当前说明](../../seo-plan.md) 与 [验收记录](../../seo-search-visibility-validation.md)。商品示例不作为本地商品事实写入运行时，仍须在 Shopify 保存 SEO；SWAN QUEEN 不更改售卖规则。
