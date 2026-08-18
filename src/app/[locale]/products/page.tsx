import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProducts, getProductsBySeries, seriesList } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ series?: string }>;
}) {
  const { locale } = await params;
  const { series } = await searchParams;
  const t = await getTranslations("catalog");

  const products = series ? getProductsBySeries(series) : getProducts();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-black md:text-5xl">{t("title")}</h1>
        <p className="mt-2 text-ink-500">{t("subtitle")}</p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/products"
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            !series ? "bg-ink-900 text-paper" : "border border-sand-200 bg-paper text-ink-700 hover:border-ink-900"
          }`}
        >
          {t("filterAll")}
        </Link>
        {seriesList.map((s) => (
          <Link
            key={s.slug}
            href={`/products?series=${s.slug}`}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              series === s.slug
                ? "bg-ink-900 text-paper"
                : "border border-sand-200 bg-paper text-ink-700 hover:border-ink-900"
            }`}
          >
            {locale === "zh" ? s.name.zh : s.name.en}
          </Link>
        ))}
      </div>

      <ProductGrid products={products} locale={locale} />
    </div>
  );
}
