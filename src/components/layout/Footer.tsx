import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { seriesList } from "@/lib/catalog";

export async function Footer() {
  const t = await getTranslations("common");

  return (
    <footer className="bg-ink text-cream">
      {/* 链接列 */}
      <div className="container-site grid gap-10 py-16 md:grid-cols-4 md:gap-8">
        <div>
          <p className="max-w-xs text-sm leading-relaxed text-cream/70">
            {t("tagline")} — Offy 是我们创造的第一个小精灵，把情绪穿在身上的黑肤色卡通 IP。
          </p>
        </div>
        <nav>
          <p className="kicker kicker--on-dark mb-4">Menu</p>
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.14em] text-cream/70">
            <Link href="/" className="transition-colors hover:text-paper">{t("nav.home")}</Link>
            <Link href="/products" className="transition-colors hover:text-paper">{t("nav.shop")}</Link>
            <Link href="/collections" className="transition-colors hover:text-paper">{t("nav.collections")}</Link>
            <Link href="/about" className="transition-colors hover:text-paper">{t("nav.about")}</Link>
          </div>
        </nav>
        <nav>
          <p className="kicker kicker--on-dark mb-4">Collections</p>
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.1em] text-cream/70">
            {seriesList.slice(0, 6).map((s) => (
              <Link key={s.slug} href={`/collections/${s.slug}`} className="transition-colors hover:text-paper">
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

      {/* 版权细条 */}
      <div className="border-t border-cream/10 py-6">
        <div className="container-site flex flex-wrap items-center justify-between gap-4 text-xs text-cream/50">
          <span>© {new Date().getFullYear()} {t("brand")} · {t("footer.rights")}</span>
          <span>{t("taglineEn")}</span>
        </div>
      </div>
    </footer>
  );
}
