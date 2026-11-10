import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Product, Series } from "@/lib/catalog/types";
import type { HomeLooksData } from "@/server/catalog/home";
import { formatPrice } from "@/lib/pricing";
import { regionBadgeShortLabel } from "@/lib/geo";

export interface HomeLooksLabels {
  eyebrow: string;
  featured: string;
  newest: string;
  description: string;
  viewAll: string;
  regional: string;
  regionalDescription: string;
  empty: string;
  series: string;
  soldOut: string;
}
function LookCard({
  product,
  locale,
  soldOutLabel,
  compact = false,
}: {
  product: Product;
  locale: string;
  soldOutLabel: string;
  compact?: boolean;
}) {
  const name = locale === "zh" ? product.name.zh : product.name.en;
  const content = (
    <>
      <div className="home-look-media">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={name}
            fill
            sizes={
              compact
                ? "(max-width: 640px) 44vw, 240px"
                : "(max-width: 640px) 44vw, (max-width: 1400px) 29vw, 410px"
            }
            className={`home-look-image ${!product.isAvailable ? "opacity-60" : ""}`}
          />
        ) : (
          <span className="text-ink-soft absolute inset-0 flex items-center justify-center text-xs">
            Image coming soon
          </span>
        )}
        {!product.isAvailable && <span className="home-look-status">{soldOutLabel}</span>}
      </div>
      <div className="home-look-details">
        <h3>
          {product.isAvailable ? name : <Link href={`/products/${product.code}`}>{name}</Link>}
        </h3>
        <span className="home-look-price">
          {formatPrice(product.priceCents, product.currency, locale)}
        </span>
        {product.badge && (
          <span className="home-look-region">{regionBadgeShortLabel(product.badge)}</span>
        )}
      </div>
    </>
  );
  return product.isAvailable ? (
    <Link href={`/products/${product.code}`} title={name} className="home-look-card group">
      {content}
    </Link>
  ) : (
    <div className="home-look-card">{content}</div>
  );
}

export function HomeLooks({
  data,
  series,
  locale,
  labels,
}: {
  data: HomeLooksData;
  series: readonly Series[];
  locale: string;
  labels: HomeLooksLabels;
}) {
  const title = data.source === "featured" ? labels.featured : labels.newest;
  return (
    <div className="home-looks-wrap">
      <section aria-labelledby="home-looks-heading" className="home-looks-main">
        <div className="home-looks-heading">
          <div>
            <p className="home-looks-eyebrow">{labels.eyebrow}</p>
            <h2 id="home-looks-heading">{title}</h2>
            <p className="home-looks-description">{labels.description}</p>
          </div>
          <Link href="/products" className="home-looks-all">
            {labels.viewAll}
            <span aria-hidden>↗</span>
          </Link>
        </div>
        {data.products.length ? (
          <ul className="home-looks-grid">
            {data.products.map((product) => (
              <li key={product.code}>
                <LookCard product={product} locale={locale} soldOutLabel={labels.soldOut} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-looks-empty">{labels.empty}</p>
        )}
      </section>
      {data.regionals.length > 0 && (
        <section aria-labelledby="home-regionals-heading" className="home-looks-regional">
          <div className="home-looks-regional-heading">
            <h2 id="home-regionals-heading">{labels.regional}</h2>
            <p className="home-looks-description">{labels.regionalDescription}</p>
          </div>
          <ul className="home-regionals-grid">
            {data.regionals.map((product) => (
              <li key={product.code}>
                <LookCard product={product} locale={locale} soldOutLabel={labels.soldOut} compact />
              </li>
            ))}
          </ul>
        </section>
      )}
      {series.length > 0 && (
        <nav className="home-series-links" aria-label={labels.series}>
          {series.map((item) => (
            <Link key={item.slug} href={`/collections/${item.slug}`}>
              <span>{locale === "zh" ? item.name.zh : item.name.en}</span>
              <span aria-hidden>↗</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
