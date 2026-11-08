# 现有 Meta 目录映射上线验收

日期：2026-11-09（Asia/Shanghai）。本次仅启用现有配置，不新增或发布 Shopify / Meta 商品，不创建目录，不更改 Shopify 市场、商品价格、库存、支付设置或订单，也不发布广告。

## 已核对的范围

现有 Meta 目录 `1430885911973275` 共41个商品；四国 Shopify Storefront 分别返回美国42件、英国41件、新加坡41件、香港41件，均为单变体且分页完整。按真实 `gid://shopify/ProductVariant/…` 与已观察的 Meta Content ID 精确比对，目录中41个ID均唯一对应，记录于 `config/meta-catalog-ids.json`。美国有40件对应现有目录；`cold-kitten`、`lemon-fizz` 两件美国商品不在当前 Meta 目录，未加入映射或新发布。

DOTTY DARLING（`black-pearl`）Content ID 为 `53547250549025`。同一商品实时市场价格为 USD45.90、GBP33.90、SGD55.90、HKD369.00。以上价格为本轮核对证据，未写入应用商业回退或配置文件。

## 静态与隔离验证

- OpenSpec：`meta-existing-catalog-activation` 校验通过；纯配置与部署工具变更，未更改应用行为规范。
- TDD：先验证缺失命令导致正向用例失败，再实现配置命令；验证只改 `META_CATALOG_IDS`、私密备份/600权限、check-only不写入、重复/空/不合法映射拒绝及不输出测试凭据。
- 相关测试13项通过；全量129个测试文件、855项测试通过。首次默认并行运行有两项既有部署测试超过5秒，以 `pnpm test --maxWorkers=2` 完整重跑通过，没有放宽断言或修改超时门槛。
- 类型检查、相关ESLint、Prettier和 `git diff --check` 通过。未改应用源码，不需要重新构建 Next.js 镜像。
- 配置候选容器使用当前既有镜像，只读挂载生产数据，GET健康检查及四国商品页渲染通过，确认映射41项与相应币种；候选容器随后删除。候选检查不等同于全部地区的真实访客/许可验收。

## 生产配置与稳定性

工具及映射已先提交并推送 Git，服务器快进获取。`configure-meta-catalog.py` 私密备份原 `.env`，逐行比较确认非映射配置未改变。额外私密备份、原容器信息和 Nginx 哈希保存在服务器 `.deploy-backups/meta-catalog-20261109/`；共享数据库有一致性备份。

原 `.env` 不直接保存运行时自动准备的 KOL 开关/认证值。重载前按现有容器与服务器私密认证文件核对并保留这些值，解析后确认 app/admin 的环境相比原容器只有 `META_CATALOG_IDS` 变化。首次保护性检查因发现这些运行期差异而停止，未替换服务；保留既有认证后检查通过。不能用缺少这一步的裸 Compose 命令复制本次操作。

app/admin 均保留运行镜像 `sha256:a56c57544c70db2999dd3e81d041acfcdf04abc93c720fe9a4aea2d2972df30c`，应用源码 revision 仍为 `a91c50452a8aa3f91aacbfb598ad6e88721ed679`；Git的新提交为部署工具/公开ID配置/文档，不冒充新应用镜像。逐个无构建重载后，两端映射41项、健康检查通过，重启计数0；原 KOL / Meta workers 未替换，KOL owner/worker/shop就绪检查通过，Nginx哈希不变，SQLite完整性检查为ok。

资源时点采样：主站约392MiB、后台约177MiB、Meta worker约29MiB、KOL worker约33MiB，可用内存约2.2GiB。未在生产编译，不宣称零停机或长期性能SLA。

## 美国真实页面交互

生产Chrome使用 `utm_source=offy_validation`、`utm_medium=internal_test`、`utm_campaign=meta_catalog_20261109`。没有伪造广告点击标识、全局测试码或许可状态。

| 检查             | 证据                                                                               | 结果                                              |
| ---------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| ViewContent      | `feb39d4a-4e8d-4235-a727-0add1b5e200a`；真实Content ID、USD45.90、1件              | 本地记录成功，已调用Pixel；平台浏览器处理另行核对 |
| AddToCart        | `e2d3cde1-7261-42a5-aef4-0fd079bd60e1`；Content ID `53547250549025`、USD45.90、1件 | `sent`，首次发送，无错误                          |
| InitiateCheckout | `e74eb62b-9aae-4af2-b4aa-aef75f5eaa7d`；同一Content ID、USD91.80、2件              | `sent`，首次发送，无错误                          |
| 结账诊断         | `0a9cd230-7e53-4d0d-9bac-7df1a8854697`                                             | `redirect_ready`；IP判定US                        |
| Shopify托管结账  | 美国国家选项、DOTTY DARLING 2件、总额USD91.80，正常展示联系/配送/支付表单          | 未填写买家/支付资料，未提交订单                   |
| 状态还原         | 原有DOTTY DARLING 1件；只增加1件测试，返回后减回1件                                | 购物袋恢复，无商品或订单变更                      |

CAPI `sent` 表示平台接收回执成功；不表示真实广告归因或最终去重。浏览器出现过一次Meta SDK币种格式警告，但本轮保存的实际商品载荷和CAPI金额/币种均为合法USD；没有据此修改核心链路或宣称所有SDK自动事件都已验收。Meta Test Events未用于把本轮正式CAPI回执冒记为测试页中的Server事件。

## Meta平台已保存的配置

- 现有Shopify数据源增加 `link` Find and Replace：`https://ujc6x6-41.myshopify.com/products/` → `https://isoffy.com/products/`，保留其余路径和参数；已Create并Apply。Meta提示下一次完整自动同步后反映；随后的样例详情仍显示旧链接，实际字段生效待下一次同步核对。
- 目录默认地区从Hong Kong改为United States of America，语言保持English，页面已确认保存。只改变Meta默认地区，不改变Shopify市场或实际商品价格。
- 原商品数41，数据集关联仍为 `1120625754196383`。未开启/关闭商品发布或自动同步规则，未新增目录。

## 尚不能记为完成

美国优先；四国目录价格覆盖仍待明确确认和实际验收。默认美国地区不会自动产生正确的USD地区商品价格。现有基础目录仍显示SGD，不能将本次41条映射上线写成四国动态商品广告全部可用。

继续核查国家覆盖的入口需要临时调整Meta的“添加商品时跳转Shopify”提示；已向所有者明确说明只允许覆盖现有41个ID，不新增商品，不改变Shopify原价/库存/销售范围。未收到同意前不改变该入口，也不导入新数据源。美国的两件缺项继续保持不发布。

普通图片/视频网站购买广告可使用明确的 `https://isoffy.com/products/...` 落地页；动态目录选品应在地区价格、实际链接和平台新事件匹配核对后另行启用。真实广告点击到Purchase归因、最终去重、其他地区的完整生产许可体验，仍需按SOP授权验证；本轮没有发布广告或付款。

飞书 [图文SOP](https://my.feishu.cn/wiki/L0Ptw9zhHiVj7akJcG3cRwFenLy) 已校正上线状态，并增加后台回执、现有商品链接规则、美国默认地区三张截图。历史图片明确标为上线前状态，不以旧截图中的0项覆盖当前41项配置。
