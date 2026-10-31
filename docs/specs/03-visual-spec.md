# 当前视觉系统

基线：2026-10-31。执行契约以 [根 DESIGN.md](../../DESIGN.md) 为准；具体 token 以 `src/app/globals.css` 为准。早期奶油/棕色命名仍在 token 名中，但当前值已经是黑白灰，不能按变量名字恢复旧色板。

## 颜色与版式

页面 #efefef，NEWS 同色；category/upcoming #f7f7f9；白色表面；墨色 #1d1915；细线 #e3e3e3。商品图片承担主视觉，不附加通用 dashboard 样式。

系统字体栈，无在线字体。英文系统栈优先 PingFang SC。主题 display/sans/mono 分工保留，金额用 tabular-nums。胶囊主按钮 48px；卡片使用现有 soft/card/block 圆角，避免到处添加新阴影层级。

## 响应式

手机 16px 横向边距，md 起 92%；section 基础48/md80/lg112px，可有明确的 lg 页面覆盖。商品 2/3/4列；NEWS 在 lg 才使用左大卡与右2×2。导航断点768px，触控规范扩展到1024px，不能混用。

手机标题与正文下限、点击区、safe-area 和横滑条应在真实浏览器测量，不能只看 Tailwind 类名。历史规范“一律36px H1”与当前 About 48px等存在差异，当前不做额外视觉统一。

## 图片与状态

商品图来自 Shopify CDN，next/image allowlist 已配置；品牌素材在 public/assets。缺图/请求失败不等于允许用另一个商品图替代。当前远程缩略图曾在本地超时，需独立验证外部图片链路。

Shopify 不可用状态采用 [已批准契约](../design/shopify-unavailable/DESIGN.md)：原字标、细线和留白，48px重试按钮，不用旧商品照片填充故障区域。
