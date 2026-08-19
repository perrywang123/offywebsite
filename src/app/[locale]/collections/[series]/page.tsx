import Image from "next/image";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getProductsBySeries, getSeries, seriesList } from "@/lib/catalog";
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
  const first = products[0];
  const idx = seriesList.findIndex((s) => s.slug === slug);
  const name = locale === "zh" ? series.name.zh : series.name.en;
  const tagline = locale === "zh" ? series.tagline.zh : series.tagline.en;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      {/* 页头：左文右大图拼贴 */}
      <header className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
        <div>
          <nav className="mb-6 text-xs uppercase tracking-[0.14em] text-ink-muted">
            <Link href="/collections" className="hover:text-ink">
              All Series
            </Link>
            <span className="mx-2 text-sand">/</span>
            <span className="text-ink-soft">{name}</span>
          </nav>
          <p className="kicker mb-3">
            Series {String(idx + 1).padStart(2, "0")} · {products.length} Looks
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{name}</h1>
          <p className="lede mt-4 max-w-md">{tagline}</p>
        </div>
        <div className="relative" data-slot="series-hero">
          <div className="relative aspect-[3/4] overflow-hidden rounded-block bg-paper shadow-card">
            {first && (
              <Image
                src={first.images[0]}
                alt={name}
                fill
                sizes="(max-width:1024px) 100vw, 50vw"
                className="object-cover"
              />
            )}
          </div>
          {products.length >= 3 && (
            <div className="absolute -left-6 bottom-8 hidden w-24 rotate-[-2deg] overflow-hidden rounded-soft bg-paper shadow-card md:block md:w-32">
              <div className="relative aspect-[3/4]">
                <Image src={products[1].images[0]} alt="" fill sizes="128px" className="object-cover" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 编辑导语 */}
      <section className="mt-16 border-y border-cream-line py-12 text-center md:py-16">
        <p className="mx-auto max-w-2xl font-display text-2xl font-medium tracking-tight text-ink md:text-3xl">
          {tagline}
        </p>
      </section>

      {/* 产品列表 */}
      <section className="mt-16 md:mt-24">
        <div className="mb-8 flex items-end justify-between">
          <p className="kicker">{products.length} Looks</p>
          <Link href="/collections" className="link-line text-xs uppercase tracking-[0.14em]">
            All Series →
          </Link>
        </div>
        <ProductGrid products={products} locale={locale} density="series" />
      </section>
    </div>
  );
}
