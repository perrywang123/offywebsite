import { describe, expect, it } from "vitest";
import { officialLink, safeStorefrontTarget } from "./links";

describe("Collabs official storefront links", () => {
  it("preserves official discount attribution and UTM values", () =>
    expect(
      officialLink(
        "https://isoffy.com/discount/MAYA?redirect=%2Fproducts&dt_id=123&utm_source=maya",
        "https://isoffy.com",
      ),
    ).toBe("https://isoffy.com/discount/MAYA?redirect=%2Fproducts&dt_id=123&utm_source=maya"));
  it.each([
    "http://isoffy.com/discount/MAYA",
    "https://evil.test/discount/MAYA",
    "https://u:p@isoffy.com/discount/MAYA",
    "https://isoffy.com/r/maya",
    "https://isoffy.com/admin",
    "https://isoffy.com/api/payments/checkout",
    "https://isoffy.com/%61dmin",
    "https://isoffy.com/discount/MAYA?redirect=https%3A%2F%2Fevil.test",
    "https://isoffy.com/#maya",
  ])("rejects unsafe or untrackable links: %s", (url) =>
    expect(() => officialLink(url, "https://isoffy.com")).toThrow(),
  );
  it.each([
    "//evil.test",
    "/\\evil.test",
    "https://evil.test/",
    "/%2f%2fevil.test",
    "/%2561dmin",
    "/admin/checkouts",
    "/api/health",
    "/r/maya",
    "/discount/MAYA",
    "/products\r\nLocation: evil",
  ])("rejects unsafe return targets: %s", (target) =>
    expect(() => safeStorefrontTarget(target)).toThrow(),
  );
  it("allows genuine shop pages and query strings", () =>
    expect(safeStorefrontTarget("/products/wild-sweetie?dt_id=123&utm_source=maya")).toBe(
      "/products/wild-sweetie?dt_id=123&utm_source=maya",
    ));
});

describe("official personalized links on the shop's Shopify domain", () => {
  it("resolves a copied official personalized link before using the Offy storefront domain", async () => {
    const { resolveOfficialLink } = await import("./links");
    expect(
      await resolveOfficialLink(
        "https://shop.myshopify.com/maya",
        "https://isoffy.com",
        "shop.myshopify.com",
        async () => "/discount/MAYA?redirect=%2F&dt_id=123",
      ),
    ).toBe("https://isoffy.com/discount/MAYA?redirect=%2F&dt_id=123");
  });
  it("rejects another shop, missing official tracking redirects and unsafe redirect targets", async () => {
    const { resolveOfficialLink } = await import("./links");
    await expect(
      resolveOfficialLink(
        "https://other.myshopify.com/maya",
        "https://isoffy.com",
        "shop.myshopify.com",
        async () => null,
      ),
    ).rejects.toThrow();
    await expect(
      resolveOfficialLink(
        "https://shop.myshopify.com/maya",
        "https://isoffy.com",
        "shop.myshopify.com",
        async () => null,
      ),
    ).rejects.toThrow("official_redirect_missing");
    await expect(
      resolveOfficialLink(
        "https://shop.myshopify.com/maya",
        "https://isoffy.com",
        "shop.myshopify.com",
        async () => "https://evil.test/discount/MAYA?dt_id=123",
      ),
    ).rejects.toThrow();
  });
});
it("permits same-origin loopback links for isolated HTTP test servers", async () => {
  const { resolveOfficialLink } = await import("./links");
  expect(
    await resolveOfficialLink(
      "http://127.0.0.1:3901/discount/MAYA?dt_id=0",
      "http://127.0.0.1:3901",
      "offy-integration.myshopify.com",
      async () => null,
    ),
  ).toBe("http://127.0.0.1:3901/discount/MAYA?dt_id=0");
});
