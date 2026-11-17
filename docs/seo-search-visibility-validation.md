# 搜索展示优化验收（第一、二批）

2026-11-17。范围见 [规范变更](../openspec/changes/archive/2026-11-17-search-visibility-batches-1-2/proposal.md)。本文件随执行更新；没有记录为通过的外部步骤不能视为完成。

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

- 运行时代码 / OCI revision：`e88a5cc3293efdf38a6b05fe83b2d49196c4e441`。CI [44054114025](https://github.com/perrywang123/offywebsite/actions/runs/44054114025) 与镜像 [44054115655](https://github.com/perrywang123/offywebsite/actions/runs/44054115655) 均 success；只在 GitHub 构建，生产未编译。
- 镜像 `sha256:7684c6609a7c956b26304c9a053a77d417acd1a9dde3c47eecd7c08d559f32e9`；artifact ZIP 与 tar SHA256 均校验通过。
- 主站容器 healthy，环境哈希/卷/端口保持；admin、KOL worker、Meta worker、GeoIP 容器 ID/镜像/启动时间不变，admin 镜像标签已恢复。`.env` 未改；本次 app 发布期间 Nginx 没有再次改变。
- 线上首页/商品页/health/8443 后台均 200；公网主站 `/admin` 仍 404。12 个主要页面 title/description/OG/self-canonical/英文 alternate/页脚摘要排除通过，favicon 为 96×96 PNG，sitemap 200，包含 58 个 URL。
- 手机 390px：首页、列表、详情无横向溢出；桌面 1440px 列表和商品页正常。LITTLE HEIRESS 显示 USD 45.90，结构化 Offer 同为 USD 45.90，Add to Bag / Buy Now 可用。没有在生产下单、付款或改动购物袋。
- 另外，本地正确 origin 的浏览器实测 GBP：LITTLE HEIRESS 可见 £33.90，Offer 为 33.90 GBP。最初自定义端口与 SITE_URL 不同导致的本地 origin 校验问题通过启动参数修正，未修改市场代码。
- Search Console：当前 Google 账号已完成 HTML 标记所有权验证；`sitemap.xml` 已提交并显示“成功 / 已发现网页 58”。这代表站点地图读取成功，不代表 58 页均已收录；概览仍提示初始数据处理中。首页既有索引已确认，并已成功提交一次重新编入索引请求；页面显示已加入优先抓取队列，没有重复提交。
- Merchant Center：当前账号无权限访问商家账户，用户明确暂缓；未注册、接 feed 或启用广告。
- Shopify 商品 SEO 示例写入：页面加载受阻，应用缺少商品编辑权限，等待可用的商品编辑页。代码只读接入已完成。
