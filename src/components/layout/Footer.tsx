import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("common");

  return (
    <footer className="mt-24 bg-ink text-cream">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight">{t("brandLatin")}</p>
          <p className="mt-1 text-sm text-cream/60">{t("brandZh")}</p>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-cream/70">{t("tagline")}</p>
          <p className="mt-2 text-sm text-cream/50">{t("taglineEn")}</p>
        </div>
        <div>
          <p className="kicker kicker--on-dark mb-4">Menu</p>
          <nav className="flex flex-col gap-3 text-xs uppercase tracking-[0.14em] text-cream/70">
            <Link href="/" className="hover:text-paper">
              {t("nav.home")}
            </Link>
            <Link href="/products" className="hover:text-paper">
              {t("nav.shop")}
            </Link>
            <Link href="/about" className="hover:text-paper">
              {t("nav.about")}
            </Link>
          </nav>
        </div>
        <div>
          <p className="kicker kicker--on-dark mb-4">{t("footer.contact")}</p>
          <p className="text-sm text-cream/70">hello@playcoretoys.com</p>
          <p className="mt-3 text-sm text-cream/70">{t("footer.social")}</p>
        </div>
      </div>
      <div className="border-t border-cream/10 py-6 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} PLAYCORE · {t("footer.rights")}
      </div>
    </footer>
  );
}
