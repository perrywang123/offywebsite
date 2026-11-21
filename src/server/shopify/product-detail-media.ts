import { z } from "zod";
import { normalizeCountry, storefrontRequest } from "./storefront";

export type DetailPhoto = {
  url: string;
  alt: string;
  width: number;
  height: number;
  crop?: { left: number; top: number; width: number; height: number };
};

const imageSchema = z.object({
  id: z.string(),
  url: z.url({ protocol: /^https$/, hostname: /^cdn\.shopify\.com$/ }),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  altText: z.string().nullish(),
});
const imageReference = z.object({ __typename: z.literal("MediaImage"), image: imageSchema });
const mediaSchema = z.object({
  product: z
    .object({
      images: z.object({ nodes: z.array(z.unknown()) }),
      closeups: z
        .object({ references: z.object({ nodes: z.array(z.unknown()) }).nullish() })
        .nullish(),
      measurements: z.object({ reference: z.unknown() }).nullish(),
      materials: z.object({ reference: z.unknown() }).nullish(),
    })
    .nullable(),
});

type ShopifyImage = z.infer<typeof imageSchema>;
const imageFields = "id url width height altText";
const referenceFields = `__typename ... on MediaImage { image { ${imageFields} } }`;
const sizeId = "gid://shopify/ProductImage/58710519513377";
const materialsId = "gid://shopify/ProductImage/59175257637153";
const burgerId = "gid://shopify/ProductImage/58710519349537";
const neonId = "gid://shopify/ProductImage/58713533546785";
const burgerCrops = [
  { top: 0.052, height: 0.193, alt: "Mustard knit and patches" },
  { top: 0.365, height: 0.2, alt: "Red striped jersey" },
  { top: 0.682, height: 0.197, alt: "Layered ruffle trim" },
];

function photo(image: ShopifyImage, alt: string): DetailPhoto {
  return {
    url: image.url,
    width: image.width,
    height: image.height,
    alt: image.altText?.trim() || alt,
  };
}

export async function fetchProductDetailMedia(
  handle: string,
  country: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ details: DetailPhoto[]; guides: DetailPhoto[] }> {
  const cc = normalizeCountry(country);
  const data = await storefrontRequest(
    `product-detail-media:${encodeURIComponent(handle)}:${cc}`,
    /* GraphQL */ `
      query ProductDetailMedia($handle: String!) @inContext(country: ${cc}) {
        product(handle: $handle) {
          images(first: 10) { nodes { ${imageFields} } }
          closeups: metafield(namespace: "custom", key: "detail_photos") {
            references(first: 12) { nodes { ${referenceFields} } }
          }
          measurements: metafield(namespace: "custom", key: "size_guide") {
            reference { ${referenceFields} }
          }
          materials: metafield(namespace: "custom", key: "materials_guide") {
            reference { ${referenceFields} }
          }
        }
      }
    `,
    { handle },
    fetchImpl,
  ).catch(() => null);

  const product = mediaSchema.safeParse(data).data?.product;
  if (!product) return { details: [], guides: [] };

  const images = product.images.nodes.flatMap((node) => {
    const image = imageSchema.safeParse(node).data;
    return image ? [image] : [];
  });
  const findImage = (id: string) => images.find((image) => image.id === id);
  const guides = [
    {
      image: imageReference.safeParse(product.measurements?.reference).data?.image,
      fallback: findImage(sizeId),
      label: "Size and measurements",
      fallbackAlt:
        "OFFY measurements: height 18 cm, body width 7.5 cm, head circumference 24 cm, arms and legs 3.5 cm. Allow ±0.5 cm variation.",
    },
    {
      image: imageReference.safeParse(product.materials?.reference).data?.image,
      fallback: findImage(materialsId),
      label: "Materials and care",
      fallbackAlt:
        "OFFY materials and craft: polyester body, hair and fiber filling with precision embroidery. Hand wash and dry flat. Do not bleach, iron or dry clean.",
    },
  ].flatMap(({ image, fallback, label, fallbackAlt }) => {
    if (image) return [photo(image, label)];
    return fallback ? [photo(fallback, fallbackAlt)] : [];
  });

  const details = (product.closeups?.references?.nodes ?? []).flatMap((node) => {
    const image = imageReference.safeParse(node).data?.image;
    return image ? [photo(image, "Product close-up")] : [];
  });
  if (!details.length && handle === "burger-doll") {
    const image = findImage(burgerId);
    if (image) {
      details.push(
        ...burgerCrops.map(({ alt, top, height }) => ({
          ...photo(image, alt),
          alt,
          crop: { left: 0.057, width: 0.886, top, height },
        })),
      );
    }
  }
  if (!details.length && handle === "offy_redrush") {
    const image = findImage(neonId);
    if (image) details.push(photo(image, "NEON RUSH fabric, buckles and patches"));
  }

  return { details, guides };
}
