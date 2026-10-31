# 主题动画现状

2026-10-31：globals.css定义fade-up、pop、page-enter、ken-burns和quick-view-in；Reveal用IntersectionObserver加is-in，JS未启用时内容可读，reduced-motion直接显现。页面进入终态transform会建立containing block，fixed浮层需避开该祖先。

现行动效交互见 [motion](redesign-06-motion.md)；不新增旧方案中的滚动劫持、强制整屏吸附或第三方动画依赖。历史原文见 [历史索引](../history/README.md)。
