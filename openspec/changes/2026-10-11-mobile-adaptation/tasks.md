# Tasks

> 行为变更(吸底条、抽屉关闭、售罄错误、袋子清空)走 Red → Green → Refactor;
> 纯样式/间距改动只保证既有测试不破。每条以 `pnpm test` 通过收尾。

## 1. 统一层(分区 A,必须最先合入)

- [x] 1.1 `globals.css` 新增 `.section-y`(48/80/112)、`.tap-target` / `.tap-target--quiet`、
      `.hscroll`、`.safe-b` / `.safe-t`。放在 `@layer components`(Tailwind 的 utilities
      层能覆盖它,所以 `lg:py-12` / `lg:h-8` 这类"桌面恢复"写法是有效的)。
      `--quiet` 的 `padding-block` 取 `0.875rem` 而不是 `.75rem`:后者在
      `text-xs`(16px 行盒)上只有 40px,达不到 44px。
      同一 `.tap-target--quiet.link-line` 要把 `::after` 下划线补偿回 `bottom: calc(-2px + 0.875rem)`,
      否则下划线会跟着 padding 掉到文字下方 14px。
- [x] 1.2 修 `.js .reveal[data-variant="left"|"right"]` 缺 `:not(.is-in)` 造成的永久位移
      (优先级相同、位置更靠后 → 揭示完成后仍保留 ±24px,窄屏直接横向溢出)。
- [x] 1.3 `<1024px` 上把**未揭示**的左右位移改成纵向位移:首屏之外的 reveal 元素
      在加载瞬间仍带 ±24px,实测 `/about` scrollWidth 383 > 375。动画保留、横向不溢出。
- [x] 1.4 `layout.tsx` 新增 `export const viewport`(`viewportFit: "cover"`),
      否则 `env(safe-area-inset-*)` 恒为 0。
- [x] 1.5 `src/hooks/useScrollLock.ts` + test(4 例:开/关/关时还原旧值/卸载还原)。
- [x] 1.6 `.link-line:active::after`(触屏按下即反馈)。

## 2. 全局框架

- [x] 2.1 Header:`ResizeObserver` 把实测高度写回 `--header-h`(promo 文案换行时
      高度在 104/119px 之间跳,写死的估算值会让 sticky 的分类条被盖住);
      logo 链接补 `min-h-11 lg:min-h-0`(实测 64×24)。
- [x] 2.2 `CategoryTabs`:改成客户端组件,接入 `.hscroll` + `.tap-target lg:min-h-0`;
      对 `[aria-current="page"]` 调一次 `scrollIntoView({inline:"center", block:"nearest"})`
      —— **`block:"nearest"` 不能省**,否则加载时整页被纵向滚走。
- [x] 2.3 `Marquee`:reduced-motion 下改成换行静态块(动画被全站禁用后会退化成被裁掉的静止文字)。
- [x] 2.4 订阅表单输入框 `text-sm` → `text-base md:text-sm`(iOS Safari 聚焦会整页缩放)。
- [x] 2.5 `CartButton` 高度 40 → 44px(`lg:h-10` 恢复),它是购买路径上的控件。

## 3. 首页

- [x] 3.1 5 个 section 的纵向节奏改 `.section-y`(`py-20` 的两处加 `lg:py-20` 保持桌面不变);
      内层间距 `mt-16` → `mt-10 sm:mt-16`。
- [x] 3.2 三处 CTA 补 `.tap-target`,字号下限抬到 12px(`lg:` 保留原下限)。
- [x] 3.3 6 处 section 标题 `clamp()` 下限收到 30px;其中 4 处在 ≥1024px 会改变计算结果,
      一律用 `lg:text-[原值]` 把桌面恢复(方案 §4 总原则)。
- [x] 3.4 名册 6 → 4 列(每格 76.75px)+ 常显名称(`title` 在触屏上永远不显示)。
- [x] 3.5 hero:品牌屏/促销屏补 `href` 并整屏包链接;指示条用伪元素把命中区向上扩 40px;
      箭头 20 → 44px;CTA `min-h-[44px]` + `lg:min-h-0`。
- [x] 3.6 `NewsGrid` / `UpcomingCard`:所有 `cqw` 字号加下限;主卡文字框 14% → 8%(改框不改字号);
      副卡胶囊 `px-[9cqw]` → `px-[6cqw]` + `truncate`(R14:11px 下 `WEEKEND IN MOTION` 临界);
      UpcomingCard 窄屏插画改贴右 58%、标语限宽 46%。

## 4. 商品卡

- [x] 4.1 区域徽章 9 → 11px;窄屏短文案 `US ONLY`,`sm` 起完整句;两段里只有一段进
      可访问性树(短的 `aria-hidden`,长的窄屏 `sr-only`)。
- [x] 4.2 信息行窄屏改上下两行(价格不再挤压名称),名称 `max-sm:line-clamp-2 sm:truncate`,
      名称链接补 `.tap-target--quiet`。
- [x] 4.3 New in 徽章 10 → 11px。
- [x] 4.4 售罄呈现:图上常显 `Sold out`、图片变淡、图片区取消跳转、售罄时不显示 New in
      (可用性优先于营销标签)。列表层**不过滤**(商家要靠列表看到哪些下架了)。

## 5. PDP(唯一 P0)

- [x] 5.1 版心/间距/画廊比例:根容器 `.container-site py-6 md:py-12`、栅格 `gap-6 md:gap-12`、
      画廊 `aspect-[4/5] md:aspect-[3/4]`、相关商品 `mt-10 md:mt-20`、3 → 2 列 + `sizes` 50vw。
