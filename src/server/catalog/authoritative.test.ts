// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../shopify/catalog", () => ({
  fetchShopifyCollections: vi.fn(),
  fetchShopifyCollectionProducts: vi.fn(),
  fetchShopifyProductsOutsideCollections: vi.fn(),
}));
vi.mock("../shopify/products", () => ({ fetchProductData: vi.fn() }));
import {
  fetchShopifyCollections,
  fetchShopifyCollectionProducts,
  fetchShopifyProductsOutsideCollections,
} from "../shopify/catalog";
import { fetchProductData } from "../shopify/products";
import {
  getLiveProductByCode,
  getLiveProducts,
  getLiveNewLooksProducts,
  getLiveSeriesList,
  toLiveProduct,
} from "./live";
beforeEach(() => vi.resetAllMocks());
describe("Shopify authority", () => {
  it("propagates outages instead of resurrecting a known local product", async () => {
    vi.mocked(fetchProductData).mockRejectedValue(new Error("timeout"));
    await expect(getLiveProductByCode("swan-princess", "GB")).rejects.toThrow();
  });
  it("does not resurrect a confirmed missing product", async () => {
    vi.mocked(fetchProductData).mockResolvedValue(null);
    expect(await getLiveProductByCode("swan-princess", "US")).toBeUndefined();
  });
  it("does not return a partial all-looks catalog or invented new looks", async () => {
    vi.mocked(fetchShopifyCollectionProducts).mockResolvedValue([]);
    vi.mocked(fetchShopifyProductsOutsideCollections).mockRejectedValue(new Error("timeout"));
    await expect(getLiveProducts("US")).rejects.toThrow();
    vi.mocked(fetchShopifyCollectionProducts).mockRejectedValue(new Error("timeout"));
    await expect(getLiveNewLooksProducts("US")).rejects.toThrow();
  });
  it("does not return local series titles on an outage", async () => {
    vi.mocked(fetchShopifyCollections).mockRejectedValue(new Error("timeout"));
    await expect(getLiveSeriesList()).rejects.toThrow();
  });
  it("never substitutes local photos, badges or translations", () => {
    const p = toLiveProduct(
      {
        handle: "swan-princess",
        title: "Renamed in Shopify",
        priceCents: 0,
        currency: "SGD",
        image: null,
        available: false,
      },
      "merch",
      0,
    );
    expect(p.name).toEqual({ en: "Renamed in Shopify", zh: "Renamed in Shopify" });
    expect(p.images).toEqual([]);
    expect(p.priceCents).toBe(0);
    expect(p.currency).toBe("SGD");
    expect(p.isAvailable).toBe(false);
    expect(p.badge).toBeUndefined();
    expect(p.featured).toBe(false);
  });
});
