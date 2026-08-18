import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function ProductCard({ product, locale }: { product: Product; locale: string }) {
  return (
    <div className="group">
      <Link
        href={`/products/${product.code}`}
        className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-paper"
      >
        <Image
          src={product.images[0]}
          alt={locale === "zh" ? product.name.zh : product.name.en}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-200 ease-out group-hover:scale-105"
        />
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-pop-coral px-2.5 py-0.5 text-xs font-semibold text-paper">
            POP
          </span>
        )}
      </Link>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/products/${product.code}`}>
            <h3 className="truncate text-base font-medium text-ink-900">
              {locale === "zh" ? product.name.zh : product.name.en}
            </h3>
          </Link>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">
            {formatUsdCents(product.priceCents, locale)}
          </p>
        </div>
        <AddToCartButton code={product.code} className="h-9 shrink-0 px-4 text-xs" />
      </div>
    </div>
  );
}
