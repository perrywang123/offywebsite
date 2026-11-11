# Offy 现行界面设计契约

状态：当前实现基线，2026-10-31。源码依据：`src/app/globals.css` 及现有组件。Shopify 故障态已于 2026-10-31 获用户确认，采用 `docs/design/shopify-unavailable/DESIGN.md` 的品牌化重试设计。

## 目标与视觉

以 OFFY 原创形象摄影为主体，以克制的黑白灰和编辑式排版承接品牌叙事与购买。保留真实品牌资产；不增加通用 SaaS 风格的渐变卡、统计面板或无关插画。

## 颜色与字体

- 页面底 `#efefef`；白色表面 `#fff`；浅分区 `#f5f5f5` / `#f7f7f9`。
- 主文字/主按钮 `#1d1915`；次文字 `#525252`；分隔线 `#e3e3e3`。
- 错误 `#b3402f` 仅用于明确错误反馈；区域徽章红 `#c8102e` 不用于全站错误背景。
- 使用现有系统字体栈，英文当前优先 PingFang SC 与系统 sans；无外部字体依赖。
- 标题 display、正文 sans、金额 tabular-nums；不通过超小文字承载操作。

## 布局与交互

- `.container-site`：手机左右 16px，md 起 92%，max-width 2800px。
- `.section-y`：基础 48px / md 80px / lg 112px，页面可有明确的 lg 覆盖。
- 导航切换点 768px；触控规则扩展到 <1024px。不要把两者当成同一断点。
- 手机商品网格 2 列，md 3 列，lg 4 列；主按钮胶囊 48px 高。
- 窄屏独立控件以 44px 命中区为目标，正文与名称保持可读；具体历史规范存在例外，应以浏览器实测记录差异。
- Header 为 sticky 白底，顶部黑色公告按原文与 4.5 秒节奏轮换；不是透明覆盖首屏。手机 <768px 的白色工具栏为 56px 单行，88px Logo、国家短码、图标购物袋和数量角标、菜单；购物袋/菜单命中区至少 44px。768px 起保留原桌面导航与 BAG 胶囊。
- 手机侧栏保留四个主导航、Shopify 实时系列名和国家入口；Series 子导航仅用 12px 缩进、13px 次级文字及 44px 行高区分，不加框线。可滚动正文包含 Help & Support：Shipping & returns 指向政策目录，FAQ 指向 /faq，Contact Us 指向 /policies/contact；激活链接照常关闭侧栏。
- Hero 五屏、整屏链接、自动轮换/手势/指示条；箭头和详情胶囊默认不渲染，无暂停按钮。
- 页面进入动画的 transform 会影响 fixed 定位。PDP 手机购买条使用 sticky bottom-0；上排市场价格与 1 OFFY · 当前币种，下排等宽 Add to Bag 描边 / Buy Now 黑底胶囊，48px 高、10px 间距。桌面在原信息区并列双按钮。立即购买仅当前商品 1 件，不改已有袋子；跳转中禁用两按钮，失败原地重试。预告 quick view Portal 到 body。
- 购物袋运费提示采用小型线性购物车图标、浅灰竖分隔线与两段灰色说明组合；文字自然换行，与小计和 Checkout 保持明确间距。装饰图标不参与读屏，实际运费仍由 Shopify 结账确定。
- `.hscroll` 用于分类和本商品缩略图；同系列换款入口在页尾网格，展示当前市场 Shopify 完整系列中的全部其他商品，排除当前款并保留返回顺序，不再截断为六款。网格及本商品图集不变。
- “The Latest from OFFY” 使用运营选定的五张本地宣传图：主卡 `news-swan-queen.jpg`（2026-11-11 用户提供，绑定 `swan-princess`），副卡依次 `news-04.jpg`、`news-03.jpg`、`news-08.jpg`、`news-02.jpg`。主卡暂不显示 ROMANTICIZING EVERYDAY LIFE，保留 VIEW DETAILS 和整卡链接，图片替代文字取核验后的商品名称。主图 object-position 为 15% center，View Details 按钮横向居中：<1024px 保留 40% 卡宽、最大 176px、40–48px 高、12–16px 字号；1024px 起为 48% 卡宽、最大 320px、52–64px 高、18–24px 字号。手机距底部 4%，桌面 2%，为放大后的按钮留出左下角 Limited 标识的净空；其余五卡网格不变。这些是品牌构图素材，不用 Shopify 商品首图替换；绑定商品的可售状态、商品详情与购买事实仍由 Shopify 核验。

- Ship to：Header 与购物袋入口；桌面右侧面板，手机底部弹层；搜索 Shopify 当前支持目的地，显式确认后刷新同一 URL。非空购物袋保留并重新核对，缺失商品不显示旧事实。

- 首页造型推荐（2026-11-11 用户确认并已发布）：保留原 Shop by Category 标题、container-site / section-y 宽度间距与 4:5 cover 商品卡，不使用收窄方形画布或紧凑侧栏。主区标题统一 FEATURED，区域区标题 REGIONAL EXCLUSIVE，两者为同字号/字重的 h3（24px / md 30px），均位于匹配的桌面三列/手机两列网格上方。区域红色角标沿用共享 ProductCard。下方保留 All Products 圆形商品缩略图名册，覆盖当前市场全部非周边公仔，不受精选六款限制；不替换成三系列入口。只读 Shopify FEATURED 集合（handle: featured），失败保留实时日期选品逻辑。其他页面、原三个系列和支付不变。

## 验收

桌面与 375px 检查层级、溢出、图片内容对应、焦点、safe-area、抽屉与 reduced motion。外部图片未加载、数据失败、空集合、404 和售罄分别验收。设计修改必须同时核对真实商品数据和购买行为；不能用旧价或示例商品掩盖错误态。
