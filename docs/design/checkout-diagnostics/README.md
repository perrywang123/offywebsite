# 结账诊断界面验收

2026-11-01，现有 Next.js 管理后台的第五页。设计契约见本次 OpenSpec design.md；继承根 DESIGN.md 和 admin.css 的黑白灰、系统字体及 44px 操作区。

截图内容全部来自隔离模拟器与临时数据库，不是生产用户或真实交易。完整技术与使用说明见 [结账诊断](../../checkout-diagnostics.md)。

## 视觉复审

首轮 [桌面截图](desktop-before.png) 后调整三个薄弱点：列表优先显示商品名并保留 handle；生成链接但 Shopify 有警告时增加独立提示；长篇说明折叠为“记录范围与保留期限”，诊断页页脚不再使用佣金冻结口径。另修正 360px 第五项导航裁切、768px 日期控件过窄，以及异步加载详情时 Esc 返回焦点的问题。

## 最终证据

- [1440px 桌面](final-1440.png)、[360px 手机](final-360.png)、[768px 平板](final-768.png)、[1920px 宽屏](final-1920.png)：document scrollWidth 等于对应 viewport；导航不溢出，见 [测量](viewport-checks.json)。
- [手机详情](detail-360.png)、[桌面详情](detail-1440.png)：国家证据、商品、Shopify 响应、时间线、原始链接入口；原文默认关闭。
- [无匹配结果](empty-filter.png)：与读取失败分开，网络失败状态有组件测试。
- [预览](preview.png)：最终桌面首屏。

浏览器操作已检查：购物袋加购/结账到模拟 Shopify、前置验证失败、后台按国家筛选、详情打开、链接解密/复制、Esc 关闭并回到原“查看详情”按钮、无匹配筛选。既有 reduced-motion 样式覆盖此页，新增界面无动画；未进行系统辅助技术或真实支付验证。
