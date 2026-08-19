import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";

export function ProductCard({ product, locale }: { product: Product; locale: string }) {
  return (
    <div className="group">
      <Link
        href={`/products/${product.code}`}
        className="relative block rounded-card bg-paper p-2 shadow-soft transition-shadow duration-300 group-hover:shadow-card-hover"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-[calc(var(--radius-card)-8px)] bg-cream-deep">
          <Image
            src={product.images[0]}
            alt={locale === "zh" ? product.name.zh : product.name.en}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 ease-editorial group-hover:scale-[1.03]"
          />
        </div>
        {product.featured && (
          <span className="absolute left-4 top-4 rounded-full bg-brown-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brown-700">
            New
          </span>
        )}
        {product.isUpcoming && (
          <span className="absolute inset-x-4 bottom-4 rounded-full bg-ink/80 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-cream">
            {locale === "zh" ? "待揭晓" : "Revealing soon"}
          </span>
        )}
      </Link>
      <div className="pt-3">
        <Link href={`/products/${product.code}`}>
          <h3 className="truncate text-base font-medium text-ink">
            {locale === "zh" ? product.name.zh : product.name.en}
          </h3>
        </Link>
        <p className="mt-0.5 text-sm font-medium text-ink-soft tabular-nums">
          {product.isUpcoming
            ? locale === "zh" ? "待揭晓" : "Revealing soon"
            : formatUsdCents(product.priceCents, locale)}
        </p>
      </div>
    </div>
  );
}
