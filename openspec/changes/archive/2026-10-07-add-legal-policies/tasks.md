# Tasks

> 每个改动行为的任务以「测试通过」收尾。执行顺序:失败测试 → 最小实现 → 重构。

## 1. 数据层

- [x] 1.1 `src/lib/sanitize.ts` + `sanitize.test.ts`(TDD):白名单标签保留、属性全剥、
      `script`/`style` 连内容丢弃、`href` 协议校验、实体不被二次转义。
      过程中实测出两个真 bug 并修掉:散落的 `<`(如 `a < b`)会被误判成标签开头;
      空 href 仍会输出 `rel`/`target` 造成空壳 `<a>`。
- [x] 1.2 `src/server/catalog/policies.ts` + `policies.test.ts`:五个 handle 白名单与顺序、
      `isPolicyHandle` 只认白名单、一次查询取回四个政策并消毒、联系信息走静态且不发请求、
      Shopify 不可达 / 非 2xx / 该政策为空三种情况都返回 `bodyHtml: null` 而不抛错。
- [x] 1.3 查询带 `?ck=shop-policies` 缓存键护栏、`revalidate: 300`(对齐 `catalog.ts`
      顶部记录的缓存串味事故)。

## 2. 路由与页面

- [x] 2.1 `src/app/[locale]/policies/[handle]/page.tsx`:`generateStaticParams` 产出五个 handle;
      白名单外的 handle 立即 `notFound()`;`generateMetadata` 出标题/描述/canonical
      (**不指向** `checkout.shopify.com` 的 `url` 字段)。
- [x] 2.2 长文页用浅色底 + `max-w-[68ch]` 正文列;正文走消毒后的
      `dangerouslySetInnerHTML`,取不到时显示兜底提示而不是空白页。
- [x] 2.3 联系信息页用 `<dl>` 结构化字段;邮箱 `mailto:`、Instagram 外链带
      `rel="noopener noreferrer"`;字段值英文原文照抄。
- [x] 2.4 中文站渲染「语言说明」提示条,正文容器 `lang="en"`;英文站不渲染该提示。

## 3. 样式

- [x] 3.1 `globals.css` 新增 `.policy-body` 作用域块(正文无法挂 class,只能写后代选择器):
      标题层级、段距、列表、引用、表格、正文链接常驻下划线。
- [x] 3.2 `globals.css` 新增 `.focus-ring` / `.focus-ring--on-dark`:补齐全站文字链接
      缺失的 `focus-visible` 焦点样式。

## 4. 页脚

- [x] 4.1 第 4 列 CONTACT → 「政策与联系」,5 条入口与 MENU / COLLECTIONS 同级。
- [x] 4.2 栅格 `md:grid-cols-4` → `md:grid-cols-2 lg:grid-cols-4`。
- [x] 4.3 三个 `<nav>` 补 `aria-label`;所有页脚链接加 `focus-ring`。
- [x] 4.4 i18n:新增 `policies` 命名空间 + `common.footer.policiesHeading`;
      删除 `common.footer.contact` / `social`(删列后成死键),中英 key 集合保持一致。

## 5. 一致性与收录

- [x] 5.1 首页联名洽谈 CTA 邮箱 `hello@playcoretoys.com` → `contact@whimcoreofficial.com`。
- [x] 5.2 `src/app/sitemap.ts` 加入五个政策 URL(双语言自动展开)。
- [x] 5.3 `robots.txt` 未阻拦 `/policies`(现规则只禁 `/api/`、`cart`、`checkout`)。

## 6. 构建

- [x] 6.1 `Dockerfile` 从 deps 阶段复制 corepack 缓存:重建时实测
      `corepack` 会为 builder 阶段重新下载 pnpm,构建机出网被重置时
      `ECONNRESET` 直接构建失败。

## 7. 验收(已在容器 `:3000` 实测)

- [x] 7.1 5 handle × 2 语言 = 10 个页面全部 200,正文 1.2 万~3.7 万字符。
- [x] 7.2 `/en/policies/unknown` 与 `/en/policies/legal-notice` → 404。
- [x] 7.3 页脚恰好 5 条政策链接,顺序 returns → privacy → terms → shipping → contact。
- [x] 7.4 全站 HTML 不含 `playcoretoys.com`;旧 CONTACT 列已消失。
- [x] 7.5 中文站有语言提示条、正文 `lang="en"`;英文站无该提示条。
- [x] 7.6 联系信息页含实体名、公司编号、注册地址、客服邮箱、Instagram,
      邮箱为 `mailto:`,Instagram 带 `noopener noreferrer`,共 4 组 `<dt>/<dd>`。
- [x] 7.7 sitemap 含五个政策 URL;robots 未阻拦。
- [x] 7.8 `pnpm typecheck` / `pnpm lint` / `pnpm test` 全绿(225/225)。

## 8. 未做(明确排除 / 后续)

- [ ] 8.1 自建结算页 `[locale]/checkout` 加政策链接 —— Stripe/PayPal 审核确实会看这一处,
      但本次需求限定在页脚,留作后续加固项。
- [ ] 8.2 Stripe Session 参数级条款同意(`custom_text.terms_of_service_acceptance`):
      本地 `node_modules/stripe` 未随包提供类型定义,无法离线核对字段名,实现前需对照
      当前 API 文档确认。
- [ ] 8.3 政策中文译文:等业务方在 Shopify Translate & Adapt 配好,接口即返回中文,
      届时只需把语言提示条换掉。
- [ ] 8.4 构建时政策正文快照(Shopify 长时不可达时的最终兜底):属加固项。
- [ ] 8.5 「法律声明」:Shopify 后台未设置、公开页 404,不展示空入口。
