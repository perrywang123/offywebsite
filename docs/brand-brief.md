# PLAYCORE 凭空幻想 — 品牌与产品简报（专家统一输入）

> 来源：`resources/凭空幻想PLAYCORETOYS_品牌手册2026.pdf`（42 页）、`resources/产品修图/`、
> `resources/ins/`。本文件是 6 位专家（产品/交互/美术/web/server/测试）的共同输入。

## 1. 品牌身份

- **公司/品牌名**：PLAYCORE 凭空幻想（PLAYCORETOYS）
- **年份**：2026
- **IP 名**：is.offy（角色名 Offy，小红书账号号 4976893650，上海）
- **英文 Slogan**：Imagine with Love. Create with Companion.
- **中文 Slogan**：让想象落地，让陪伴发生
- **形象设定**：黑肤色卡通 IP 原创插画（dark-skinned cartoon IP illustration）

## 2. 品牌故事（灵感解析，源自 PDF）

Offy 的灵感来自《塞尔达传说》里的"呀哈哈"（Korok）—— 一个藏在城市喧嚣里、从自然获取力量的小精灵。
但 Offy 不只是温柔可爱，她任性、倔强、脑子里全是古怪想法。她把内心情绪直接穿在身上，
每一套穿搭都纯粹源于那一刻的心境。

> "你挑选的不只是一只玩偶，而是与你共鸣的她。"
> "Offy 把你内心的样子穿在外面 —— 随心搭配，让造型贴合你当下的情绪。"

**关键设计理念**：产品 = Offy 这个 IP 在不同"穿搭/情绪/风格"下的化身；用户"挑选与自己共鸣的她"。

## 3. 团队

- JIE —— Concept & IP Designer，常驻曼谷的波普艺术家（Bangkok-based Pop Artist）
- 桃子 —— 概念与 IP 设计师，常驻上海，广告插画艺术家

## 4. 渠道/零售网络（品牌背书，可用于官网展示）

- 中国：上海 TX 淮海、杭州 银泰 in77
- 泰国：曼谷 Warehouse30_6 vintage

## 5. 产品体系（产品编码已从 PDF 提取）

### 5.1 经典尺寸规格（PCOF1 系列通用）
高度 18 cm · 长度 7.5 cm · 头围 24 cm · 手臂 3.5 cm · 腿部 3.5 cm

### 5.2 系列与编码

| 系列 | 编码 |
| --- | --- |
| 时尚包挂系列 Fashionable Bag Charm | PCOF1-F0 |
| Signature Plush 经典毛绒 | PCOF1-F1、F2、F3 |
| Multi-texture（环保再生 + 金属质感） | PCOF1-F4、F5、F6 |
| Recycled & Eco Materials | PCOF1-F6、F7、F8 |
| 毛绒玩偶系列 Plush Toy Collection | PCOF1 系列（经典 18cm） |
| 01 Active & Sporty（球场/健身房/街头） | PCOF1-A3、A4 |
| 02 Outdoor & Lifestyle（自然/城市漫步/聚会） | PCOF1-B2、B3、B4 |
| 03 Princess & Elegance（下午茶/展览/日常优雅） | PCOF1-C2、C3、C4、C5 |
| 04 Playful（日常玩乐时刻） | PCOF1-D 系列、PCOF1-D1 |
| 大号毛绒玩偶 Large Plush Toy | 原皮 Offy、泰国限定 Offy |
| 定制系列 Custom Collection | 支持定制与联名 |

### 5.3 联名/定制款式编码（"以上款式支持定制及品牌联名合作挑选"）
OF 02、OF 03、OF 2.2、OF 2.4_1、OF 2.6、OF 2.11、OF 2.12、OF 2.13、OF 2.31、OF 2.32、OF 2.42、OF 2.51、OF 2.52、OF 3.1

### 5.4 未来 IP（官网可预告）
- MISS KITTY / 千金猫（UPCOMING IN-HOUSE IP）
- PSYCHE / 灵魂与蝴蝶女神（The Soul and the Butterfly Goddess）

## 6. 素材清单（`resources/`）

- `resources/产品修图/`：29 张产品图（多为 1080–1122 × 1448–1454 竖版 3:4，白/浅底），
  文件名是生成时间戳（ChatGPT Image / jimeng / 已生成图像）。这是**每个 Offy 形象**的产品图。
- `resources/ins/`：23 张 ins 品牌/生活方式图（2551 × 3437 竖版），用于品牌形象宣传。
- `resources/凭空幻想PLAYCORETOYS_品牌手册2026.pdf`：品牌手册（42 页，含版式/视觉参考）。
- 另有两个 zip（`ins.zip`、`产品修图.zip`），为上述文件夹的打包副本。

## 7. 网站需求（用户原话摘要）

1. **参考 casetify.cn/iphone-cases/iphone-17-pro-max-cases** 实现整体风格与"选款→支付"交互。
2. 展示每个产品（对应 `产品修图` 里的每一个 Offy 形象）；点击每个形象后可支付（参考 casetify 购买手机壳的交互）。
3. **品牌形象宣传**：参考 dogguo.com 与 littlebeast.co，素材用 lookbook PDF + `ins/`。
4. **多语言**：先中英双语，未来可扩展更多语言（i18n 架构必须可扩展）。
5. 用于**品牌形象展示 + 出售产品**的独立站。

## 8. 工程约束

- 技术栈：Next.js 15 (App Router) + TypeScript + Tailwind v4 + Drizzle(SQLite) + Vitest。
- 已配置 spec-first（OpenSpec）+ TDD 工作流，见 `AGENTS.md`。
- 支付：参考 casetify 的购物/支付交互；具体支付渠道见后续决策（默认 Stripe 测试模式）。
- 图片：直接从 `resources/` 拷贝进 `public/` 引用（勿外链）。

## 9. 待用户补充的数据（"outlook" 邮件中，暂不可得）

- 每个产品的**中英文名**与**价格**（本简报暂用 PDF 编码 + 占位价格）。
- **产品图 ↔ 编码**的精确映射（暂按生成时间顺序自动映射，可后改）。
- 品牌介绍的权威文案（PDF 已含一版，可先用）。
