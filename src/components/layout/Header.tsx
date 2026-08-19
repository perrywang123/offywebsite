import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CartButton } from "@/components/cart/CartButton";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function Header() {
  const t = await getTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-cream-line bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            {t("brandLatin")}
          </span>
          <span className="text-sm font-medium text-ink-soft">{t("brandZh")}</span>
        </Link>
        <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.14em] text-ink-soft md:flex">
          <Link href="/" className="link-line hover:text-ink">
            {t("nav.home")}
          </Link>
          <Link href="/products" className="link-line hover:text-ink">
            {t("nav.shop")}
          </Link>
          <Link href="/collections" className="link-line hover:text-ink">
            {t("nav.collections")}
          </Link>
          <Link href="/about" className="link-line hover:text-ink">
            {t("nav.about")}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
