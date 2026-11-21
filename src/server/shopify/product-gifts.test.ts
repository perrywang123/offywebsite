// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchProductGiftOffers } from "./product-gifts";
import type { GiftRule } from "./gift-rules";

const productId = "gid://shopify/Product/200";
const productVariantId = "gid://shopify/ProductVariant/201";
const collectionId = "gid://shopify/Collection/300";
const rewardId = "gid://shopify/Product/400";
const rewardVariantId = "gid://shopify/ProductVariant/401";
const ruleId = "gid://shopify/DiscountAutomaticNode/100";
const image = { url: "https://cdn.shopify.com/offy/tote.jpg", altText: "" };
const responseProduct = {
  id: productId,
  collections: { nodes: [{ id: collectionId }] },
};
const reward = {
  __typename: "Product",
  id: rewardId,
  title: "Shopify Tote",
  handle: "shopify-tote",
  availableForSale: true,
  featuredImage: image,
  variants: {
    nodes: [{ id: rewardVariantId, availableForSale: true, currentlyNotInStock: false }],
  },
};
const remoteRule: GiftRule = {
  id: ruleId,
  minimum: 3,
  qualifying: [collectionId],
  rewards: [rewardId],
};
const tier = (id: string) => ({
  __typename: "Metaobject",
  type: "gift_tier",
  discount: { value: id },
  name: { value: "Big tote" },
});
const campaign = (tiers: unknown[]) => ({
  type: "gift_campaign",
  heading: { value: "Gifts with purchase" },
  gifts: { references: { nodes: tiers, pageInfo: { hasNextPage: false } } },
});
function fetcher(nodes: unknown[], selected = campaign([tier(ruleId)])) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ data: { product: responseProduct, campaign: selected } }),
    )
    .mockResolvedValueOnce(Response.json({ data: { nodes } }));
}

describe("shopper-visible gift offers", () => {
  it("uses the actual rule threshold and the eligible market's reward", async () => {
    const readRules = vi.fn(async () => [remoteRule]);
    const request = fetcher([reward]);
    expect(
      await fetchProductGiftOffers("current-product", "gb", productVariantId, request, readRules),
    ).toEqual({
      title: "Gifts with purchase",
      terms: undefined,
      tiers: [{ id: ruleId, minimum: 3, name: "Big tote", url: image.url, handle: reward.handle }],
    });
    expect(readRules).toHaveBeenCalledWith([ruleId]);
    expect(JSON.parse(request.mock.calls[1][1]!.body as string).query).toContain(
      "@inContext(country: GB)",
    );
  });

  it("omits gifts if this product is not eligible", async () => {
    const request = fetcher([reward]);
    const ineligible = { ...remoteRule, qualifying: [rewardId] };
    expect(
      await fetchProductGiftOffers("current-product", "US", productVariantId, request, async () => [
        ineligible,
      ]),
    ).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    { label: "missing", nodes: [] },
    { label: "not published", nodes: [null] },
    { label: "not available", nodes: [{ ...reward, availableForSale: false }] },
    {
      label: "backordered",
      nodes: [
        {
          ...reward,
          variants: { nodes: [{ ...reward.variants.nodes[0], currentlyNotInStock: true }] },
        },
      ],
    },
  ])("omits $label rewards", async ({ nodes }) => {
    expect(
      await fetchProductGiftOffers(
        "current-product",
        "US",
        productVariantId,
        fetcher(nodes),
        async () => [remoteRule],
      ),
    ).toBeNull();
  });

  it("preserves the merchant's empty campaign and omits gifts when access fails", async () => {
    const readRules = vi.fn(async () => {
      throw new Error("admin disconnected");
    });
    expect(
      await fetchProductGiftOffers(
        "current-product",
        "US",
        productVariantId,
        fetcher([reward], campaign([])),
        readRules,
      ),
    ).toBeNull();
    expect(readRules).not.toHaveBeenCalled();
    expect(
      await fetchProductGiftOffers(
        "current-product",
        "US",
        productVariantId,
        fetcher([reward]),
        readRules,
      ),
    ).toBeNull();
  });
});
