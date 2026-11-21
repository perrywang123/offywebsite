import { z } from "zod";
import { normalizeCountry, storefrontRequest } from "./storefront";

export type BuyerPhoto = { url: string; alt: string | null };

const referencesSchema = z.object({
  product: z
    .object({
      metafield: z
        .object({
          type: z.literal("list.file_reference"),
          references: z.object({ nodes: z.array(z.unknown()) }).nullish(),
        })
        .nullish(),
    })
    .nullable(),
});

const photoSchema = z.object({
  __typename: z.literal("MediaImage"),
  image: z.object({
    url: z.url({ protocol: /^https$/, hostname: /^cdn\.shopify\.com$/ }),
    altText: z.string().nullish(),
  }),
});

/** Optional editorial media for the PDP. Commercial queries do not depend on this field. */
export async function fetchProductBuyerPhotos(
  handle: string,
  country: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BuyerPhoto[]> {
  const cc = normalizeCountry(country);
  const data = await storefrontRequest(
    "buyer-photos:" + encodeURIComponent(handle) + ":" + cc,
    /* GraphQL */ `
      query ProductBuyerPhotos($handle: String!) @inContext(country: ${cc}) {
        product(handle: $handle) {
          metafield(namespace: "custom", key: "buyer_photos") {
            type
            references(first: 128) {
              nodes {
                __typename
                ... on MediaImage {
                  image {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `,
    { handle },
    fetchImpl,
  ).catch(() => null);
  const result = referencesSchema.safeParse(data);
  const nodes = result.data?.product?.metafield?.references?.nodes ?? [];
  return nodes.flatMap((node) => {
    const photo = photoSchema.safeParse(node);
    return photo.success
      ? [{ url: photo.data.image.url, alt: photo.data.image.altText?.trim() || null }]
      : [];
  });
}
