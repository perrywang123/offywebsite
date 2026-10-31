import { z } from "zod";
import { parseDescriptionHtml, type DescriptionBlock } from "../../lib/description-html";
import {
  membershipSchema,
  money,
  moneySchema,
  normalizeCountry,
  storefrontRequest,
  validated,
} from "./storefront";

export interface ShopifyProductData {
  title: string;
  description: string;
  descriptionBlocks: DescriptionBlock[];
  images: string[];
  priceCents: number;
  currency: string;
  variantId: string | null;
  available: boolean;
  collectionHandles: string[];
  sku: string | null;
}
const productSchema = z.object({
  product: z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      descriptionHtml: z.string().optional(),
      availableForSale: z.boolean(),
      images: z.object({ nodes: z.array(z.object({ url: z.string().url() })) }),
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
      collections: membershipSchema,
    })
    .nullable(),
});

/** null means a confirmed absence. Every transport, GraphQL or shape error throws. */
export async function fetchProductData(
  handle: string,
  fetchImpl: typeof fetch = fetch,
  country = normalizeCountry(),
): Promise<ShopifyProductData | null> {
  const cc = normalizeCountry(country);
  const data = validated(
    productSchema,
    await storefrontRequest(
      `product:${encodeURIComponent(handle)}:${cc}`,
      `
    query ProductEnrich($handle:String!) @inContext(country: ${cc}) {
      product(handle:$handle) {
        title description descriptionHtml availableForSale
        images(first:10) { nodes { url } }
        variants(first:1) { nodes { id sku availableForSale price { amount currencyCode } } }
        collections(first:250) { nodes { handle } pageInfo { hasNextPage endCursor } }
      }
    }`,
      { handle },
      fetchImpl,
    ),
  );
  const p = data.product;
  if (p === null) return null;
  const variant = p.variants.nodes[0];
  return {
    title: p.title,
    description: p.description ?? "",
    descriptionBlocks: parseDescriptionHtml(p.descriptionHtml ?? ""),
    images: p.images.nodes.map((n) => n.url),
    ...money(variant.price),
    variantId: variant.id,
    available: p.availableForSale && variant.availableForSale,
    collectionHandles: p.collections.nodes.map((n) => n.handle),
    sku: variant.sku || null,
  };
}
