import { cache } from "react";
import type { Product } from "@/lib/catalog/types";
import { seriesList } from "@/lib/catalog/series";
import { fetchShopifyCollectionProducts } from "../shopify/catalog";
import { getLiveNewLooksProducts, getLiveProductsBySeries } from "./live";
import { getRegionalProducts } from "./regional";

// Merchandising configuration only; never a primary product series.
export const HOME_FEATURED_HANDLE = "featured";
const seriesSlugs = seriesList.map((series) => series.slug);
export interface HomeLooksData {
  source: "featured" | "newest";
  products: Product[];
  regionals: Product[];
}

/** Optional curated-read failure may use live series facts; classification/commerce failure may not. */
export const getHomeLooks = cache(async (country: string): Promise<HomeLooksData> => {
  const [regionalItems, groups, curated] = await Promise.all([
    getRegionalProducts(country, { requireComplete: true }),
    Promise.all(seriesSlugs.map((slug) => getLiveProductsBySeries(slug, country))),
    fetchShopifyCollectionProducts(HOME_FEATURED_HANDLE, country).then(
      (items) => ({ ok: true as const, items }),
      () => ({ ok: false as const }),
    ),
  ]);
  const byCode = new Map<string, Product>();
  for (const product of groups.flat()) {
    if (!byCode.has(product.code)) byCode.set(product.code, product);
  }
  const excluded = new Set(regionalItems.map((item) => item.handle));
  const regionals = [
    ...new Map(
      regionalItems.flatMap((item) => {
        const product = byCode.get(item.handle);
        return product
          ? [
              [
                product.code,
                {
                  ...product,
                  badge: item.countries.length === 1 ? country : undefined,
                },
              ] as const,
            ]
          : [];
      }),
    ).values(),
  ];
  if (!curated.ok) {
    return {
      source: "newest",
      products: await getLiveNewLooksProducts(country, 2, [...excluded]),
      regionals,
    };
  }
  const products: Product[] = [];
  const selected = new Set<string>();
  for (const item of curated.items) {
    const product = byCode.get(item.handle);
    if (
      !product ||
      !product.isAvailable ||
      !item.available ||
      excluded.has(item.handle) ||
      selected.has(item.handle)
    )
      continue;
    selected.add(item.handle);
    products.push(product);
    if (products.length === 6) break;
  }
  return { source: "featured", products, regionals };
});
