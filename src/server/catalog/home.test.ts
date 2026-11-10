// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testProduct } from "@/test/product";
import type { ShopifyCollectionProductItem } from "../shopify/catalog";
vi.mock("../shopify/catalog", () => ({ fetchShopifyCollectionProducts: vi.fn() }));
vi.mock("./live", () => ({
  getLiveProductsBySeries: vi.fn(),
  getLiveNewLooksProducts: vi.fn(),
}));
vi.mock("./regional", () => ({ getRegionalProducts: vi.fn() }));
import { fetchShopifyCollectionProducts } from "../shopify/catalog";
import { getLiveProductsBySeries, getLiveNewLooksProducts } from "./live";
import { getRegionalProducts } from "./regional";
import { getHomeLooks } from "./home";

const product = (code: string) => ({ ...testProduct(code), currency: "GBP", priceCents: 3390 });
const candidate = (handle: string, available = true): ShopifyCollectionProductItem => ({
  handle,
  title: handle,
  available,
  priceCents: 3390,
  currency: "GBP",
  image: "https://cdn.shopify.com/test.jpg",
  variantId: `v-${handle}`,
  sku: null,
  createdAt: "2026-01-01T00:00:00Z",
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRegionalProducts).mockResolvedValue([]);
  vi.mocked(getLiveProductsBySeries).mockImplementation(async (series) =>
    series === "princess-lady" ? Array.from({ length: 9 }, (_, i) => product(`p${i}`)) : [],
  );
  vi.mocked(getLiveNewLooksProducts).mockResolvedValue([product("fallback")]);
});

describe("homepage curated looks", () => {
  it("keeps merchant order, current-market facts and a six-product limit without changing series identity", async () => {
    vi.mocked(fetchShopifyCollectionProducts).mockResolvedValue(
      [8, 2, 6, 3, 1, 7, 0].map((i) => candidate(`p${i}`)),
    );
    const result = await getHomeLooks("GB");
    expect(result.source).toBe("featured");
    expect(result.products.map((p) => p.code)).toEqual(["p8", "p2", "p6", "p3", "p1", "p7"]);
    expect(result.products.every((p) => p.currency === "GBP" && p.priceCents === 3390)).toBe(true);
    expect(fetchShopifyCollectionProducts).toHaveBeenCalledWith("home-featured", "GB");
    expect(getLiveNewLooksProducts).not.toHaveBeenCalled();
    expect(getLiveProductsBySeries).toHaveBeenCalledTimes(3);
    expect(getRegionalProducts).toHaveBeenCalledWith("GB", { requireComplete: true });
  });

  it("skips regionals, unavailable candidates, duplicates and products outside the original series before taking six", async () => {
    vi.mocked(getRegionalProducts).mockResolvedValue([{ ...candidate("p0"), countries: ["GB"] }]);
    vi.mocked(fetchShopifyCollectionProducts).mockResolvedValue([
      candidate("p0"),
      candidate("p1", false),
      candidate("merch-only"),
      candidate("p2"),
      candidate("p2"),
      candidate("p3"),
      candidate("p4"),
      candidate("p5"),
      candidate("p6"),
      candidate("p7"),
      candidate("p8"),
    ]);
    const result = await getHomeLooks("GB");
    expect(result.products.map((p) => p.code)).toEqual(["p2", "p3", "p4", "p5", "p6", "p7"]);
    expect(result.regionals.map((p) => p.code)).toEqual(["p0"]);
    expect(result.regionals[0].badge).toBe("GB");
  });

  it("does not advertise a verified sold-out product when curated availability differs", async () => {
    vi.mocked(getLiveProductsBySeries).mockResolvedValue([
      { ...product("p0"), isAvailable: false },
    ]);
    vi.mocked(fetchShopifyCollectionProducts).mockResolvedValue([candidate("p0")]);
    expect((await getHomeLooks("GB")).products).toEqual([]);
  });

  it("does not create a single-country badge for a product visible in multiple countries", async () => {
    vi.mocked(getRegionalProducts).mockResolvedValue([
      { ...candidate("p0"), countries: ["GB", "US"] },
    ]);
    vi.mocked(fetchShopifyCollectionProducts).mockResolvedValue([candidate("p0"), candidate("p1")]);
    const result = await getHomeLooks("GB");
    expect(result.regionals[0].badge).toBeUndefined();
    expect(result.products.map((p) => p.code)).toEqual(["p1"]);
  });

  it.each([{ items: [] }, { items: [candidate("outside")] }, { items: [candidate("p0", false)] }])(
    "preserves a successful empty/fully excluded selection rather than replacing it",
    async ({ items }) => {
      vi.mocked(fetchShopifyCollectionProducts).mockResolvedValue(items);
      const result = await getHomeLooks("GB");
      expect(result.source).toBe("featured");
      expect(result.products).toEqual([]);
      expect(getLiveNewLooksProducts).not.toHaveBeenCalled();
    },
  );

  it.each(["collection missing", "GraphQL failure", "timeout"])(
    "uses the original live date selection when curated read fails: %s",
    async (reason) => {
      vi.mocked(fetchShopifyCollectionProducts).mockRejectedValue(new Error(reason));
      vi.mocked(getRegionalProducts).mockResolvedValue([{ ...candidate("p0"), countries: ["GB"] }]);
      const result = await getHomeLooks("GB");
      expect(result.source).toBe("newest");
      expect(result.products.map((p) => p.code)).toEqual(["fallback"]);
      expect(getLiveNewLooksProducts).toHaveBeenCalledWith("GB", 2, ["p0"]);
    },
  );

  it("never converts fallback or membership failures to an empty successful selection", async () => {
    vi.mocked(fetchShopifyCollectionProducts).mockRejectedValue(new Error("missing"));
    vi.mocked(getLiveNewLooksProducts).mockRejectedValue(new Error("series unavailable"));
    await expect(getHomeLooks("GB")).rejects.toThrow();
    vi.mocked(fetchShopifyCollectionProducts).mockResolvedValue([candidate("p0")]);
    vi.mocked(getLiveProductsBySeries).mockRejectedValue(new Error("membership unavailable"));
    await expect(getHomeLooks("GB")).rejects.toThrow();
  });

  it("withholds recommendations if regional classification is incomplete", async () => {
    vi.mocked(fetchShopifyCollectionProducts).mockResolvedValue([candidate("p0")]);
    vi.mocked(getRegionalProducts).mockRejectedValue(new Error("incomplete visibility"));
    await expect(getHomeLooks("GB")).rejects.toThrow();
  });
});
