import { describe, expect, it } from "vitest";
import {
  computeSubtotalCents,
  getFeaturedProducts,
  getProductByCode,
  getProductsBySeries,
  products,
  toStripeLineItems,
} from "./index";

describe("catalog data integrity", () => {
  it("has at least one product", () => {
    expect(products.length).toBeGreaterThan(0);
  });

  it("has unique codes", () => {
    const codes = products.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every sellable product has bilingual name, positive price and an image", () => {
    for (const product of products) {
      expect(product.name.en.trim().length).toBeGreaterThan(0);
      expect(product.name.zh.trim().length).toBeGreaterThan(0);
      expect(product.priceCents).toBeGreaterThan(0);
      expect(product.images.length).toBeGreaterThan(0);
    }
  });
});

describe("catalog queries", () => {
  it("getProductByCode is case-insensitive", () => {
    expect(getProductByCode("pcof1-a3")?.code).toBe("PCOF1-A3");
  });

  it("getProductsBySeries filters", () => {
    const result = getProductsBySeries("active-sporty");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.series === "active-sporty")).toBe(true);
  });

  it("getFeaturedProducts returns featured items", () => {
    const featured = getFeaturedProducts();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.every((p) => p.featured)).toBe(true);
  });
});

describe("toStripeLineItems", () => {
  it("uses server-side catalog price (ignores any client price)", () => {
    const [line] = toStripeLineItems([{ code: "PCOF1-A3", quantity: 2 }]);
    expect(line.price_data.unit_amount).toBe(4500);
    expect(line.quantity).toBe(2);
  });

  it("throws on unknown code", () => {
    expect(() => toStripeLineItems([{ code: "NOPE", quantity: 1 }])).toThrow();
  });
});

describe("computeSubtotalCents", () => {
  it("computes server-authoritative subtotal", () => {
    expect(
      computeSubtotalCents([
        { code: "PCOF1-A3", quantity: 2 },
        { code: "PCOF1-B2", quantity: 1 },
      ]),
    ).toBe(4500 * 2 + 4500);
  });
});