- [x] 5.2 `StickyBuyBar`:三态都有条;在售 = 价格 + Add to bag,售罄 = 价格 + 禁用按钮,
      预告 = 只有 Revealing soon(**不给一个点了没反应的按钮**);`md:hidden`;
      `data-testid="pdp-buybar"`;断言 `position: sticky` 且**不是** `fixed`。
- [x] 5.3 信息区的 Add to Bag 加 `max-md:hidden`,避免同屏两个入口。
- [x] 5.4 面包屑与同系列缩略图补 44px 命中区 + 常显名称;缩略图条接 `.hscroll`。
- [x] 5.5 主图改成可切换的自图集(`ProductGallery`):数据层早在 `images(first: 10)`
      取回了最多 10 张,此前只渲染 `images[0]`,下方那条其实是"别的商品"。
- [x] 5.6 `toLiveProduct` 增加可选 `images?: string[]` 入参(不传 = 改动前的单图行为)。
- [x] 5.7 栅格项加 `min-w-0`:横滑条的 min-content(6×56+gap=386px)会把栅格轨道撑宽,
      375px 下实测整页横向溢出 402px。

## 6. 购物袋 / 结算链路

- [x] 6.1 抽屉:`w-[88%] max-w-md`(遮罩可点)、`supports-[height:100dvh]:h-dvh`、
      `safe-t` / `safe-b`、`overscroll-contain`、`useScrollLock(isOpen)`、关闭按钮 44px、
      步进器 44px + `gap-1`、Remove 用 `.tap-target--quiet`、商品名 `line-clamp-2`、
      横向内边距统一 16px(`lg:px-6` 保持桌面)。
- [x] 6.2 `/cart` 页与抽屉同一套值;`flex-wrap` 兜底 320px(步进器 + Remove 的最小内容宽
      203px + 缩略图 = 315px > 320 屏的 288px 版心)。
- [x] 6.3 结算 4xx:provider 区分 `unknown_items` / `unavailable_items` 并附
      `items: [{code, reason}]`;API 路由透传;`useCheckoutRedirect` 增加 `blocked`
      (**4xx 不跳转**);抽屉与 `/cart` 都渲染指名商品的文案(R12:两个调用点都要改)。
- [x] 6.4 `/checkout`(兜底页):空态 CTA 改胶囊按钮、摘要行 `order-first lg:order-none`、
      9 个控件补 `autoComplete` / `inputMode`。
- [x] 6.5 `cartCreate` 的 `attributes: [{key:"return_url"}]`(已用本店 Storefront 探针
      验证 `attributes: [AttributeInput!]` 在 schema 上存在),新增 `/checkout/return`。
- [x] 6.6 `/checkout/success` 只做版心对齐(`py-12 md:py-24`),卡片内边距不动。

## 7. 内容页

- [x] 7.1 About:4 个 section 换 `.container-site section-y` + 内层阅读宽度;
      12 段正文 `.lede` → `text-base leading-relaxed`(封面 48px 不动)。
- [x] 7.2 FAQ / 政策(索引 + 正文)/ bag-charm:页面 H1 抬到 36px;返回链接、联系信息补命中区;
      FAQ 的纵向内边距从 `<details>` 挪到 `<summary>`(消除 28px 的"假可点区域")。
- [x] 7.3 bag-charm:H1 下限用 `9.6vw`(写死 36px 时 `FashionableBag` 这个 14 字符
      不可断词在 320px 屏上会横向溢出)、右竖图窄屏改方形、首屏去掉重复补的 header 高度、
      quick-view 关闭按钮 44px + 滚动锁、SKU 行分行 + 12px。
- [x] 7.4 `ProductGrid`:`sm:gap-x-5` → `sm:gap-x-6`(`lg:gap-x-6` 保持不变)。

## 8. 验收

- [x] 8.1 `scripts/lib/cdp.mjs` + `scripts/audit-mobile.mjs`(零依赖 CDP):
      10 条路由 × 320/375/390;断言零横向溢出、购买路径 ≥44×44、全站 ≥24×24、
      无 <11px 可见文本、版心左边缘 = 16px;FAIL 非零退出。
      命中区用 `elementFromPoint` 向四周探测**真实可点区域**(伪元素扩出来的也算),
      所以 2.8px 高的指示条能被正确判为达标。
- [x] 8.2 `src/mobile-rules.test.ts`:源码级防回归(9/10px 字号、无下限 `cqw`、
      裸 `py-3 -my-3`、`max-w-*l` + `px-*`、裸 `h-8 w-8`)。
- [x] 8.3 行为断言:吸底条三态 + sticky、抽屉关闭/滚动锁、售罄文案不出现原始码、
      `/checkout/return` 清空袋子、`.tap-target` 生效、短徽章只进一次可访问性树、
      商品名不截断、reduced-motion 下 Marquee 文案完整、数据校验(featured 与 badge 互斥)。
- [x] 8.4 `pnpm typecheck` / `pnpm lint` / `pnpm test` 全绿(46 文件 / 355 测试)。
- [x] 8.5 移动端审计三档全通过(证据见交付说明)。

## 9. 文档

- [x] 9.1 本 change(proposal / tasks / design / 两个 capability 的 delta)。
- [x] 9.2 `redesign-02-visual.md` §4.4 徽章 `text-[10px]` → `text-[11px]`;
      §4.7 步进器 `w-10 h-10` → 窄屏 `h-11 w-11`(与 `02-ux-spec §5.2` 的 44×44 对齐,
      ≥1024px 仍按 `lg:` 恢复原尺寸)。
