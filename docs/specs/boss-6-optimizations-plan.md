# 六项简化：当前落地记录

2026-10-31校准，原执行草案见 [历史索引](../history/README.md)。六项代码均已存在，本轮仅修正文档。

| 决定               | 当前实现                                               |
| ------------------ | ------------------------------------------------------ |
| Hero隐藏详情/箭头  | 两个常量为false，不渲染；全5屏整屏链接                 |
| 删除首页Marquee    | 已删；Header顶部promoMessages保留                      |
| NEWS删NEW ARRIVALS | 主卡徽章已删，以mt补标题位置；New in商品标签是另一回事 |
| PDP删同系列小图    | 已删；本商品ProductGallery保留，同系列入口在页尾       |
| 底纹换纯色         | NEWS #efefef，category/upcoming #f7f7f9                |
| Footer统一排版     | FAQ/CONTACT与其他列同等级，Legal较弱且保留分隔线       |

同时已去掉NEWS标题的News·前缀。后来补齐pointer跟手/速度/吞click/reduced-motion；最终没有暂停按钮，不得因旧待办重新添加。

旧2026-10-12变更的原人工验收未冒记完成。2026-10-31已用--skip-specs归档为历史，其已实现内容由当前主规范校准；不要再次合并旧delta覆盖新基线。完整浏览器回归仍应随未来行为改动执行。
