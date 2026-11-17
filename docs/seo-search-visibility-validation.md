# 搜索展示优化验收（第一、二批）

2026-11-17。范围见 [规范变更](../openspec/changes/search-visibility-batches-1-2/proposal.md)。本文件随执行更新；没有记录为通过的外部步骤不能视为完成。

## 本地

- Red：图标尺寸、Shopify SEO 查询/透传及页面 metadata 新断言均先失败；JSON-LD 实体关联断言先失败。
- Green：完整 Vitest 164 个文件、1,027 项通过；typecheck、ESLint 和 `pnpm build` 通过（Next 构建约 65 秒）。
- 实际 Storefront 只读查询：US 的 LITTLE HEIRESS / WILD SWEETIE 均为 USD 45.90，SEO title/description 为空；SWAN QUEEN 原有 USD 99.00，未改动。
- 本地生产服务 http://127.0.0.1:4319。/products 在 360×800、768×1024、1440×900、1920×1080 均无横向溢出，标题/摘要/OG/canonical 匹配同一路径；本地 origin 按开发 SITE_URL，生产另检。
- 图标为有效 96×96 PNG，来自本次用户附件；没有拉伸 Header 的横版 Logo。
- 本地 LITTLE HEIRESS 加购正常，购物袋显示实时 USD 45.90，Checkout 入口存在；随后移除，恢复 BAG(0)。未下单或付款。

截图和结构化记录：[验收目录](design/search-visibility-validation/)、[文案及图标确认稿](design/seo-phase1-preview/)。

## 线上基础设施

- `www` 证书已扩展到 isoffy.com / www.isoffy.com；有效期至 2027-02-15。
- Nginx 配置预检通过，专用 www vhost 已开启路径/参数原样 301 到裸域；原 app/admin/worker 不重启。
- 服务器备份：`.deploy-backups/www-redirect-20261117T090746Z`。早期预检发现新 ACME 目录不可读及 reload 异步，脚本已恢复配置后修正；最终预检和跳转通过。未关闭 SELinux、证书验证或其他安全保护。

## 发布与外部平台

- Git / CI / 外部镜像 / storefront 单独部署：待本轮完成后记录精确 revision。
- Search Console：用户已授权当前 Google 账号；待公开验证标记部署后验证并提交 sitemap。
- Merchant Center：当前账号无权限访问商家账户，用户明确暂缓；未注册、接 feed 或启用广告。
- Shopify 商品 SEO 示例写入：页面加载受阻，应用缺少商品编辑权限，等待可用的商品编辑页。代码只读接入已完成。
