# 移动设计基线

2026-10-31当前token/断点见 [DESIGN](../../DESIGN.md)，落地状态见 [mobile-adaptation](mobile-adaptation-plan.md)。375px左右16px；md92%版心；触控控件以44px为目标；导航断点768px；safe-area需viewportFit cover。

PDP使用sticky避免页面transform捕获fixed；quick view Portal到body；横滑条min-w-0约束不可省。不要把“源码存在某个class”视作真实触控/焦点/几何验收。

旧56项问题与根因分析保存在 [历史索引](../history/README.md)，不是全部仍待实现的清单。
