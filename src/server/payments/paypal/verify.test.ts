import { describe, expect, it } from "vitest";
import { amountMatches, assertCurrencyUsd, extractApproveUrl } from "./verify";

describe("verify (pure)", () => {
  it("amountMatches requires exact string equality", () => {
    expect(amountMatches("45.00", "45.00")).toBe(true);
    expect(amountMatches("45.00", "45.01")).toBe(false);
    expect(amountMatches("45.00", undefined)).toBe(false);
  });

  it("assertCurrencyUsd only accepts USD", () => {
    expect(assertCurrencyUsd("USD")).toBe(true);
    expect(assertCurrencyUsd("EUR")).toBe(false);
    expect(assertCurrencyUsd(undefined)).toBe(false);
  });

  it("extractApproveUrl finds the approve link", () => {
    expect(
      extractApproveUrl([
        { rel: "self", href: "https://x" },
        { rel: "approve", href: "https://www.paypal.com/checkoutnow?token=ABC" },
      ]),
    ).toBe("https://www.paypal.com/checkoutnow?token=ABC");
    expect(extractApproveUrl(undefined)).toBeUndefined();
  });
});
