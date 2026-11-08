import { describe, expect, it } from "vitest";
import { cleanSource, eventSchema, marketingAllowed, productData } from "./events";
describe("Meta event boundaries", () => {
  it("requires every processing permission, and honors GPC", () => {
    const privacy = {
      analyticsProcessingAllowed: () => true,
      marketingAllowed: () => true,
      saleOfDataAllowed: () => true,
    };
    expect(marketingAllowed(privacy, false)).toBe(true);
    expect(marketingAllowed({ ...privacy, marketingAllowed: () => false }, false)).toBe(false);
    expect(marketingAllowed(privacy, true)).toBe(false);
    expect(marketingAllowed(undefined, false)).toBe(false);
  });
  it("keeps only bounded attribution labels, not arbitrary URL or personal fields", () => {
    expect(
      cleanSource("?utm_source=meta&campaign_id=123&email=buyer%40mail.com&fbclid=secret"),
    ).toEqual({ utm_source: "meta", campaign_id: "123" });
    expect(cleanSource("?utm_campaign=buyer%40mail.com")).toEqual({});
  });
  it("converts actual minor units and maps only configured catalog IDs", () => {
    const item = { code: "little-heiress", quantity: 2, priceCents: 36900, currency: "HKD" };
    expect(productData([item], { "little-heiress": "catalog-real-id" })).toMatchObject({
      value: 738,
      currency: "HKD",
      num_items: 2,
      content_ids: ["catalog-real-id"],
    });
    expect(productData([item], {})).not.toHaveProperty("content_ids");
    expect(productData([item, { ...item, currency: "USD" }], {})).not.toHaveProperty("value");
  });
  it("does not allow fake purchase, email or arbitrary event fields", () => {
    const event = {
      eventId: crypto.randomUUID(),
      name: "AddToCart",
      occurredAt: Date.now(),
      pagePath: "/products/a",
      visitorId: crypto.randomUUID(),
      source: {},
      data: {},
      consent: true,
    };
    expect(eventSchema.safeParse(event).success).toBe(true);
    expect(eventSchema.safeParse({ ...event, name: "Purchase" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, email: "x@example.com" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, pagePath: "/products?email=foo" }).success).toBe(
      false,
    );
  });
});
