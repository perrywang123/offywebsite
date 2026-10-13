import { describe, expect, it } from "vitest";
import { MERCH_SERIES_SLUG, getSeriesName, merchSeriesName, seriesList, seriesMap } from "./series";

/**
 * `merch` 哨兵系列 —— 不属于任何 Shopify Collection 的已发布商品(贴纸、帆布包
 * 这类非公仔周边)。它**不是**一个真实系列:没有 /collections/merch 页面,也不
 * 该出现在系列导航 / sitemap 里;它只需要一个展示名。
 */
describe("merch 哨兵系列", () => {
  it('哨兵值就是 "merch"(Product.series 的类型字面量与之对齐)', () => {
    expect(MERCH_SERIES_SLUG).toBe("merch");
  });

  it("有中英显示名(占位文案,待老板确认)", () => {
    expect(getSeriesName("merch")).toEqual(merchSeriesName);
    expect(merchSeriesName.en.trim().length).toBeGreaterThan(0);
    expect(merchSeriesName.zh.trim().length).toBeGreaterThan(0);
  });

  it("不进 seriesList —— 否则会多出一个不存在的系列页/导航项", () => {
    expect(seriesList.map((s) => s.slug)).toEqual([
      "princess-lady",
      "outdoor-sporty",
      "playful-life",
    ]);
    expect(seriesList.some((s) => (s.slug as string) === MERCH_SERIES_SLUG)).toBe(false);
    expect(seriesMap[MERCH_SERIES_SLUG]).toBeUndefined();
  });

  it("真实系列仍取系列表里的名字,未知 slug 返回 undefined", () => {
    expect(getSeriesName("princess-lady")).toEqual({ zh: "公主lady系列", en: "Princess Lady" });
    expect(getSeriesName("no-such-series")).toBeUndefined();
  });
});
