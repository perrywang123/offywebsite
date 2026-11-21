// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readGiftRules } from "./gift-rules";

const id = "gid://shopify/DiscountAutomaticNode/100";
const product = "gid://shopify/Product/200";
const collection = "gid://shopify/Collection/300";
const variant = "gid://shopify/ProductVariant/400";
const time = Date.parse("2026-11-22T09:00:00Z");
const list = (ids: string[], hasNextPage = false) => ({
  nodes: ids.map((id) => ({ id })),
  pageInfo: { hasNextPage },
});
const discount = {
  __typename: "DiscountAutomaticBxgy",
  status: "ACTIVE",
  startsAt: "2026-10-01T00:00:00Z",
  endsAt: null,
  context: { __typename: "DiscountBuyerSelectionAll" },
  customerBuys: {
    isOneTimePurchase: true,
    value: { quantity: "3" },
    items: { __typename: "DiscountCollections", collections: list([collection]) },
  },
  customerGets: {
    appliesOnOneTimePurchase: true,
    value: { quantity: { quantity: "1" }, effect: { percentage: 1 } },
    items: {
      __typename: "DiscountProducts",
      products: list([]),
      productVariants: list([variant]),
    },
  },
};

function respond(d: unknown) {
  return vi.fn(async () => ({ nodes: [{ id, automaticDiscount: d }] }));
}

describe("Shopify gift rules", () => {
  it("reads only the typed rule and keeps variant restrictions", async () => {
    const request = respond(discount);
    expect(await readGiftRules([id], request, time)).toEqual([
      { id, minimum: 3, qualifying: [collection], rewards: [variant] },
    ]);
    expect(request).toHaveBeenCalledWith(expect.stringContaining("DiscountAutomaticBxgy"), {
      ids: [id],
    });
  });

  it.each([
    { status: "EXPIRED" },
    { startsAt: "2027-01-01T00:00:00Z" },
    { endsAt: "2026-11-22T09:00:00Z" },
    { context: { __typename: "DiscountCustomers" } },
    { customerBuys: { ...discount.customerBuys, value: { amount: 100 } } },
    {
      customerGets: {
        ...discount.customerGets,
        value: { quantity: { quantity: 1 }, effect: { percentage: 0.2 } },
      },
    },
    {
      customerGets: {
        ...discount.customerGets,
        value: { quantity: { quantity: 2 }, effect: { percentage: 1 } },
      },
    },
    {
      customerBuys: {
        ...discount.customerBuys,
        items: {
          __typename: "DiscountProducts",
          products: list([product], true),
          productVariants: list([]),
        },
      },
    },
  ])("skips unsupported, inactive or incomplete rules %j", async (patch) => {
    expect(await readGiftRules([id], respond({ ...discount, ...patch }), time)).toEqual([]);
  });
});
