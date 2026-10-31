# 移动适配：当前状态与剩余验证

基线：2026-10-31。旧56项审计/40项改动计划已完成主要实现，本文件不再重复作为待开发任务。历史原文见 [历史索引](../history/README.md)。

## 已实现

统一container-site与section-y；窄屏字号底线源码守卫；tap-target、hscroll、safe-area；Header实测高度；商品卡两行名称与独立价格；PDP sticky购买条和自图集；CartDrawer 88%/dvh/scroll lock；cart步进器换行；FAQ summary整行可点；bag-charm Portal与移动排版；Footer md两列/lg四列。

## 已验证边界

2026-10-31抽查375×812 PDP：scrollWidth=375、购买条sticky且底边812。Vitest类名/源码断言不能覆盖全站几何。旧截图是当时数据和代码的证据，不是当前Shopify内容快照。

## 待专项核实

320/375/390及768–1023全路线回归；长商品名和多币种；真实触摸/键盘/抽屉焦点；MobileNav滚动/焦点行为；远程图片失败；桌面/手机库存操作一致性。当前不声称所有控件在所有断点均达到44×44。

新的Shopify失败态见 [确认稿](../shopify-unavailable-design.md)，确认后另走TDD与视觉验收。
