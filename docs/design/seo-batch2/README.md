# SEO 第二批 · 视觉零变化证据(before / after 整页截图)

对应改动:新增 4 类 JSON-LD —— `Product`+`Offer`(商品详情页)、
`BreadcrumbList`(商品页 + 系列页)、`Organization`+`WebSite`(根布局全站)、
`FAQPage`(`/faq`)。**新增的只有 `<script type="application/ld+json">`,
不改变任何可见 DOM。**

## 截图口径

- 浏览器:headless Chrome(`--headless=new --no-sandbox --disable-gpu`),通过仓库
  `scripts/lib/cdp.mjs` 走 CDP。
- 视口:`375×812`(移动)与 `1440×900`(桌面),DPR = 1。
- 页面:`/`、`/products/black-pearl`、`/collections/princess-lady`、`/faq`。
- 整页(`Page.captureScreenshot` + `captureBeyondViewport`),不是首屏。
- 为了保证两次截图可比:
  - `prefers-reduced-motion: reduce`(关闭轮播 / reveal 动画);
  - 冻结 `>= 3000ms` 的 `setInterval`(顶部 promo 条 4.5s 轮换停在第一条);
  - 所有 `<img>` 置为 eager,滚动全页并轮询到全部图片 `complete` 再截;
    任一页图片未齐则重试加载。
- before 取改动前的源码(工作区 HEAD,`5e2901f`);after 取改动后的源码。
- **数据源**:视觉比对用的 dev server 关闭了 Shopify(`SHOPIFY_STORE_DOMAIN=`
  `SHOPIFY_STOREFRONT_TOKEN=`),商品/系列走本地兜底数据 —— 因为线上 Shopify
  查询有 3s 超时,偶发回退会改变商品图集/系列名,产生与本次改动无关的像素差。
  结构化数据本身在连接真实 Shopify 的 dev server 上另行验收(见任务报告)。

## 像素比对结果(Python + Pillow `ImageChops.difference`,RGB)

| 页面                         | 375×812                | 1440×900               |
| ---------------------------- | ---------------------- | ---------------------- |
| `/`                          | **0**(PNG sha256 相同) | **0**(PNG sha256 相同) |
| `/products/black-pearl`      | **0**(PNG sha256 相同) | **0**(PNG sha256 相同) |
| `/collections/princess-lady` | **0**(PNG sha256 相同) | **0**(PNG sha256 相同) |
| `/faq`                       | **0**(PNG sha256 相同) | **0**(PNG sha256 相同) |

- 8 对 before/after 全部 **0 像素差异,PNG 文件 sha256 相同**。
- 噪声基线:反复抓取时,顶部 promo 条 / 右上 BAG 文本偶发 **19–31 px**
  的反锯齿抖动(mobile bbox `221,52 → 290,55`;desktop bbox 在 BAG 按钮附近),
  与源码改动无关 —— 改动前连截两次也能复现,重复抓取同一版本即回到 0。
  交付的这一组 8 对图片全部为 **0**(sha256 相同)。

## 文件

`<page>-before-<width>.png` / `<page>-after-<width>.png`,共 16 张。
