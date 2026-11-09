# 国家选择与判定验收（2026-11-09）

变更：`ship-to-country-resolution`。范围为国家推荐/选择、购物袋核对、过期国家结账拦截与可选 IP 库更新。不改商品、库存、运费、订单或 Collabs 计佣规则。

## 逻辑验证

- 完整 `pnpm test --maxWorkers=1`：138 文件 / 870 测试通过；其后新增区域商品 not-found 边界独立测试 1 项通过。
- 可信国家头、真实 IP/IPv6、Cookie 优先级、地理时区、区域语言、US 默认及损坏信号均覆盖。
- 设置接口覆盖同源限制、Shopify 可选国家验证、自动 session/manual 90 天 Cookie，以及真实 Set-Cookie 线值的下一请求回读。真实浏览器发现的二次编码问题已修复并回归。
- 购物袋保留身份/数量、缺失行无旧事实、完整小计/结账阻断、过期国家 409 诊断覆盖。
- MMDB 缺失、首次加载、损坏更新保留最后有效读取器覆盖。凭据文件不入 Git/镜像/客户端。
- 早期将完整测试与构建同时运行时，既有部署脚本测试发生资源竞争超时；停止并发后串行全量通过，没有放宽原测试超时或改部署业务逻辑。

## 浏览器验证

使用隔离本地生产服务，关闭营销上报，不创建 Shopify cart 或订单。

- 首次浏览器地理时区得到 China；币种 HKD 来自店铺现有 Shopify 配置。
- 搜索并确认 United States 后显示 USD 商品价；Cookie 下一次页面请求保持选择。
- 切换保留完整 `?dt_id=3689395&market_check=1#looks`。
- 真实美国专属 COLD KITTEN：US $49.90 加袋后切 GB，保留数量 1；显示通用不可用行、小计“—”、禁用 Checkout。切回 US 恢复 Shopify 名称、图片及 $49.90。测试行已移除。
- 桌面短窗口弹层 CTA 完整可见；375×812、320×640 无横向溢出，确认按钮 48px 高，标题初始焦点不弹手机键盘。取消不改变国家。
- 美国专属详情切 GB 后返回 404 状态并显示品牌化缺失页，仍可打开 Ship to，并保留 Header/购物袋/返回可售目录入口。
- 国家/币种名单来自当前 Shopify localization，失败时不伪造选项。

![桌面国家选择](design/market-localization/selector-desktop.jpg)
![手机国家选择](design/market-localization/selector-mobile.jpg)
![英国市场不可售购物袋](design/market-localization/unavailable-bag.jpg)

## 发布状态

待 native Linux 镜像、独立主站部署与线上回归后补充；管理后台和现有 worker 不在发布范围。MaxMind 注册被服务端拒绝，账号验证及下载许可仍待完成，自动更新不得标记已启用。

仓库全量 Prettier 检查仍命中 67 处既有格式问题（主要历史 OpenSpec），本次改动文件单独检查通过；未批量改写历史规范。
