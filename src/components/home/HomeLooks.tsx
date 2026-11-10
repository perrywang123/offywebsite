import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { MERCH_SERIES_SLUG, type Product } from "@/lib/catalog";
import type { HomeLooksData } from "@/server/catalog/home";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/Reveal";

export interface HomeLooksLabels {
  featured: string;
  viewAll: string;
  regional: string;
  empty: string;
}

// Keep the original photographic cards and grid for both selections.
const headingClass = "font-display text-2xl font-semibold tracking-tight md:text-3xl";
const gridClass = "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8";

export function HomeLooks({
  data,
  locale,
  labels,
}: {
  data: HomeLooksData;
  locale: string;
  labels: HomeLooksLabels;
}) {
  return (
    <>
      <section aria-labelledby="home-looks-heading">
        <Reveal className="mb-8 flex items-end justify-between gap-4">
          <h3 id="home-looks-heading" className={headingClass}>
            {labels.featured}
          </h3>
          <Link href="/products" className="link-line tap-target text-sm lg:min-h-0">
            {labels.viewAll}
          </Link>
        </Reveal>
        {data.products.length ? (
          <ul className={gridClass}>
            {data.products.map((product, i) => (
              <li key={product.code}>
                <Reveal delay={Math.min(i, 5) * 60}>
                  <ProductCard
                    product={product}
                    locale={locale}
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft py-9 text-sm">{labels.empty}</p>
        )}
      </section>
      {data.regionals.length > 0 && (
        <section aria-labelledby="home-regionals-heading" className="mt-10 sm:mt-16">
          <Reveal className="mb-8">
            <h3 id="home-regionals-heading" className={headingClass}>
              {labels.regional}
            </h3>
          </Reveal>
          <ul className={gridClass}>
            {data.regionals.map((product) => (
              <li key={product.code}>
                <Reveal>
                  <ProductCard
                    product={product}
                    locale={locale}
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function HomeProductRoster({
  products,
  locale,
  title,
}: {
  products: readonly Product[];
  locale: string;
  title: string;
}) {
  const roster = products.filter((product) => product.series !== MERCH_SERIES_SLUG);
  return (
    <section aria-labelledby="home-roster-heading" className="mt-10 sm:mt-16">
      <h3 id="home-roster-heading" className="text-ink-soft text-sm font-normal">
        {title}
      </h3>
      <Reveal className="mt-6">
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-3 lg:grid-cols-12">
          {roster.map((product) => {
            const name = locale === "zh" ? product.name.zh : product.name.en;
            return (
              <li key={product.code}>
                <Link
                  href={`/products/${product.code}`}
                  title={name}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span className="border-sand bg-cream-deep group-hover:border-brown-600 relative block aspect-square w-full max-w-16 overflow-hidden rounded-full border transition-colors">
                    {product.isUpcoming ? (
                      <span className="text-ink-muted flex h-full w-full items-center justify-center text-xs font-semibold">
                        ?
                      </span>
                    ) : product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name.en}
                        fill
                        sizes="64px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : null}
                  </span>
                  <span className="text-ink-soft w-full truncate text-center text-[11px] leading-tight">
                    {name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
