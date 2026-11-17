# SEO：当前实现与后续工作

更新：2026-11-17。本轮按用户确认的第一、二批范围实施；Merchant Center 用户已明确暂缓，不能视为已开通。生产发布证据记录在 [本轮验收](seo-search-visibility-validation.md)。

首页、商品列表、三个系列、About、故事、FAQ 和新品预告现在使用经确认的搜索文案；各页有自己的 canonical、英文 alternate 和 OG 标题/摘要/URL。站内商品名称、价格、图片、市场和结账逻辑不随搜索文案更改。新搜索图标采用用户提供的完整黑白 OFFY Logo，等比生成 96×96 PNG，Header 横版 Logo 保持原样。

商品页和系列查询增加 Shopify `seo { title description }`。商品 metadata 分别优先采用非空 SEO 字段，空值使用当前 Shopify 商品名/描述；系列空值采用已确认的品牌系列文案。商品的 SEO 标题不会替换页面可见名称或 JSON-LD 商品事实，不对贴纸、赠品、包袋统一加“Plush Bag Charm”。LITTLE HEIRESS、WILD SWEETIE 的预览示例需实际保存到 Shopify SEO 后才生效；检查时两款 SEO 均为空，当前 Admin 应用没有商品编辑权限，浏览器商品页停在加载骨架。不会为此擅自扩大应用权限。

可购买包挂搜索意图由现有 `/products` 承接：标题和简介明确品类，商品仍来自当前市场的完整 Shopify 清单；三个系列、成员、顺序、商品卡和购买按钮保持。`/bag-charm` 仍是 upcoming 新品预告，不当成已上架商品页面。

Product 增加稳定 URL/@id 和卖家实体关联，WebSite/Organization 增加名称别名和发布者关系。价格、币种、库存继续来自页面同一份实时商品；没有编造评分、GTIN、退货条件或运费。页脚版权/菜单所在 div 使用 `data-nosnippet`，正文仍可供搜索引擎理解。

## 基础设施与 Google

`www.isoffy.com` 先前证书仅覆盖裸域；本轮独立扩展证书并设置保留 path/query 的 301 到 `https://isoffy.com`。操作脚本 [ensure-www-redirect.sh](../deploy/ensure-www-redirect.sh) 仅修改专用 www vhost、签发/续签证书和 reload Nginx，不构建、重启应用或修改 Shopify 域名/DNS。先备份，预检失败恢复旧 www 配置；证书已签发后保留同时覆盖裸域与 www 的有效证书。

Search Console 采用用户明确授权的当前 Google 账号验证 `https://isoffy.com/`，公开验证标记进入 HTML head；本轮已完成所有权验证，sitemap 显示“成功”，发现 58 个网页；这不等于 58 页都已收录。首页已确认收录，并已成功请求重新抓取一次。Google 自行决定何时抓取，以及是否使用提交的图标、标题和摘要，不能承诺立即替换或提升排名。

Merchant Center 当前账号无可访问商家账户。用户选择稍后配置，本轮没有创建账户、feed、广告或商品。后续需核对真实商家国家、站点认领、美国价格/落地币种、配送/退货、赠品与区域商品资格；Headless 域名不能直接假设官方 Shopify 渠道会给出 isoffy.com 落地地址。先核对实际导出链接再选择官方同步或独立 feed。

## 仍需处理

- 将已确认的两个普通商品示例 SEO 文案保存到 Shopify；其余商品由运营逐步维护。
- SWAN QUEEN 等赠品的搜索展示：目前通用 Product/Offer 仍按 Shopify 当前可见价输出，不把占位价擅自改为零、不改购买条件。启用 Merchant Center 前应明确赠品排除/标记规则，经用户确认后处理。
- Merchant Center 免费商品展示按用户决定暂缓。
- Core Web Vitals、LCP 图片、长尾内容和外链属于后续性能/内容批次，本轮未给出测量分数或排名承诺。

## 持续护栏

Shopify 故障仍显示品牌化重试并 noindex，不能回退旧商品/旧价。商品 API 和 sitemap 上游失败继续 503 + no-store，明确缺失才 404；cart/checkout 不索引。测试与截图不能替代 Google 收录或 Merchant 审核证明。

官方依据：[favicon](https://developers.google.com/search/docs/appearance/favicon-in-search)、[Shopify SEO 字段](https://shopify.dev/docs/api/storefront/latest/objects/SEO)、[商品结构化数据](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)、[摘要排除](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)、[Google & YouTube 渠道](https://help.shopify.com/en/manual/online-sales-channels/marketplaces/google/getting-setup/connect)。
