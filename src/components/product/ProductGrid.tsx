import { getTranslations } from "next-intl/server";
import type { Product } from "@/lib/catalog";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "./ProductCard";

export async function ProductGrid({
  products,
  locale,
  density = "catalog",
}: {
  products: Product[];
  locale: string;
  density?: "catalog" | "series";
}) {
  if (products.length === 0) {
    const t = await getTranslations("catalog");
    return <p className="py-16 text-center text-ink-muted">{t("empty")}</p>;
  }

  const gridCls =
    density === "series"
      ? "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
      : "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6";

  const sizes = "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw";

  return (
    <div className={gridCls}>
      {products.map((product, i) => (
        <Reveal key={product.code} delay={Math.min(i, 5) * 60}>
          <ProductCard product={product} locale={locale} sizes={sizes} />
        </Reveal>
      ))}
    </div>
  );
}
