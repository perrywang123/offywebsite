import type { Product } from "@/lib/catalog";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "./ProductCard";

export function ProductGrid({ products, locale }: { products: Product[]; locale: string }) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-ink-muted">No products found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, i) => (
        <Reveal key={product.code} delay={Math.min(i, 7) * 60}>
          <ProductCard product={product} locale={locale} />
        </Reveal>
      ))}
    </div>
  );
}
