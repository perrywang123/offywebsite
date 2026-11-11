# 五屏轮播与网站图标验收

2026-11-11，用户确认后实施。发布状态：本地验收及生产发布后验证通过。

## 实现范围

五屏共享自然撑开的 Grid 高度，照片与文字分区，不再依赖绝对定位将文字叠在商品上。保留五屏图片、英文文案、整屏目的地址、5 秒自动播放、减弱动态偏好与拖动手势。品牌 Logo 保持比例；促销文案完整换行；指示条保留独立空间和至少 44px 点击高度。

网站使用 64×64 PNG 画布居中放置原始品牌 Logo，保留原比例，删除脚手架三角 favicon。仅 `/icon` 路径跳过语言重写，避免 `/en/icon` 的 404。

## 本地验证

- 真实 standalone 页面 `http://127.0.0.1:4317/`；读取 Shopify 真实商品，Meta/KOL 写入与远程上报关闭。
- 320、360、390、430、768、1024、1440、1920px × 五屏，共 40 组布局检查：无文字溢出或图文重叠，各屏共用高度。证据 `local-geometry.json`。
- 从当前编译 HTML/CSS 提取的隔离布局页，320、390、1440px × 五屏 × 130%/200% 文字字号，共 30 组检查：无图文重叠或溢出。证据 `text-stress-geometry.json`。这是字体压力测试，不能视作真实 iOS/微信浏览器验收。
- 浏览器验证指示条切屏、指针拖动后不误跳、自动播放仍推进；品牌整屏链接进入 `/about`。单测另外覆盖触摸、速度阈值、键盘、取消手势、减弱动态与非活动面板 inert。
- 截图：`local-mobile-brand.jpg`、`local-mobile-promo.jpg`、`local-desktop-brand.jpg`、`local-text-200-promo.jpg`。
- 图标实际地址返回 200 / image/png / 64×64；Logo 深色像素包围盒 58×22，比例 2.636（原图 1084/408≈2.657，差异来自像素栅格化）。证据 `icon.png`、`local-icon-check.json`。
- TDD 已经历失败到通过；最终 151 个测试文件 / 939 项全部通过（`pnpm test --maxWorkers=4`）。默认并发下一个既有 Docker 模拟测试曾因 5 秒超时失败；限制本地测试并发后全绿，未放宽断言或改动部署逻辑。
- `pnpm build` 成功，包含 ESLint 与 Next.js 类型检查；OpenSpec 和修改文件格式检查通过。

## 生产发布

2026-11-11 19:37（北京时间）完成独立主站发布：

- 运行源码：`114cb56bb07b72998feca493cd1aa88c2c9b87e6`。
- [完整 CI](https://github.com/perrywang123/offywebsite/actions/runs/43012635989) 与 [Linux/amd64 镜像工作流](https://github.com/perrywang123/offywebsite/actions/runs/43012636173) 均成功。
- Artifact ID：`13851437342`；ZIP SHA-256：`498eae1f20c5436a925d50b3eb1aaba4617d2a5a2427337c294e9a3d592e046f`；压缩镜像 SHA-256：`7aee1712966922cf9acbce449c778d5958732d2a161ec0bc1f2883647292be2e`。服务器直接下载，核对 ZIP 摘要、镜像校验清单、REVISION 和 OCI revision 后加载。
- app 镜像：`sha256:d84f0299851922a3a6b81d7ac36a9f47e01b5e89582fa17085a6bbda39cd3733`。运行 `bash deploy/update-storefront.sh --kol --prebuilt`，未在服务器构建。
- 旧主站回退镜像：`offy-app:before-hero-20261111`；一致性数据库备份：`/data/deploy-backups/offy-2026-11-11T11-37-49-891Z-ce7171b7.db`。下载产生的 ZIP/gzip 临时文件已清理，镜像、备份和校验清单保留。
- admin、KOL worker、Meta worker、GeoIP updater 的容器 ID、镜像及启动时间均与发布前一致。所有服务的环境变量摘要和挂载一致；`.env` 文件与 Nginx 配置摘要一致。加载双标签镜像后已恢复原 `offy-admin:local` 标签。证据 `production-deployment-checks.json`；服务器原始对照在 `.deploy-backups/hero-20261111/`。
- app/admin healthy，owner/worker/shop readiness 全部通过，SQLite `quick_check=ok`。
- 公网首页、SWAN QUEEN 商品页、health 和站点图标实际返回 200，图标为 64×64 PNG。证据 `production-http-checks.json`。
- 线上真实 CSS 视口 390px 和 1440px 的五屏布局均无图文/指示条重叠、文本溢出或页面横向溢出，五屏图片完整加载；手机共享高度约 296.8px，桌面约 904.3px。浏览器原有站点缩放为 80%，视口工具输入作了补偿，以 `innerWidth` 实测为准；截图裁掉采集器额外边缘，没有改动页面内容。证据 `production-geometry.json`。
- 逐屏点击五个指示条，自动播放正常推进；NEWS 主卡进入 `/products/swan-princess`，显示真实 Shopify 标题及 Add to Bag / Buy Now。只读取按钮，没有加购或创建 checkout，原有购物袋数量 2 保持不变。
- 手机侧栏 Help & Support 只含 FAQ 和 Contact Us，国家选择入口保留；浏览器无 hydration 错误记录。未执行实际付款、退款、订单修改或 Shopify 配置修改。

线上截图：[品牌手机](production-mobile-brand.jpg)、[赠品手机](production-mobile-promo.jpg)、[Princess](production-mobile-princess.jpg)、[Streetwear](production-mobile-streetwear.jpg)、[Dress-up](production-mobile-dressup.jpg)、[品牌桌面](production-desktop-brand.jpg)、[赠品桌面](production-desktop-promo.jpg)。

实际 iOS Safari / 微信客户端未在本次接管环境验证；大字号结论来自本地编译组件的隔离压力测试。
