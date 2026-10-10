import { describe, expect, it } from "vitest";
import { cartTotal, clampQuantity, formatPrice } from "./pricing";

describe("formatPrice", () => {
  it("formats USD cents as before (default locale = en)", () => {
    expect(formatPrice(3999, "USD")).toBe("$39.99");
    expect(formatPrice(4500, "USD")).toBe("$45.00");
    expect(formatPrice(0, "USD")).toBe("$0.00");
  });

  it("formats a GBP price with the pound sign — the visitor's market currency, not USD", () => {
    expect(formatPrice(3790, "GBP")).toBe("£37.90");
    expect(formatPrice(3790, "GBP", "zh")).toBe("£37.90");
  });

  it("formats an HKD price with the HK$ prefix", () => {
    expect(formatPrice(36900, "HKD")).toBe("HK$369.00");
    expect(formatPrice(36900, "HKD", "zh")).toBe("HK$369.00");
  });

  it("keeps the zh locale's distinct CNY / USD rendering", () => {
    // zh-CN 下 CNY 是 "¥"、USD 是 "US$";en-US 下分别是 "CN¥" 与 "$"。
    expect(formatPrice(123450, "CNY", "zh")).toBe("¥1,234.50");
    expect(formatPrice(123450, "CNY", "en")).toBe("CN¥1,234.50");
    expect(formatPrice(4990, "USD", "zh")).toBe("US$49.90");
    expect(formatPrice(4990, "USD", "en")).toBe("$49.90");
  });

  it("falls back to USD instead of throwing when the currency code is missing", () => {
    expect(formatPrice(4990, "")).toBe("$49.90");
  });
});

describe("cartTotal", () => {
  const line = (priceCents: number, currency: string, quantity = 1) => ({
    priceCents,
    currency,
    quantity,
  });

  it("sums a single-currency bag and reports that currency", () => {
    expect(cartTotal([line(3790, "GBP", 2), line(3290, "GBP")])).toEqual({
      cents: 10870,
      currency: "GBP",
      mixed: false,
    });
  });

  it("returns an empty USD total for an empty bag", () => {
    expect(cartTotal([])).toEqual({ cents: 0, currency: "USD", mixed: false });
  });

  it("normalizes the currency code casing coming from the API", () => {
    expect(cartTotal([line(4990, "usd")]).currency).toBe("USD");
  });

  it("never adds different currencies into one number — it flags the bag instead", () => {
    // 混币只会出现在"访客市场变了"或"部分行回退到本地 USD 快照"的边界情况。
    // 相加会得出一个假金额(既不是 USD 也不是 GBP),所以只累加主币种并置位 mixed。
    const total = cartTotal([line(3790, "GBP", 2), line(4590, "USD")]);
    expect(total).toEqual({ cents: 7580, currency: "GBP", mixed: true });
  });
});

describe("clampQuantity", () => {
  it("clamps to minimum 1", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
  });

  it("clamps to maximum 99", () => {
    expect(clampQuantity(150)).toBe(99);
  });

  it("truncates non-integers and NaN", () => {
    expect(clampQuantity(2.9)).toBe(2);
    expect(clampQuantity(Number.NaN)).toBe(1);
  });
});
