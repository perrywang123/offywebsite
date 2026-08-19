import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";

export function ProductCard({
  product,
  locale,
  sizes = "(max-width: 768px) 50vw, 33vw",
}: {
  product: Product;
  locale: string;
  sizes?: string;
}) {
  return (
    <div className="group">
      <Link
        href={`/products/${product.code}`}
        className="relative block rounded-card bg-paper p-3 shadow-soft transition-[box-shadow,transform] duration-500 ease-editorial group-hover:-translate-y-1 group-hover:shadow-card-hover md:p-4"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-[calc(var(--radius-card)-8px)] bg-cream-deep ring-1 ring-inset ring-cream-line">
          <Image
            src={product.images[0]}
            alt={locale === "zh" ? product.name.zh : product.name.en}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-500 ease-editorial group-hover:scale-[1.02]"
          />
        </div>
        {product.featured && (
          <span className="absolute left-6 top-6 rounded-full bg-brown-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brown-700">
            New
          </span>
        )}
        {product.isUpcoming && (
          <span className="absolute inset-x-6 bottom-6 rounded-full bg-ink/80 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-cream">
            {locale === "zh" ? "待揭晓" : "Revealing soon"}
          </span>
        )}
      </Link>
      <div className="pt-4 md:pt-5">
        <Link href={`/products/${product.code}`}>
          <h3 className="line-clamp-2 text-base font-medium text-ink md:text-lg">
            {locale === "zh" ? product.name.zh : product.name.en}
          </h3>
        </Link>
        <p className="mt-1 text-sm font-medium text-ink-soft tabular-nums md:mt-1.5 md:text-base">
          {product.isUpcoming
            ? locale === "zh" ? "待揭晓" : "Revealing soon"
            : formatUsdCents(product.priceCents, locale)}
        </p>
      </div>
    </div>
  );
}
