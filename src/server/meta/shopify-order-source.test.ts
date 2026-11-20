// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest, shopifyAdminConfigured } from "../kol/shopify";
import { lookupShopifyOrderSource } from "./shopify-order-source";

vi.mock("../kol/shopify", () => ({
  adminRequest: vi.fn(),
  shopifyAdminConfigured: vi.fn(),
}));

const request = vi.mocked(adminRequest);
const configured = vi.mocked(shopifyAdminConfigured);
const now = Date.parse("2026-11-20T04:00:00Z");
const orderId = "gid://shopify/Order/1234";
const adId = "120257887844680211";
const occurredAt = "2026-11-19T13:00:00Z";
const order = {
  id: orderId,
  name: "#1181",
  createdAt: "2026-11-19T13:10:00Z",
  test: false,
  cancelledAt: null,
  displayFinancialStatus: "PAID",
  channelInformation: { channelDefinition: { channelName: "Shop" } },
};

const visit = {
  occurredAt,
  landingPage: "https://shop.com/m/store?fbclid=sample-click&private=never-return-this",
  utmParameters: { source: "facebook", medium: "paid", content: adId },
};

beforeEach(() => {
  request.mockReset();
  configured.mockReturnValue(true);
});

function lookupResult(nodes: unknown[], options = { ready: true, hasNextPage: false }) {
  return {
    order: {
      ...order,
      customerJourneySummary: {
        ready: options.ready,
        moments: { nodes, pageInfo: { hasNextPage: options.hasNextPage } },
      },
    },
  };
}

describe("Shopify order source", () => {
  it("looks up a Shop order by exact name and exposes only sanitized evidence", async () => {
    request
      .mockResolvedValueOnce({
        orders: {
          nodes: [{ ...order, name: "#11810" }, order],
          pageInfo: { hasNextPage: false },
        },
      })
      .mockResolvedValueOnce(lookupResult([visit]));

    const result = await lookupShopifyOrderSource("1181", undefined, false, now);
    expect(request.mock.calls.map(([query]) => query)).toEqual([
      expect.stringMatching(/^query /),
      expect.stringMatching(/^query /),
    ]);
    expect(request.mock.calls[0][1]).toMatchObject({ query: 'name:"#1181"' });
    expect(request.mock.calls[1][1]).toEqual({ id: orderId });
    expect(result).toMatchObject({
      status: "found",
      orderName: "#1181",
      salesChannel: "Shop",
      journey: "complete",
      hasMetaClick: true,
      ad: { id: adId, at: Date.parse(occurredAt) },
    });
    expect(JSON.stringify(result)).not.toMatch(/landingPage|never-return-this|sample-click/);
  });

  it("uses the signed Shopify order ID without a name search and accepts an explicit ad ID", async () => {
    request.mockResolvedValueOnce(
      lookupResult([
        {
          ...visit,
          landingPage: `https://isoffy.com/?utm_source=meta&utm_medium=paid_social&ad_id=${adId}`,
          utmParameters: null,
        },
      ]),
    );
    expect(await lookupShopifyOrderSource("#1181", orderId, false, now)).toMatchObject({
      status: "found",
      ad: { id: adId },
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("shows an empty journey and distinguishes click-only and organic labels", async () => {
    request
      .mockResolvedValueOnce(lookupResult([]))
      .mockResolvedValueOnce(
        lookupResult([
          { ...visit, utmParameters: { source: "google", medium: "organic", content: adId } },
        ]),
      );
    expect(await lookupShopifyOrderSource("#1181", orderId, false, now)).toMatchObject({
      status: "found",
      salesChannel: "Shop",
      journey: "complete",
      hasMetaClick: false,
      ad: null,
    });
    expect(await lookupShopifyOrderSource("#1181", orderId, false, now)).toMatchObject({
      status: "found",
      hasMetaClick: true,
      ad: null,
    });
  });

  it.each([
    { ready: false, hasNextPage: false, expected: "pending" },
    { ready: true, hasNextPage: true, expected: "partial" },
    { ready: true, hasNextPage: false, expected: "conflict" },
  ])(
    "doesn't assign an ad when the Shopify journey is $expected",
    async ({ ready, hasNextPage, expected }) => {
      request.mockResolvedValueOnce(
        lookupResult(
          [visit, { ...visit, utmParameters: { ...visit.utmParameters, content: "88" } }],
          {
            ready,
            hasNextPage,
          },
        ),
      );
      expect(await lookupShopifyOrderSource("#1181", orderId, false, now)).toMatchObject({
        status: "found",
        journey: expected,
        ad: null,
      });
    },
  );

  it("does not fall back to a partial order name or expose a hidden test order", async () => {
    request
      .mockResolvedValueOnce({
        orders: { nodes: [{ ...order, name: "#11810" }], pageInfo: { hasNextPage: false } },
      })
      .mockResolvedValueOnce({ order: { ...order, test: true } });
    expect(await lookupShopifyOrderSource("1181", undefined, false, now)).toEqual({
      status: "not_found",
    });
    expect(await lookupShopifyOrderSource("1181", orderId, false, now)).toEqual({
      status: "not_found",
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("distinguishes Shopify timeout and unavailable credentials", async () => {
    request.mockRejectedValueOnce(new Error("private response text"));
    expect(await lookupShopifyOrderSource("1181", orderId, false, now)).toEqual({
      status: "unavailable",
    });
    configured.mockReturnValue(false);
    expect(await lookupShopifyOrderSource("1181", undefined, false, now)).toEqual({
      status: "not_configured",
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
