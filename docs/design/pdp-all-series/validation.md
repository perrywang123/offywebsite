# 商品详情：完整同系列推荐验证

2026-11-11。仅本地部署，未修改生产服务器或 Shopify 配置。

## 改动

Shopify 数据层原本已完整分页读取当前市场的系列商品，详情页使用 `siblings.slice(0, 6)` 截断。本次移除该截断，保留当前商品排除、Shopify 返回顺序、原有网格、图片与商品链接。周边仍从 merch 数据源获取，不混入三个公仔系列。未改商品图集、价格、购物袋或支付逻辑。

## 自动验证

- 超过六款的顺序与数量测试先失败，移除截断后通过。
- 详情页相邻 18 项测试通过，包括排除当前款、空集合、仅当前款、本商品图集和周边隔离。
- 全量 145 个测试文件、915 项通过。
- 生产构建通过，包含 ESLint 与 Next.js 类型检查；Prettier、OpenSpec、diff 空白检查通过。

## 本地实际验证

预览：http://127.0.0.1:4317/products/swan-princess 。本地 Meta、CAPI、KOL 均关闭，未启动生产 worker，未执行加购或结账操作，保留原购物袋数据。

- 美国市场只读 Shopify 查询：OFFY Princess Series 共 12 款，`hasNextPage=false`，排除当前 SWAN QUEEN 后为 11 款。
- 更新前实际页面展示 6 款，更新后为 11 款；浏览器逐项比对 handle 顺序，与 Shopify 完全一致，11 张图片均加载成功。
- 新露出的第 7—11 款为 COASTAL STAR、LITTLE HEIRESS、PINK MALLOW、CARAMEL RÊVE、MINT BREEZE。
- 实际点击末尾 MINT BREEZE，进入 `/products/mint-breeze` 且 H1 对应，再返回原商品页。
- 手机 375px、390px 保持两列；375px 实测两列各 163.5px，11 张卡片，无横向溢出。桌面 1440px 保持原六列，展示两排共 11 款。
- 临时浏览器视口已重置，本地预览保留。

截图：[全部 11 款](desktop-full.jpg)、[手机列表末尾](mobile-tail.jpg)。以上数量是验证时的真实数据，后续仍随 Shopify 系列与市场配置变化，没有固定商品数或本地商品回退。
