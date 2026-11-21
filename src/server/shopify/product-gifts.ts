import { z } from "zod";
import { env } from "@/lib/env";
import { signature } from "@/server/kol/core";
import {
  automaticGiftId,
  giftRuleSchema,
  giftRuleEndpoint,
  giftRulePath,
  giftRuleSignature,
  type GiftRule,
} from "./gift-rules";
import { normalizeCountry, storefrontRequest } from "./storefront";

type GiftPresentation = { id: string; name?: string; image?: string; rewardTitle?: RegExp };
type GiftTier = { id: string; minimum: number; name: string; url: string; handle: string };
export type ProductGiftData = { title?: string; terms?: string; tiers: GiftTier[] };

// IDs select campaigns. The buy quantities, eligibility and reward references are always read from Shopify.
const offyGiftTiers: GiftPresentation[] = [
  {
    id: "gid://shopify/DiscountAutomaticNode/1698715271457",
    name: "Stickers",
    rewardTitle: /sticker/i,
  },
  {
    id: "gid://shopify/DiscountAutomaticNode/1698716287265",
    name: "Big tote",
    rewardTitle: /tote bag/i,
  },
  {
    id: "gid://shopify/DiscountAutomaticNode/1699172253985",
    name: "SWAN QUEEN",
    rewardTitle: /swan queen/i,
  },
];
const imageSchema = z.object({
  url: z.url({ protocol: /^https$/, hostname: /^cdn\.shopify\.com$/ }),
});
const field = z.object({ value: z.string() }).nullish();
const tierSchema = z.object({
  __typename: z.literal("Metaobject"),
  type: z.literal("gift_tier"),
  discount: z.object({ value: automaticGiftId }),
  name: field,
  photo: z.object({ reference: z.unknown() }).nullish(),
});
const photoReference = z.object({ __typename: z.literal("MediaImage"), image: imageSchema });
const campaignSchema = z.object({
  type: z.literal("gift_campaign"),
  heading: field,
  terms: field,
  gifts: z
    .object({
      references: z
        .object({
          nodes: z.array(z.unknown()).max(6),
          pageInfo: z.object({ hasNextPage: z.literal(false) }),
        })
        .nullable(),
    })
    .nullish(),
});
const selectionSchema = z.object({
  product: z
    .object({
      id: z.string(),
      collections: z.object({ nodes: z.array(z.object({ id: z.string() })) }),
    })
    .nullable(),
  campaign: z.unknown(),
});

const rewardProductSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1),
  handle: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  availableForSale: z.literal(true),
  featuredImage: imageSchema.nullable(),
  variants: z.object({
    nodes: z
      .array(
        z.object({
          id: z.string(),
          availableForSale: z.literal(true),
          currentlyNotInStock: z.literal(false),
        }),
      )
      .length(1),
  }),
});
const collectionSchema = z.object({
  __typename: z.literal("Collection"),
  id: z.string(),
  products: z.object({ nodes: z.array(z.unknown()) }),
});
const rewardVariantSchema = z.object({
  __typename: z.literal("ProductVariant"),
  id: z.string(),
  product: rewardProductSchema,
});
const rewardsSchema = z.object({ nodes: z.array(z.unknown()) });
const rewardFields = /* GraphQL */ `
  id title handle availableForSale featuredImage { url }
  variants(first: 1) { nodes { id availableForSale currentlyNotInStock } }
`;

async function readInternalRules(ids: string[]): Promise<GiftRule[]> {
  const secret = env.KOL_WORKER_SECRET;
  const endpoint = env.SHOPIFY_GIFT_RULES_URL;
  if (!secret || !endpoint) return [];
  const testEndpoint =
    env.OFFY_INTEGRATION_TEST === "true" &&
    env.NODE_ENV !== "production" &&
    /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(new URL(endpoint).origin) &&
    new URL(endpoint).pathname === giftRulePath;
  if (endpoint !== giftRuleEndpoint && !testEndpoint) return [];

  const body = JSON.stringify(ids);
  const response = await fetch(endpoint, {
    method: "POST",
    body,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(3500),
    headers: {
      "content-type": "application/json",
      "x-offy-gift-signature": signature(giftRuleSignature + body, secret),
    },
  });
  if (!response.ok) return [];
  return z.object({ rules: z.array(giftRuleSchema).max(6) }).parse(await response.json()).rules;
}

