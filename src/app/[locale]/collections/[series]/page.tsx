import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductsBySeries, getSeries, seriesList } from "@/lib/catalog";
import { enrichProducts } from "@/server/catalog/enrich";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CategoryTabs } from "@/components/layout/CategoryTabs";
import { Reveal } from "@/components/Reveal";

export const revalidate = 60;

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ locale: string; series: string }>;
}) {
  const { locale, series: slug } = await params;
  const series = getSeries(slug);
  if (!series) notFound();

  const products = await enrichProducts(getProductsBySeries(slug));
  const idx = seriesList.findIndex((s) => s.slug === slug);
  const name = locale === "zh" ? series.name.zh : series.name.en;
  const tagline = locale === "zh" ? series.tagline.zh : series.tagline.en;

  return (
    <>
      <CategoryTabs series={seriesList} active={slug} locale={locale} />

      {/* 分类大图 hero(系列专属头图,与首页轮播图一致) */}
      <section className="relative flex min-h-[62vh] items-end overflow-hidden bg-ink">
        <div className="animate-ken-burns absolute inset-0">
          <Image
            src={series.heroImage}
            alt={name}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
        <div className="grain absolute inset-0 opacity-[0.05]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-14 lg:px-8">
          <p className="kicker kicker--on-dark mb-3">
            OFFY · Series {String(idx + 1).padStart(2, "0")} · {products.length} Looks
          </p>
          <h1 className="max-w-3xl font-display text-5xl font-semibold uppercase leading-[0.95] tracking-tight text-cream md:text-7xl">
            {name}
          </h1>
          <p className="mt-4 max-w-md text-lg text-cream/80">{tagline}</p>
        </div>
      </section>

      {/* 产品网格 */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-8">
        <Reveal className="mb-8 flex items-end justify-between">
          <p className="kicker">{products.length} {locale === "zh" ? "个形象" : "Looks"}</p>
        </Reveal>
        <ProductGrid products={products} locale={locale} density="series" />
      </section>
    </>
  );
}
