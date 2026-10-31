import { cache } from "react";
import type { Product, ProductSeries, Series, SeriesSlug } from "../../lib/catalog/types";
import { MERCH_SERIES_SLUG, seriesList } from "../../lib/catalog/series";
import {
  fetchShopifyCollectionProducts,
  fetchShopifyCollections,
  fetchShopifyProductsOutsideCollections,
  type ShopifyCollectionProductItem,
} from "../shopify/catalog";
import { fetchProductData } from "../shopify/products";
import { CatalogUnavailableError } from "../shopify/storefront";

/** Local routes/editorial assets are configuration; Shopify owns names, membership and commerce. */
export const SERIES_SHOPIFY_HANDLE: Record<SeriesSlug, string> = {
  "princess-lady": "frontpage",
  "outdoor-sporty": "outdoor-sporty系列",
  "playful-life": "趣味生活系列",
};
const slugs = Object.keys(SERIES_SHOPIFY_HANDLE) as SeriesSlug[];
export type LiveProductInput = Pick<
  ShopifyCollectionProductItem,
  "handle" | "title" | "priceCents" | "currency" | "image" | "available"
> &
  Partial<ShopifyCollectionProductItem> & { images?: string[] };
export function toLiveProduct(
  item: LiveProductInput,
  series: ProductSeries,
  sortOrder: number,
): Product {
  if (
    !item.title ||
    !Number.isSafeInteger(item.priceCents) ||
    item.priceCents < 0 ||
    !/^[A-Z]{3}$/.test(item.currency) ||
    typeof item.available !== "boolean"
  )
    throw new CatalogUnavailableError();
  return {
    code: item.handle,
    slug: item.handle,
    series,
    name: { en: item.title, zh: item.title },
    description: { en: "", zh: "" },
    priceCents: item.priceCents,
    currency: item.currency,
    dimensions: null,
    images: item.images ?? (item.image ? [item.image] : []),
    emotionTags: { en: [], zh: [] },
    featured: false,
    isAvailable: item.available,
    isUpcoming: false,
    isQuoteOnly: false,
    sortOrder,
    shopifyHandle: item.handle,
    shopifyVariantId: item.variantId ?? undefined,
    skuCode: item.sku ?? undefined,
  };
}
// React cache deduplicates within a server render only, never across requests or markets.
export const getLiveSeriesList = cache(async (): Promise<Series[]> => {
  const remote = await fetchShopifyCollections();
  return seriesList.flatMap((config) => {
    const s = remote.find((c) => c.handle === SERIES_SHOPIFY_HANDLE[config.slug]);
    return s ? [{ ...config, name: { en: s.title, zh: s.title } }] : [];
  });
});
const collectionItems = cache((slug: SeriesSlug, country: string) =>
  fetchShopifyCollectionProducts(SERIES_SHOPIFY_HANDLE[slug], country),
);
export const getLiveMerchProducts = cache(async (country: string): Promise<Product[]> =>
  (await fetchShopifyProductsOutsideCollections(Object.values(SERIES_SHOPIFY_HANDLE), country)).map(
    (item, i) => toLiveProduct(item, MERCH_SERIES_SLUG, i * 10),
  ),
);
export const getLiveProductsBySeries = cache(
  async (slug: ProductSeries, country: string): Promise<Product[]> =>
    slug === MERCH_SERIES_SLUG
      ? getLiveMerchProducts(country)
      : (await collectionItems(slug, country)).map((item, i) => toLiveProduct(item, slug, i * 10)),
);
export const getLiveProducts = cache(async (country: string): Promise<Product[]> => {
  const groups = await Promise.all([
    ...slugs.map((s) => getLiveProductsBySeries(s, country)),
    getLiveMerchProducts(country),
  ]);
  return [...new Map(groups.flat().map((p) => [p.code, p])).values()];
});
export const getLiveNewLooksProducts = cache(
  async (country: string, perSeries = 2): Promise<Product[]> => {
    const groups = await Promise.all(
      slugs.map(async (slug) =>
        (await collectionItems(slug, country))
          .filter((i) => i.available)
          .sort(
            (a, b) =>
              (b.createdAt ? Date.parse(b.createdAt) : 0) -
              (a.createdAt ? Date.parse(a.createdAt) : 0),
          )
          .slice(0, perSeries)
          .map((item, i) => toLiveProduct(item, slug, i * 10)),
      ),
    );
    return [...new Map(groups.flat().map((p) => [p.code, p])).values()];
  },
);
export const getLiveProductByCode = cache(
  async (code: string, country: string): Promise<Product | undefined> => {
    const data = await fetchProductData(code, fetch, country);
    if (data === null) return undefined;
    const series =
      slugs.find((slug) => data.collectionHandles.includes(SERIES_SHOPIFY_HANDLE[slug])) ??
      MERCH_SERIES_SLUG;
    return {
      ...toLiveProduct({ ...data, handle: code, image: null }, series, 0),
      description: { en: data.description, zh: data.description },
      descriptionBlocks: { en: data.descriptionBlocks, zh: data.descriptionBlocks },
    };
  },
);
