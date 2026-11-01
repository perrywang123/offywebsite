// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { cartCreate } from "./client";

describe("Shopify checkout evidence", () => {
  it("captures non-JSON upstream errors for encrypted diagnosis without requiring a JSON response", async () => {
    const observe = vi.fn();
    const transport: typeof fetch = async () =>
      new Response("<html>gateway failure</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      });
    await expect(
      cartCreate(
        [{ merchandiseId: "v", quantity: 1 }],
        transport,
        "en",
        "US",
        undefined,
        undefined,
        observe,
      ),
    ).rejects.toThrow();
    expect(observe).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "shopify_response",
        data: expect.objectContaining({
          status: 502,
          contentType: "text/html",
          rawText: "<html>gateway failure</html>",
        }),
      }),
    );
  });
  it("records request, HTTP request id, returned country/lines/warnings and keeps the original redirect", async () => {
    const observe = vi.fn();
    const body = {
      data: {
        cartCreate: {
          cart: {
            id: "gid://shopify/Cart/A?key=secret",
            checkoutUrl: "https://shop.test/checkouts/A?key=secret",
            buyerIdentity: { countryCode: "SG" },
            lines: { nodes: [] },
            totalQuantity: 0,
          },
          warnings: [{ code: "PRODUCT_UNAVAILABLE_IN_BUYER_LOCATION", message: "not available" }],
          userErrors: [],
        },
      },
    };
    const transport: typeof fetch = async () =>
      Response.json(body, { headers: { "x-request-id": "shopify-123" } });
    const cart = await cartCreate(
      [{ merchandiseId: "variant", quantity: 2 }],
      transport,
      "en",
      "US",
      undefined,
      undefined,
      observe,
    );
    expect(cart.checkoutUrl).toBe(body.data.cartCreate.cart.checkoutUrl);
    expect(observe).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "shopify_request",
        data: expect.objectContaining({ country: "US" }),
      }),
    );
    expect(observe).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "shopify_response",
        data: expect.objectContaining({ status: 200, requestId: "shopify-123", body }),
      }),
    );
  });
  it.each(["http", "graphql", "network"])("retains %s failure evidence", async (kind) => {
    const observe = vi.fn();
    const transport: typeof fetch = async () => {
      if (kind === "network") throw new Error("network");
      return Response.json(
        { errors: [{ message: "failure" }] },
        { status: kind === "http" ? 429 : 200 },
      );
    };
    await expect(
      cartCreate(
        [{ merchandiseId: "v", quantity: 1 }],
        transport,
        "en",
        "US",
        undefined,
        undefined,
        observe,
      ),
    ).rejects.toThrow();
    expect(observe.mock.calls.map(([e]) => e.type)).toContain(
      kind === "network" ? "shopify_transport_failed" : "shopify_response",
    );
  });
  it("a failing diagnostic sink cannot break checkout", async () => {
    const transport: typeof fetch = async () =>
      Response.json({
        data: {
          cartCreate: {
            cart: { id: "a", checkoutUrl: "https://shop.test/checkout" },
            userErrors: [],
          },
        },
      });
    await expect(
      cartCreate(
        [{ merchandiseId: "v", quantity: 1 }],
        transport,
        "en",
        "US",
        undefined,
        undefined,
        () => {
          throw new Error("disk full");
        },
      ),
    ).resolves.toHaveProperty("checkoutUrl");
  });
});