function pickReward(node: unknown, rewardIds: string[], image?: string) {
  const product = rewardProductSchema.safeParse(node).data;
  if (product && rewardIds.includes(product.id)) return product;
  const variant = rewardVariantSchema.safeParse(node).data;
  if (
    variant &&
    rewardIds.includes(variant.id) &&
    variant.id === variant.product.variants.nodes[0].id
  ) {
    return variant.product;
  }
  const collection = collectionSchema.safeParse(node).data;
  if (collection && rewardIds.includes(collection.id)) {
    return collection.products.nodes
      .map((item) => rewardProductSchema.safeParse(item).data)
      .find((item) => item && (image || item.featuredImage));
  }
}

export async function fetchProductGiftOffers(
  handle: string,
  country: string,
  variantId: string,
  fetchImpl: typeof fetch = fetch,
  readRules = readInternalRules,
): Promise<ProductGiftData | null> {
  if (readRules === readInternalRules && (!env.SHOPIFY_GIFT_RULES_URL || !env.KOL_WORKER_SECRET))
    return null;
  const cc = normalizeCountry(country);
  try {
    const selection = selectionSchema.parse(
      await storefrontRequest(
        `gift-campaign:${encodeURIComponent(handle)}:${cc}`,
        /* GraphQL */ `
        query ProductGiftCampaign($handle: String!) @inContext(country: ${cc}) {
          product(handle: $handle) { id collections(first: 250) { nodes { id } } }
          campaign: metaobject(handle: {type: "gift_campaign", handle: "offy-storefront-gifts"}) {
            type
            heading: field(key: "heading") { value }
            terms: field(key: "terms") { value }
            gifts: field(key: "gift_tiers") {
              references(first: 6) {
                pageInfo { hasNextPage }
                nodes {
                  __typename
                  ... on Metaobject {
                    type
                    discount: field(key: "discount_id") { value }
                    name: field(key: "gift_name") { value }
                    photo: field(key: "gift_image") {
                      reference { __typename ... on MediaImage { image { url } } }
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
      ),
    );
    if (!selection.product) return null;
    const campaign = selection.campaign === null ? null : campaignSchema.parse(selection.campaign);
    const configured = campaign?.gifts?.references?.nodes ?? [];
    const choices: GiftPresentation[] = campaign
      ? configured.flatMap((node) => {
          const tier = tierSchema.safeParse(node).data;
          return tier
            ? [
                {
                  id: tier.discount.value,
                  name: tier.name?.value.trim(),
                  image: photoReference.safeParse(tier.photo?.reference).data?.image.url,
                },
              ]
            : [];
        })
      : env.SHOPIFY_STORE_DOMAIN === "ujc6x6-41.myshopify.com"
        ? offyGiftTiers
        : [];
    const ids = [...new Set(choices.map(({ id }) => id))];
    if (!ids.length) return null;

    const productKeys = new Set([
      selection.product.id,
      variantId,
      ...selection.product.collections.nodes.map(({ id }) => id),
    ]);
    const rules = (await readRules(ids)).filter(
      ({ id, qualifying }) => ids.includes(id) && qualifying.some((key) => productKeys.has(key)),
    );
    if (!rules.length) return null;

    const rewardIds = [...new Set(rules.flatMap((rule) => rule.rewards))];
    const nodes: unknown[] = [];
    for (let start = 0; start < rewardIds.length; start += 50) {
      const rewards = rewardsSchema.parse(
        await storefrontRequest(
          `gift-rewards:${cc}`,
          /* GraphQL */ `
          query ProductGiftRewards($ids: [ID!]!) @inContext(country: ${cc}) {
            nodes(ids: $ids) {
              __typename
              ... on Product { ${rewardFields} }
              ... on ProductVariant { id product { ${rewardFields} } }
              ... on Collection { id products(first: 20) { nodes { ${rewardFields} } } }
            }
          }
        `,
          { ids: rewardIds.slice(start, start + 50) },
          fetchImpl,
        ),
      );
      nodes.push(...rewards.nodes);
    }
    const tiers = rules.flatMap(({ id, minimum, rewards }) => {
      const presentation = choices.find((choice) => choice.id === id);
      const available = nodes
        .map((node) => pickReward(node, rewards, presentation?.image))
        .find((reward) => reward && (presentation?.image || reward.featuredImage));
      const url = presentation?.image || available?.featuredImage?.url;
      if (!available || !url) return [];
      const name =
        presentation?.rewardTitle && !presentation.rewardTitle.test(available.title)
          ? available.title
          : presentation?.name || available.title;
      return [{ id, minimum, name, url, handle: available.handle }];
    });
    return tiers.length
      ? {
          title: campaign?.heading?.value.trim().slice(0, 80) || undefined,
          terms: campaign?.terms?.value.trim().slice(0, 600) || undefined,
          tiers: tiers.sort((a, b) => a.minimum - b.minimum),
        }
      : null;
  } catch {
    return null;
  }
}
