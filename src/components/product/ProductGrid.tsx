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
    return <p className="text-ink-muted py-16 text-center">{t("empty")}</p>;
  }

  // 间距统一到规范表:窄屏 gap-x-4(两列必需)、sm 起 24px(catalog 原本写的是
  // sm:gap-x-5 = 20px,与首页两处不一致)。`lg:` 保留改动前的 24px —— ≥1024px
  // 的表现一律不变(方案 §4 总原则),规范表里 lg 的 32px 只在这里注明差异。
  const gridCls =
    density === "series"
      ? "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
      : "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6";

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
