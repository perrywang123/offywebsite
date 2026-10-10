import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Series } from "@/lib/catalog";

/** `series` 由根布局 [`layout.tsx`](src/app/[locale]/layout.tsx) 实时拉取
 * (`getLiveSeriesList()`)后下发,保证页脚系列名与 Shopify Collection 标题一致。
 * `locale` 同样由根布局下发 —— 系列名需要按当前语言选 zh/en,此前这里一直
 * 硬编码取 `s.name.en`,中文站也显示英文名,是一个实际的本地化缺陷。
 *
 * 第 4 列原本是 CONTACT(硬编码 hello@playcoretoys.com + 小红书),后来换成
 * 一列 6 条平级链接(4 条政策 + 联系 + FAQ);按设计稿改成 **HELP & SUPPORT 面板**
 * —— 两个大字入口(FAQ / CONTACT US)+ 细分隔线 + 弱化的「法律与政策」二级入口。
 * 那 4 条政策不再逐条铺在页脚,统一收进二级页 `/policies`。
 */
export async function Footer({ series, locale }: { series: Series[]; locale: string }) {
  const t = await getTranslations("common");
  const tp = await getTranslations("policies");

  // `.tap-target--quiet`:页脚这些文字链原本只有 ~16px 高(实测 343×16),低于
  // WCAG 2.5.8 的 24×24 底线;这个类的 padding 与等量负 margin 自相抵消,
  // 命中区变成 44px 而**视觉行高完全不动**(方案 §1.1 / 验收断言 3)。
  const linkCls =
    "tap-target--quiet focus-ring focus-ring--on-dark transition-colors hover:text-paper";
  /** 两个主入口:与 kicker 同一套排版语言(display 字体 + 大写 + 宽字距),只是大一号。 */
  const panelLinkCls = `${linkCls} font-display text-lg font-semibold uppercase tracking-[var(--tracking-14)] text-cream`;
  /** 二级入口:明显更小、颜色更弱,是"下一层"而不是主入口,所以不与上面两条同级。 */
  const subLinkCls =
    "tap-target--quiet focus-ring focus-ring--on-dark inline-flex items-center gap-1.5 text-xs uppercase tracking-[var(--tracking-10)] text-cream/50 transition-colors hover:text-cream";

  return (
    <footer className="bg-ink text-cream">
      {/* 链接列。768–1023px 用两列而不是四列:container-site 在该区间约 707px,
          四列每列仅 ~150px,而品牌简介自带 max-w-xs(320px),说明原设计预期
          该列 ≥320px。 */}
      <div className="container-site grid gap-10 py-16 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <div>
          <p className="text-cream/70 max-w-xs text-sm leading-relaxed">{t("footer.blurb")}</p>
        </div>
        <nav aria-label={t("nav.home") + " / " + t("nav.shop")}>
          <p className="kicker kicker--on-dark mb-4">{t("footer.menuHeading")}</p>
          <div className="text-cream/70 flex flex-col gap-3 text-xs tracking-[var(--tracking-14)] uppercase">
            <Link href="/" className={linkCls}>
              {t("nav.home")}
            </Link>
            <Link href="/products" className={linkCls}>
              {t("nav.shop")}
            </Link>
            <Link href="/collections" className={linkCls}>
              {t("nav.collections")}
            </Link>
            <Link href="/about" className={linkCls}>
              {t("nav.about")}
            </Link>
          </div>
        </nav>
        <nav aria-label={t("footer.collectionsHeading")}>
          <p className="kicker kicker--on-dark mb-4">{t("footer.collectionsHeading")}</p>
          <div className="text-cream/70 flex flex-col gap-3 text-xs tracking-[var(--tracking-10)] uppercase">
            {series.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/collections/${s.slug}`} className={linkCls}>
                {locale === "zh" ? s.name.zh : s.name.en}
              </Link>
            ))}
          </div>
        </nav>
        {/* HELP & SUPPORT —— 设计稿的四级层级:kicker(栏目名) → 两个大字入口
            → 细分隔线 → 小字弱化的「法律与政策」。分隔线是 border-t 纯样式
            (不放空的语义元素/图标库);`›` 是装饰,aria-hidden,屏幕阅读器读到的
            链接名仍是 "Legal & Policies",不会念成 "greater than"。
            aria-label 与 MENU / COLLECTIONS 两列同一写法,直接用栏目名。 */}
        <nav aria-label={t("footer.policiesHeading")}>
          <p className="kicker kicker--on-dark mb-4">{t("footer.policiesHeading")}</p>
          <div className="flex flex-col items-start gap-3">
            <Link href="/faq" className={panelLinkCls}>
              {t("footer.faqLabel")}
            </Link>
            <Link href="/policies/contact" className={panelLinkCls}>
              {t("footer.contactLabel")}
            </Link>
          </div>
          <div className="border-cream/10 mt-5 border-t pt-4">
            <Link href="/policies" className={subLinkCls}>
              {tp("legalLabel")}
              <span aria-hidden className="text-cream/40">
                ›
              </span>
            </Link>
          </div>
        </nav>
      </div>

      {/* 版权细条 */}
      <div className="border-cream/10 border-t py-6">
        <div className="container-site text-cream/50 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* © 行已并入上面的法律声明块(Excel 第 20 行),这里不再重复;
              右侧保留品牌 slogan。 */}
          <span className="sr-only">{t("brand")}</span>
          <span className="ml-auto">{t("taglineEn")}</span>
        </div>
      </div>
    </footer>
  );
}
