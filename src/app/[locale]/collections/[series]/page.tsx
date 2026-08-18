import { notFound } from "next/navigation";
import { getProductsBySeries, getSeries } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ locale: string; series: string }>;
}) {
  const { locale, series: slug } = await params;
  const series = getSeries(slug);
  if (!series) notFound();

  const products = getProductsBySeries(slug);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-display text-4xl font-black md:text-5xl">
          {locale === "zh" ? series.name.zh : series.name.en}
        </h1>
        <p className="mt-3 text-lg text-ink-700">{locale === "zh" ? series.tagline.zh : series.tagline.en}</p>
      </header>
      <ProductGrid products={products} locale={locale} />
    </div>
  );
}
