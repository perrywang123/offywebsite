import { describe, expect, it } from "vitest";
import approved from "../../../docs/design/seo-phase1-preview/copy-preview.json";
import { pageMetadata, productSearchCopy, searchCopy, seriesSearchCopy } from "./metadata";

describe("approved search metadata", () => {
  it.each(["/", "/products", "/collections", "/about", "/our-story", "/faq", "/bag-charm"])(
    "uses the reviewed title and summary for %s with matching page signals",
    (path) => {
      const copy = searchCopy[path];
      const expected = approved.pages.find((page) => page.path === path)!;
      expect(copy).toEqual({ title: expected.title, description: expected.description });
      const result = pageMetadata("en", path, copy);
      expect(result.title).toEqual({ absolute: expected.title });
      expect(result.alternates).toEqual({ canonical: path, languages: { en: path } });
      expect(result.openGraph).toMatchObject({
        title: expected.title,
        description: expected.description,
        url: path,
        siteName: "is.offy",
      });
    },
  );

  it("never silently advertises the upcoming teaser as purchasable stock", () => {
    expect(searchCopy["/bag-charm"].title).toContain("Upcoming");
    expect(searchCopy["/bag-charm"].description).toContain("upcoming");
  });

  it("uses individual nonblank Shopify SEO fields and avoids adding the brand twice", () => {
    expect(
      productSearchCopy(
        {
          name: { en: "LIVE NAME", zh: "" },
          description: { en: "Live product copy", zh: "" },
          seo: { title: "  Custom | is.offy  ", description: " " },
        },
        "en",
      ),
    ).toEqual({ title: "Custom | is.offy", description: "Live product copy" });
    expect(
      productSearchCopy(
        {
          name: { en: "LIVE NAME", zh: "" },
          description: { en: "Live product copy", zh: "" },
          seo: { title: null, description: "Merchant SEO description" },
        },
        "en",
      ),
    ).toEqual({ title: "LIVE NAME | is.offy", description: "Merchant SEO description" });
  });

  it("uses current product text when SEO is missing and does not invent a product type", () => {
    const result = productSearchCopy(
      {
        name: { en: "GIFT TOTE", zh: "" },
        description: { en: "", zh: "" },
        descriptionBlocks: { en: [{ text: "Current Shopify paragraph", bold: false }], zh: [] },
      },
      "en",
    );
    expect(result).toEqual({
      title: "GIFT TOTE | is.offy",
      description: "Current Shopify paragraph",
    });
    expect(result.title).not.toContain("Plush Bag Charm");
  });

  it("prefers Shopify collection SEO while keeping a reviewed series fallback", () => {
    expect(
      seriesSearchCopy({
        slug: "princess-lady",
        seo: { title: "Shopify title", description: null },
      }),
    ).toEqual({
      title: "Shopify title | is.offy",
      description: approved.pages.find((p) => p.path === "/collections/princess-lady")!.description,
    });
  });
});
