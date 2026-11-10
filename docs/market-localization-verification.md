# 国家选择与判定验收（2026-11-09）

变更：`ship-to-country-resolution`。范围为国家推荐/选择、购物袋核对、过期国家结账拦截与可选 IP 库更新。不改商品、库存、运费、订单或 Collabs 计佣规则。

## 逻辑验证

- 最终完整 `pnpm test --maxWorkers=2`：139 文件 / 871 测试全部通过。
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

已于 2026-11-09 20:31（上海时间）完成主站独立发布。运行代码提交 `3ad93a2a1de068d1a48de71d430af9799eb2eb01`；[原生 Linux CI](https://github.com/perrywang123/offywebsite/actions/runs/42616683286) 完成镜像、数据库原生绑定及迁移校验。隔离候选容器通过真实 Shopify localization / 偏好 Cookie 下一请求回读 / 商品目录页面验证后替换 app；服务器未执行编译。

线上 `https://isoffy.com/products` 正常，Ship to / 搜索 / 移动端面板可用。现有购物袋 DOTTY DARLING 数量 1、£33.90 保持完整；未在生产增加测试商品、调用结账创建接口或支付订单。线上检查只打开、搜索并取消选择，没有改变用户原有 GB 目的地。

比较发布前后 Docker 容器 ID、启动时间、镜像、环境键值哈希、挂载及 `.env` 哈希：后台、KOL worker、Meta worker 完全未变；app 既有凭据和数据卷未变，仅增加可选 GEO 配置。Nginx 未更新。已保留旧主站镜像和一致性 SQLite 备份 `/data/deploy-backups/offy-2026-11-09T12-31-43-230Z-5b0adefe.db`。

![线上手机国家选择器](design/market-localization/production-mobile.jpg)

2026-11-10 补充：MaxMind 注册、邮箱验证、GeoLite 协议接受和专用许可密钥创建已完成。根据实际发布周期将检查间隔从 24 小时改为 72 小时，新增部署检查验证仅启动 updater、不重建或重启其他服务。首次生产激活尚待执行；此前国家识别继续使用现有有效 IP 库和浏览器/US 兜底。私密凭据目录同时从 Git、Docker 和便携源码包中排除。

仓库全量 Prettier 检查仍命中 67 处既有格式问题（主要历史 OpenSpec），本次改动文件单独检查通过；未批量改写历史规范。
