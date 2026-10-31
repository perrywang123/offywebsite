// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cartCreate } from "../payments/shopify/client";
describe("Shopify referral transport", () => {
  it("adds the server-signed reference alongside the return URL without treating coupons as attribution", async () => {
    let attributes: unknown;
    const transport: typeof fetch = async (_url, init) => {
      attributes = JSON.parse(String(init?.body)).variables.attributes;
      return Response.json({
        data: {
          cartCreate: {
            cart: { id: "gid://shopify/Cart/A", checkoutUrl: "https://checkout.test" },
            userErrors: [],
          },
        },
      });
    };
    await cartCreate(
      [{ merchandiseId: "variant", quantity: 1 }],
      transport,
      "en",
      "US",
      "https://offy.test/checkout/return",
      "signed-server-intent",
    );
    expect(attributes).toEqual([
      { key: "return_url", value: "https://offy.test/checkout/return" },
      { key: "offy_ref", value: "signed-server-intent" },
    ]);
  });
});
