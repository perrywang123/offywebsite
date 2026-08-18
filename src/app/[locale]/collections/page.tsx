import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductsBySeries, seriesList } from "@/lib/catalog";

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("catalog");

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <h1 className="mb-2 font-display text-4xl font-black md:text-5xl">{t("title")}</h1>
      <p className="mb-10 text-ink-500">{t("subtitle")}</p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {seriesList.map((s) => {
          const count = getProductsBySeries(s.slug).length;
          return (
            <Link
              key={s.slug}
              href={`/collections/${s.slug}`}
              className="group rounded-2xl bg-paper p-8 transition-shadow hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-cocoa-600">
                {count} {locale === "zh" ? "个形象" : "looks"}
              </p>
              <h2 className="mt-2 font-display text-2xl font-black">
                {locale === "zh" ? s.name.zh : s.name.en}
              </h2>
              <p className="mt-2 text-sm text-ink-500">
                {locale === "zh" ? s.tagline.zh : s.tagline.en}
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-ink-900 underline">
                {locale === "zh" ? "查看系列" : "View series"} →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
