import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("common");

  return (
    <footer className="mt-24 bg-ink-900 text-cream-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-xl font-black">{t("brand")}</p>
          <p className="mt-3 max-w-xs text-sm text-cream-50/70">{t("tagline")}</p>
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold text-pop-yellow">{t("language")}</p>
          <nav className="flex flex-col gap-2 text-sm text-cream-50/80">
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
          <p className="mb-4 text-sm font-semibold text-pop-yellow">{t("footer.contact")}</p>
          <p className="text-sm text-cream-50/80">hello@playcoretoys.com</p>
        </div>
      </div>
      <div className="border-t border-cream-50/10 py-6 text-center text-xs text-cream-50/50">
        © {new Date().getFullYear()} PLAYCORE · {t("footer.rights")}
      </div>
    </footer>
  );
}
