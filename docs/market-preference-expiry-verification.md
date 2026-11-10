# 自动国家推荐有效期验收（2026-11-10）

变更 `expire-automatic-market` 为自动推荐增加固定 30 分钟有效期；手动选择仍为 90 天。信号优先级、Shopify 商品与结账国家规则不变。

## 实现与自动化

- 自动 Cookie 保存服务器 `resolvedAt`，Max-Age 为 1800 秒；服务器独立验证时间，过期、未来时间、非法时间及旧版无时间戳的自动结果不再复用。旧版手动 Cookie 兼容。
- 读取和重复 resolve 不刷新生成时间、不重设 Cookie。页面导航、查询变化及返回前台检查上下文；无空闲定时刷新，打开的选择弹层优先，网络失败/禁用 Cookie 不产生刷新循环。
- 购物袋目录请求带显示国家；国家不一致时 list/detail 在调用 Shopify 前返回 409，保留商品和数量、刷新后核对。既有结账 expectedCountry 防护同样覆盖过期场景。
- TDD 先复现缺少有效期、过期导航和购物袋混用市场的问题，再实现。全量 Vitest：142 个文件、886 项通过；TypeScript、ESLint、Prettier 和生产构建通过。

## 本地生产模式动态验证

使用真实 standalone 构建和 Shopify 只读商品数据；独立本地代理模拟 US 客户端 IP，并用测试入口设置旧/新/手动 Cookie。测试入口只在 `/tmp`，不进入源码或发布镜像。关闭 KOL、Meta 跟踪及 CAPI，不创建订单、不支付。

1. 31 分钟前 GB/ip 与无时间戳 GB/ip 均重新判 US，浏览器回读 persisted=true、source=ip、生成新的 resolvedAt。
2. 10 分钟前 GB/ip 在 US IP 下仍保留 GB；真实 HTTP 重复 resolve 返回原生成时间，无 Set-Cookie。
3. GB/manual 在 US IP 下保持 GB，不触发自动重判。
4. 在已有 GB 页面通过另一个本地页将 Cookie 变为过期，再站内导航，页面同步为 US。路由/查询/可见性独立边界另由组件测试覆盖。
5. 真实浏览器购物袋保留 `royal-grey` 数量 2，采用当前 US Shopify 价格 $45.90、小计 $91.80；原链接查询参数 `dt_id=3689395` 与 `#looks` 在同 URL 重判后保留。价格为本次取样，不作为固定商业事实。
6. 生产构建上的 HTTP list/detail 读取携带过期 GB 与 expected GB，均返回 409；未改变用户真实购物袋。未进行真实支付验证。

## 发布

本地验证完成；生产发布及部署后证据在发布完成后补充。发布采用 GitHub Actions 预构建镜像，仅更新 app；不在生产服务器编译，不更新后台、订单 worker、Meta worker、GeoLite updater 或 Nginx。
