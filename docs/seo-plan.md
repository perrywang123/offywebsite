# SEO：完成状态与后续工作

2026-10-31校准。原2026-10-19诊断已保存历史，不能把当时的“canonical全指首页/JSON-LD为0”当作当前现状。

## 已完成

- products、collections总览/详情、about、bag-charm已有独立metadata和self-canonical；FAQ、政策也有自身canonical。
- 首页有sr-only语义H1；Hero实时文字不等于可替代页面H1。
- Product/Offer、BreadcrumbList、Organization/WebSite、FAQPage已接入；金额/币种取同页product，JsonLd转义<。
- sitemap包含活跃语言、静态页、实时系列/商品、政策；robots屏蔽api/cart/checkout。

SEO第一二批截图对照见design/seo-batch1、seo-batch2，证明当时改动不影响可见布局；第二批像素比对使用过关闭Shopify的本地兜底目录，不是当前商品价格证明。

## 仍待实施

- Storefront查询没有seo字段，商品metadata仍采用title/description，后台促销语会进入搜索标题。
- 下游页面继承layout的部分OG/hreflang语义仍需逐项核对；未来恢复中文需要按页语言URL验证，不能只加语言开关。
- 部分品牌/页面描述仍本地维护；没有Search Console/Bing接入状态证据，不能宣称已提交/收录。
- 图片与LCP、链接焦点、政策故障可用性仍需实测。HSTS、www证书等属于生产基础设施，不能用本地仓库确认现状。

## 已实现的商品故障SEO边界

商业fallback已取消。不可用商品HTML为动态200+noindex，不输出未验证Product/Offer或数量；明确缺失才404。商品API和sitemap.xml上游失败503+no-store，sitemap不回本地或发布部分清单。购物袋/结算页面始终noindex。详见 [提案](../openspec/changes/archive/2026-10-31-shopify-authoritative-catalog/design.md)。

## 验收

检查HTML head、JSON-LD、真实状态码和各市场可见价格一致性；官方搜索工具的结果另记日期与证据。无构造评分/评价，不承诺FAQ富媒体一定展示。
