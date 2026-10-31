# 实现范围核对清单

状态：2026-10-31 已执行。表中“当前可能的回退”保留为改造前问题，右列为已实现契约；源码和验收见当前文档。

状态：待实施，2026-10-31。这里只登记落点，不修改这些业务文件。

| 落点                                                     | 当前可能的回退/误判                          | 确认后要验证的变化                                        |
| -------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `server/catalog/live.ts` getLiveSeriesList               | 请求失败或单个远端Collection缺失时用本地名   | 显式不可用/不存在，不编造系列名                           |
| 同文件 getLiveProductsBySeries / getLiveNewLooksProducts | 回本地系列名单、顺序与价格                   | 成功、空集、失败分开，不返回本地商品                      |
| 同文件 getLiveMerchProducts                              | 失败变成空数组                               | 不把失败当“没有周边”或完整列表                            |
| 同文件 getLiveProductByCode                              | null/异常回本地，能把下架/失败当旧商品       | 只有成功明确null才404；失败503/展示态                     |
| 同文件 toLiveProduct / resolvePrice                      | 补本地名/图/价/币种/变体/featured/badge/尺寸 | 商业事实不本地覆盖；合法零价与缺失价格分开                |
| `server/catalog/enrich.ts`                               | 无生产调用，仍留整套本地富化回退             | 复核调用后删除/退役，不能成为绕过新契约的入口             |
| `server/shopify/catalog.ts`、products.ts                 | 缺字段默认空节点/0/USD/可售                  | 验证GraphQL响应与必需字段，不把异常映射成可买商品         |
| `server/catalog/regional.ts`                             | 部分探测失败仍可能推断限定                   | 数据不足时不作确定限定声明；复核探测缓存                  |
| `lib/catalog/products.ts`、index.ts                      | 商品快照与未来IP/联名/包挂内容混放           | 去掉商业快照依赖，保留有用途的品牌/技术配置，不整文件误删 |
| 三个 payment provider                                    | 共同resolver仍可能用本地旧价/变体            | 失败不创建Cart/Stripe Session/PayPal Order；保留USD限制   |
| `/api/products`、`/api/products/[code]`                  | fallback结果被当成功商品                     | 200成功空集、404确认不存在、503不可用；no-store           |
| CartProvider / Drawer / cart / checkout                  | 数据保留但可能渲染空袋、旧小计               | 独立状态、重试、按事件复核；未验证不显示商业事实/Checkout |
| useCheckoutRedirect                                      | 网络/5xx转同样依赖Shopify的备用页            | 商品验证失败时原地保留记录并提供重试                      |
| 首页 / 列表 / 系列 / PDP / ProductCard                   | 部分静态产品绑定、本地图/名字可渲染          | 故障只影响对应模块；无旧商品替代，无假数量                |
| metadata / JSON-LD / sitemap                             | 缓存和fallback可输出旧Offer或本地URL         | 不可用noindex/无Offer，sitemap失败不发布部分清单          |
| instrumentation / health / 文档                          | 当前告警说明“回本地兜底”                     | 实现后同步提示、日志和当前状态，不能提前宣称已完成        |
| check-catalog-drift脚本                                  | 专门比较旧表且有过时提示                     | 快照退役后相应退役工具，保留有用的独立健康检查            |

跨切面：Next fetch缓存、整页ISR、客户端缓存必须一起检查。只有请求级新鲜读取+去重，且未发生隐式stale-on-error，才能声称失败不展示旧价。任何库存/价格验证都不替代Shopify托管结账最终计算。
