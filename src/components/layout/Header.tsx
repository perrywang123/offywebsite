import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CartButton } from "@/components/cart/CartButton";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function Header() {
  const t = await getTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-xl font-black tracking-tight text-ink-900">
          {t("brandShort")}
        </Link>
        <nav className="hidden gap-8 text-sm text-ink-700 md:flex">
          <Link href="/" className="hover:text-ink-900">
            {t("nav.home")}
          </Link>
          <Link href="/products" className="hover:text-ink-900">
            {t("nav.shop")}
          </Link>
          <Link href="/collections" className="hover:text-ink-900">
            {t("nav.collections")}
          </Link>
          <Link href="/about" className="hover:text-ink-900">
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
