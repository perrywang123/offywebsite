import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProducts, getProductsBySeries, seriesList } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";

function pill(active: boolean) {
  return active
    ? "rounded-full bg-ink px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-cream"
    : "rounded-full border border-sand bg-paper px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-soft hover:border-ink";
}

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
        <p className="kicker mb-3">Catalog · {products.length} Looks</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{t("title")}</h1>
        <p className="mt-2 text-ink-soft">{t("subtitle")}</p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/products" className={pill(!series)}>
          {t("filterAll")}
        </Link>
        {seriesList.map((s) => (
          <Link key={s.slug} href={`/products?series=${s.slug}`} className={pill(series === s.slug)}>
            {locale === "zh" ? s.name.zh : s.name.en}
          </Link>
        ))}
      </div>

      <ProductGrid products={products} locale={locale} />
    </div>
  );
}
