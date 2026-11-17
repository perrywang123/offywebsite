## Specification and tests

- [x] 验证规范；为新图标、页面 metadata、Shopify SEO 空值及透传先写失败测试。

## Implementation

- [x] 用户黑白 Logo、96px favicon 与搜索文案。
- [x] 商品/系列 Shopify SEO 查询、DAL 与页面接入。
- [x] 可购买包挂入口、实体关联、摘要排除属性。

## Verification and operations

- [x] 定向测试、完整测试、lint/typecheck/build、手机与桌面浏览器验收。
- [x] www TLS/永久跳转检查与安全修复。
- [x] Search Console 已验证、sitemap 成功（58 个已发现网页）；Merchant Center 账户检查完成，用户明确暂缓配置。
- [x] 提交推送、外部构建、独立站预构建部署、生产验收与回滚证据。
- [x] 更新当前文档与后续工作，按实际完成范围归档。

## Explicit remaining external work

Merchant Center 按用户要求不配置。两个普通商品的 SEO 示例尚未写入 Shopify：浏览器骨架屏且 Admin 权限仅 read_orders/read_discounts；继续保留当前 Shopify 文本，等待商品编辑页可用，不申请新权限。SWAN QUEEN 赠品销售/Offer 规则不在本次修改范围。
