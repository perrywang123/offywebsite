import { describe, it, expect } from "vitest";
import { teaserSeries } from "./index";
describe("teaserSeries (fashionable bag charm, upcoming)", () => {
  it("exposes hero image + English display title", () => {
    expect(teaserSeries.heroImage).toBeTruthy();
    expect(teaserSeries.titleEn).toBe("FASHIONABLEBAG CHARM COLLECTION");
  });

  it("exposes 6 teaser items coded WCOFFY-XXX01..06 with images", () => {
    expect(teaserSeries.items).toHaveLength(6);
    teaserSeries.items.forEach((item, i) => {
      expect(item.code).toBe(`WCOFFY-XXX0${i + 1}`);
      expect(item.image).toMatch(/^\/assets\/bag-charm\//);
    });
  });
});
