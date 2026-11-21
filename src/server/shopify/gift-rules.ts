import { z } from "zod";

export const automaticGiftId = z.string().regex(/^gid:\/\/shopify\/DiscountAutomaticNode\/\d+$/);
export const giftRuleIds = z.array(automaticGiftId).min(1).max(6);
export const giftRulePath = "/api/internal/shopify/gift-rules";
export const giftRuleSignature = "offy-gift-rules-v1:";
export const giftRuleEndpoint = "http://admin:3000" + giftRulePath;

const productId = z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/);
const variantId = z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/);
const collectionId = z.string().regex(/^gid:\/\/shopify\/Collection\/\d+$/);
const itemId = z.union([productId, variantId, collectionId]);
const positiveQuantity = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^\d{1,3}$/)
      .transform(Number),
  ])
  .pipe(z.number().int().min(1).max(999));
export const giftRuleSchema = z.object({
  id: automaticGiftId,
  minimum: positiveQuantity,
  qualifying: z.array(itemId).min(1).max(100),
  rewards: z.array(itemId).min(1).max(100),
});
export type GiftRule = z.infer<typeof giftRuleSchema>;

function completeIds(id: z.ZodType<string>) {
  return z.object({
    nodes: z.array(z.object({ id })),
    pageInfo: z.object({ hasNextPage: z.literal(false) }),
  });
}
const selectorSchema = z.discriminatedUnion("__typename", [
  z.object({
    __typename: z.literal("DiscountProducts"),
    products: completeIds(productId),
    productVariants: completeIds(variantId),
  }),
  z.object({
    __typename: z.literal("DiscountCollections"),
    collections: completeIds(collectionId),
  }),
]);
const discountSchema = z.object({
  id: automaticGiftId,
  automaticDiscount: z.object({
    __typename: z.literal("DiscountAutomaticBxgy"),
    status: z.literal("ACTIVE"),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }).nullable(),
    context: z.object({ __typename: z.literal("DiscountBuyerSelectionAll") }),
    customerBuys: z.object({
      isOneTimePurchase: z.literal(true),
      value: z.object({ quantity: positiveQuantity }),
      items: selectorSchema,
    }),
    customerGets: z.object({
      appliesOnOneTimePurchase: z.literal(true),
      value: z.object({
        quantity: z.object({ quantity: positiveQuantity.pipe(z.literal(1)) }),
        effect: z.object({ percentage: z.literal(1) }),
      }),
      items: selectorSchema,
    }),
  }),
});
const nodesSchema = z.object({ nodes: z.array(z.unknown()) });

function selectorIds(items: z.infer<typeof selectorSchema>) {
  const nodes =
    items.__typename === "DiscountProducts"
      ? [...items.products.nodes, ...items.productVariants.nodes]
      : items.collections.nodes;
  return nodes.map(({ id }) => id);
}

const itemFields = /* GraphQL */ `
  __typename
  ... on DiscountProducts {
    products(first: 75) { nodes { id } pageInfo { hasNextPage } }
    productVariants(first: 20) { nodes { id } pageInfo { hasNextPage } }
  }
  ... on DiscountCollections {
    collections(first: 12) { nodes { id } pageInfo { hasNextPage } }
  }
`;
const query = /* GraphQL */ `
  query OffyGiftRules($ids: [ID!]!) {
    nodes(ids: $ids) {
      id
      ... on DiscountAutomaticNode {
        automaticDiscount {
          __typename
          ... on DiscountAutomaticBxgy {
            status
            startsAt
            endsAt
            context { __typename }
            customerBuys {
              isOneTimePurchase
              value { ... on DiscountQuantity { quantity } }
              items { ${itemFields} }
            }
            customerGets {
              appliesOnOneTimePurchase
              value {
                ... on DiscountOnQuantity {
                  quantity { quantity }
                  effect { ... on DiscountPercentage { percentage } }
                }
              }
              items { ${itemFields} }
            }
          }
        }
      }
    }
  }
`;

export async function readGiftRules(
  ids: string[],
  request: (query: string, variables: Record<string, unknown>) => Promise<unknown>,
  now = Date.now(),
): Promise<GiftRule[]> {
  const remaining = [...new Set(giftRuleIds.parse(ids))];
  const rules: GiftRule[] = [];
  while (remaining.length > 0) {
    const batch = remaining.splice(0, 3);
    const { nodes } = nodesSchema.parse(await request(query, { ids: batch }));
    for (const node of nodes) {
      const value = discountSchema.safeParse(node).data;
      if (!value || !batch.includes(value.id)) continue;
      const { startsAt, endsAt, customerBuys, customerGets } = value.automaticDiscount;
      if (Date.parse(startsAt) > now || (endsAt && Date.parse(endsAt) <= now)) continue;
      const rule = giftRuleSchema.safeParse({
        id: value.id,
        minimum: customerBuys.value.quantity,
        qualifying: selectorIds(customerBuys.items),
        rewards: selectorIds(customerGets.items),
      }).data;
      if (rule) rules.push(rule);
    }
  }
  return rules;
}
