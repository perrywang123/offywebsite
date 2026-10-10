import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Series } from "@/lib/catalog";
import { POLICY_HANDLES } from "@/server/catalog/policies";

/** `series` 由根布局 [`layout.tsx`](src/app/[locale]/layout.tsx) 实时拉取
 * (`getLiveSeriesList()`)后下发,保证页脚系列名与 Shopify Collection 标题一致。
 * `locale` 同样由根布局下发 —— 系列名需要按当前语言选 zh/en,此前这里一直
 * 硬编码取 `s.name.en`,中文站也显示英文名,是一个实际的本地化缺陷。
 *
 * 第 4 列原本是 CONTACT(硬编码 hello@playcoretoys.com + 小红书),已替换为
 * 「政策与联系」—— 那个邮箱属于旧实体域名、与政策正文里的 Whimcore 实体不一致,
 * 留着会出现两套联系信息。政策入口与政策页共用 `policies.titles.*` 一份文案。
 */
export async function Footer({ series, locale }: { series: Series[]; locale: string }) {
  const t = await getTranslations("common");
  const tp = await getTranslations("policies");
  const tf = await getTranslations("faq");

  const linkCls =
    "focus-ring focus-ring--on-dark transition-colors hover:text-paper";

  return (
    <footer className="bg-ink text-cream">
      {/* 链接列。768–1023px 用两列而不是四列:container-site 在该区间约 707px,
          四列每列仅 ~150px,而品牌简介自带 max-w-xs(320px),说明原设计预期
          该列 ≥320px;新增政策列的长标签(TERMS OF SERVICE)会开始折行。 */}
      <div className="container-site grid gap-10 py-16 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <div>
          <p className="max-w-xs text-sm leading-relaxed text-cream/70">{t("footer.blurb")}</p>
        </div>
        <nav aria-label={t("nav.home") + " / " + t("nav.shop")}>
          <p className="kicker kicker--on-dark mb-4">{t("footer.menuHeading")}</p>
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[var(--tracking-14)] text-cream/70">
            <Link href="/" className={linkCls}>{t("nav.home")}</Link>
            <Link href="/products" className={linkCls}>{t("nav.shop")}</Link>
            <Link href="/collections" className={linkCls}>{t("nav.collections")}</Link>
            <Link href="/about" className={linkCls}>{t("nav.about")}</Link>
          </div>
        </nav>
        <nav aria-label={t("footer.collectionsHeading")}>
          <p className="kicker kicker--on-dark mb-4">{t("footer.collectionsHeading")}</p>
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[var(--tracking-10)] text-cream/70">
            {series.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/collections/${s.slug}`} className={linkCls}>
                {locale === "zh" ? s.name.zh : s.name.en}
              </Link>
            ))}
          </div>
        </nav>
        {/* 政策与联系 —— 顺序与需求一致:退货退款 → 隐私 → 条款 → 物流 → 联系信息。
            与 MENU / COLLECTIONS 完全同级:同 kicker、同字号字距、同 hover,
            不新增第三种链接样式,也不加图标/分隔线。 */}
        <nav aria-label={tp("navAriaLabel")}>
          <p className="kicker kicker--on-dark mb-4">{t("footer.policiesHeading")}</p>
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[var(--tracking-14)] text-cream/70">
            {POLICY_HANDLES.map((handle) => (
              <Link key={handle} href={`/policies/${handle}`} className={linkCls}>
                {tp(`titles.${handle}`)}
              </Link>
            ))}
            {/* Q&A 入口。放在这一组末尾(用户指定),与上面 5 条政策同级同样式。 */}
            <Link href="/faq" className={linkCls}>
              {tf("title")}
            </Link>
          </div>
        </nav>
      </div>

      {/* 版权细条 */}
      <div className="border-t border-cream/10 py-6">
        <div className="container-site flex flex-wrap items-center justify-between gap-4 text-xs text-cream/50">
          {/* © 行已并入上面的法律声明块(Excel 第 20 行),这里不再重复;
              右侧保留品牌 slogan。 */}
          <span className="sr-only">{t("brand")}</span>
          <span className="ml-auto">{t("taglineEn")}</span>
        </div>
      </div>
    </footer>
  );
}
