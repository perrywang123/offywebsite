import { z } from "zod";
import {
  CatalogUnavailableError,
  membershipSchema,
  money,
  moneySchema,
  normalizeCountry,
  pageInfoSchema,
  storefrontRequest,
  validated,
} from "./storefront";
export interface ShopifyListItem {
  handle: string;
  title: string;
  priceCents: number;
  currency: string;
  image: string | null;
  available: boolean;
}
export interface ShopifyCollectionSummary {
  handle: string;
  title: string;
  description: string;
}
export interface ShopifyCollectionProductItem extends ShopifyListItem {
  variantId: string | null;
  sku: string | null;
  createdAt: string | null;
}
const nodeSchema = z.object({
  handle: z.string().min(1),
  title: z.string().min(1),
  availableForSale: z.boolean(),
  featuredImage: z.object({ url: z.string().url() }).nullable(),
  variants: z.object({
    nodes: z
      .array(
        z.object({
          id: z.string().min(1),
          availableForSale: z.boolean(),
          sku: z.string().nullable().optional(),
          price: moneySchema,
        }),
      )
      .min(1),
  }),
});
const extendedSchema = nodeSchema.extend({
  createdAt: z.string().datetime().nullable().optional(),
});
const fields = `handle title availableForSale featuredImage { url } variants(first:1) { nodes { id sku availableForSale price { amount currencyCode } } }`;
const extra = `createdAt`;
const pagination = `pageInfo { hasNextPage endCursor }`;
function listItem(n: z.infer<typeof nodeSchema>): ShopifyListItem {
  return {
    handle: n.handle,
    title: n.title,
    ...money(n.variants.nodes[0].price),
    image: n.featuredImage?.url ?? null,
    available: n.availableForSale && n.variants.nodes[0].availableForSale,
  };
}
function extendedItem(n: z.infer<typeof extendedSchema>): ShopifyCollectionProductItem {
  return {
    ...listItem(n),
    variantId: n.variants.nodes[0]?.id ?? null,
    sku: n.variants.nodes[0]?.sku || null,
    createdAt: n.createdAt ?? null,
  };
}
/** Follow every page. Missing/invalid pages fail the whole read instead of publishing a partial roster. */
async function connection<T>(
  schema: z.ZodType<T>,
  key: string,
  query: string,
  variables: Record<string, unknown>,
  read: (data: unknown) => unknown,
  fetchImpl: typeof fetch,
): Promise<T[]> {
  const shape = z.object({ nodes: z.array(schema), pageInfo: pageInfoSchema });
  const all: T[] = [];
  let after: string | null = null;
  const cursors = new Set<string>();
  for (let page = 0; page < 100; page++) {
    const data: { nodes: T[]; pageInfo: z.infer<typeof pageInfoSchema> } = validated(
      shape,
      read(
        await storefrontRequest(
          encodeURIComponent(`${key}:${after ?? ""}`),
          query,
          { ...variables, after },
          fetchImpl,
        ),
      ),
    );
    all.push(...data.nodes);
    if (!data.pageInfo?.hasNextPage) return all;
    const cursor: string | null = data.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw new CatalogUnavailableError();
    cursors.add(cursor);
    after = cursor;
  }
  throw new CatalogUnavailableError();
}
function field(data: unknown, key: string): unknown {
  return validated(z.record(z.string(), z.unknown()), data)[key];
}
export async function listShopifyProducts(
  fetchImpl: typeof fetch = fetch,
  country = normalizeCountry(),
): Promise<ShopifyListItem[]> {
  const cc = normalizeCountry(country);
  const nodes = await connection(
    nodeSchema,
    `products-list:${cc}`,
    `query ProductList($after:String) @inContext(country: ${cc}) { products(first:250,after:$after,sortKey:BEST_SELLING) { nodes { ${fields} } ${pagination} } }`,
    {},
    (d) => field(d, "products"),
    fetchImpl,
  );
  return nodes.map(listItem);
}
export async function fetchShopifyCollections(
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyCollectionSummary[]> {
  const schema = z.object({
    handle: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
  });
  const nodes = await connection(
    schema,
    "collections-list",
    `query Collections($after:String) @inContext(country:${normalizeCountry()}) { collections(first:250,after:$after) { nodes { handle title description } ${pagination} } }`,
    {},
    (d) => field(d, "collections"),
    fetchImpl,
  );
  return nodes.map((n) => ({ ...n, description: n.description ?? "" }));
}
export async function fetchShopifyCollectionProducts(
  collectionHandle: string,
  country = normalizeCountry(),
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyCollectionProductItem[]> {
  const cc = normalizeCountry(country);
  const nodes = await connection(
    extendedSchema,
    `collection-products:${collectionHandle}:${cc}`,
    `query CollectionProducts($handle:String!,$after:String) @inContext(country: ${cc}) { collectionByHandle(handle:$handle) { products(first:250,after:$after) { nodes { ${fields} ${extra} } ${pagination} } } }`,
    { handle: collectionHandle },
    (d) => field(field(d, "collectionByHandle"), "products"),
    fetchImpl,
  );
  return nodes.map(extendedItem);
}
export async function fetchShopifyProductsOutsideCollections(
  excludedCollectionHandles: readonly string[],
  country = normalizeCountry(),
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyCollectionProductItem[]> {
  const cc = normalizeCountry(country),
    excluded = new Set(excludedCollectionHandles);
  const schema = extendedSchema.extend({ collections: membershipSchema });
  const nodes = await connection(
    schema,
    `products-outside-collections:${cc}:${[...excluded].sort().join(",")}`,
    `query ProductsOutsideCollections($after:String) @inContext(country: ${cc}) { products(first:250,after:$after,sortKey:CREATED_AT,reverse:true) { nodes { ${fields} ${extra} collections(first:250) { nodes { handle } ${pagination} } } ${pagination} } }`,
    {},
    (d) => field(d, "products"),
    fetchImpl,
  );
  return nodes
    .filter((n) => !n.collections.nodes.some((c) => excluded.has(c.handle)))
    .sort(
      (a, b) =>
        (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0),
    )
    .map(extendedItem);
}
