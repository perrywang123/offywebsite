import { describe, expect, it } from "vitest";
import { centsToUsdString } from "./pricing";

describe("centsToUsdString", () => {
  it("converts integer cents to two-decimal USD string", () => {
    expect(centsToUsdString(4500)).toBe("45.00");
    expect(centsToUsdString(2200)).toBe("22.00");
    expect(centsToUsdString(9900)).toBe("99.00");
  });

  it("handles small amounts", () => {
    expect(centsToUsdString(1)).toBe("0.01");
    expect(centsToUsdString(0)).toBe("0.00");
  });
});
