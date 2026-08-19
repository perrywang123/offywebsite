import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { seriesList } from "@/lib/catalog";

export async function Footer() {
  const t = await getTranslations("common");

  return (
    <footer className="mt-24 bg-ink text-cream">
      {/* 上区：大字品牌名签名 */}
      <div className="border-b border-cream/10 pb-12 md:pb-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="font-display text-6xl font-semibold tracking-tight text-cream md:text-8xl lg:text-[9rem] lg:leading-none">
            {t("brandLatin")}
          </p>
          <p className="kicker kicker--on-dark mt-6">{t("taglineEn")}</p>
          <p className="mt-3 text-sm text-cream/60">
            {t("brandZh")} · {t("tagline")}
          </p>
        </div>
      </div>

      {/* 中区 4 列 */}
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4 md:gap-8 lg:px-8">
        <div>
          <p className="max-w-xs text-sm leading-relaxed text-cream/70">
            {t("tagline")} — Offy 是我们创造的第一个小精灵，把情绪穿在身上的黑肤色卡通 IP。
          </p>
        </div>
        <nav>
          <p className="kicker kicker--on-dark mb-4">Menu</p>
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.14em] text-cream/70">
            <Link href="/" className="hover:text-paper">{t("nav.home")}</Link>
            <Link href="/products" className="hover:text-paper">{t("nav.shop")}</Link>
            <Link href="/collections" className="hover:text-paper">{t("nav.collections")}</Link>
            <Link href="/about" className="hover:text-paper">{t("nav.about")}</Link>
          </div>
        </nav>
        <nav>
          <p className="kicker kicker--on-dark mb-4">Collections</p>
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.1em] text-cream/70">
            {seriesList.map((s) => (
              <Link key={s.slug} href={`/collections/${s.slug}`} className="hover:text-paper">
                {s.name.en}
              </Link>
            ))}
          </div>
        </nav>
        <div>
          <p className="kicker kicker--on-dark mb-4">{t("footer.contact")}</p>
          <p className="text-sm text-cream/70">hello@playcoretoys.com</p>
          <p className="mt-3 text-sm text-cream/70">{t("footer.social")}</p>
        </div>
      </div>

      {/* 底细条 */}
      <div className="border-t border-cream/10 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-cream/50 lg:px-8">
          <span>© {new Date().getFullYear()} {t("brand")} · {t("footer.rights")}</span>
          <span>{t("taglineEn")}</span>
        </div>
      </div>
    </footer>
  );
}
