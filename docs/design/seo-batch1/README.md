# SEO 第一批 · 视觉零变化证据（before / after 整页截图）

对应改动：给 `/products`、`/collections`、`/collections/<series>`、`/about`、`/bag-charm`
补 `generateMetadata`（title / description / self-canonical），并给首页新增一个
`sr-only` 的 `<h1>`。**只动 `<head>` 与一个不可见元素。**

## 截图口径

- 浏览器：headless Chrome 152（`--headless=new --no-sandbox --disable-gpu`），
  通过仓库的 `scripts/lib/cdp.mjs` 走 CDP。
- 视口：`375×812`（移动）与 `1440×900`（桌面），DPR = 1。
- 页面：`/`、`/products`、`/collections`、`/about`。
- 整页（`Page.captureScreenshot` + `captureBeyondViewport`），不是首屏。
- before 取改动前的 `HEAD`（工作区干净的基线），after 取改动后同一个 dev server。
- 为保证两次截图可比，两次都做了同样的确定性处理（不改变任何布局/样式）：
  - `prefers-reduced-motion: reduce`：关闭头图自动轮播与 reveal 动画；
  - 冻结 `>= 3000ms` 的 `setInterval`：顶部 promo 条 4.5s 轮换停在第一条；
  - 所有 `<img>` 置为 eager，滚动全页并轮询到全部图片 decode 完成再截。
    （未处理时实测懒加载商品图会时有时无，单页可差 39 万像素。）

## 像素比对结果

用 Python + Pillow `ImageChops.difference` 逐像素比对（RGB）：

| 页面 | 375×812 | 1440×900 |
| --- | --- | --- |
| `/` | **0**（文件逐字节相同） | **0**（文件逐字节相同） |
| `/products` | **0**（文件逐字节相同） | **0**（文件逐字节相同） |
| `/collections` | **0**（文件逐字节相同） | **0**（文件逐字节相同） |
| `/about` | **0**（文件逐字节相同） | **0**（文件逐字节相同） |

- 噪声基线：改动前连截两次，8 张全部 0 像素差异。
- 交付的 before/after 8 对全部 **0 像素差异，且 PNG 文件 sha256 相同**。
- 曾观察到一次独立重抓的 `about-375` 在 promo 条文字处有 19 px 反锯齿抖动
  （bbox `221,52 → 290,55`），属于字体栅格化噪声；交付的这一对没有差异。

## 文件

`<page>-before-<width>.png` / `<page>-after-<width>.png`，共 16 张。
