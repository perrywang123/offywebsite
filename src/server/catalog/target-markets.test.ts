import { describe, expect, it } from "vitest";
import { DEFAULT_TARGET_MARKETS, targetMarkets, regionCodes } from "./regional";

describe("区域限定的目标市场白名单", () => {
  it("默认只有 US / GB / SG / HK —— 后台只在这 4 个市场配了限定款", () => {
    expect(DEFAULT_TARGET_MARKETS).toEqual(["US", "GB", "SG", "HK"]);
    expect(targetMarkets()).toEqual(["US", "GB", "SG", "HK"]);
  });

  it("白名单与探测范围是两份独立的清单", () => {
    // 探测范围(SHOPIFY_REGIONS 默认值)比白名单大得多 —— 它是用来判断
    // "某商品是不是在所有国家都可见"的,与"哪些访客能看到这块内容"无关。
    expect(regionCodes().length).toBeGreaterThan(targetMarkets().length);
    for (const cc of DEFAULT_TARGET_MARKETS) expect(regionCodes()).toContain(cc);
  });

  it("非目标国不在白名单里 —— 这是防止「凭空造徽章」的那道闸", () => {
    // 伊朗:后台从未配置过市场,任何"仅限伊朗"的判定都是凭空产生的。
    for (const cc of ["IR", "DE", "BR", "CN", "MO", "CA"]) {
      expect(targetMarkets()).not.toContain(cc);
    }
  });
});
