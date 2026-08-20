import { getTranslations } from "next-intl/server";
import { getProducts, seriesList } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CategoryTabs } from "@/components/layout/CategoryTabs";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("catalog");

  const products = getProducts();

  return (
    <>
      <CategoryTabs series={seriesList} active={undefined} locale={locale} />
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <header className="mb-10">
          <p className="kicker mb-3">Catalog · {products.length} Looks</p>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-tight md:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-ink-soft">{t("subtitle")}</p>
        </header>

        <ProductGrid products={products} locale={locale} />
      </div>
    </>
  );
}
