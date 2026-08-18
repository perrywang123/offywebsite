import { describe, expect, it } from "vitest";
import { clampQuantity, formatUsdCents } from "./pricing";

describe("formatUsdCents", () => {
  it("formats integer cents as USD", () => {
    expect(formatUsdCents(3999)).toBe("$39.99");
  });

  it("formats whole dollars with two decimals", () => {
    expect(formatUsdCents(4500)).toBe("$45.00");
  });

  it("formats zero", () => {
    expect(formatUsdCents(0)).toBe("$0.00");
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
