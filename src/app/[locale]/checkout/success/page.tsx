import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function CheckoutSuccessPage() {
  const t = await getTranslations("checkout");
  const ta = await getTranslations("common.actions");

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-3xl text-paper">
        ✓
      </div>
      <h1 className="font-display text-4xl font-semibold">{t("successTitle")}</h1>
      <p className="mt-4 text-ink-soft">{t("successBody")}</p>
      <Link
        href="/products"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper"
      >
        {ta("continueShopping")}
      </Link>
    </div>
  );
}
