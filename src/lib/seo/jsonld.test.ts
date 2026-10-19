import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/catalog/types";
import { faqParts } from "@/lib/faq";
import {
  ORGANIZATION_LOGO_PATH,
  ORGANIZATION_SAME_AS,
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from "./jsonld";

const SITE = "https://isoffy.com";

const PRODUCT: Product = {
  code: "black-pearl",
  slug: "black-pearl",
  series: "princess-lady",
  name: { en: "DOTTY DARLING", zh: "黑珍珠" },
  description: { en: "A tiny pearl with a big mood.", zh: "一颗很有态度的小珍珠。" },
  priceCents: 4590,
  currency: "USD",
  dimensions: null,
  images: [
    "/assets/products/wcoffy-cpl01.jpg",
    "https://cdn.shopify.com/s/files/1/0999/4174/4929/files/02.jpg?v=1",
  ],
  emotionTags: { en: [], zh: [] },
  featured: false,
  isAvailable: true,
  isUpcoming: false,
  isQuoteOnly: false,
  sortOrder: 0,
  skuCode: "OFFY-CPL-01",
};

const offersOf = (ld: Record<string, unknown>) => ld.offers as Record<string, unknown>;

describe("productJsonLd", () => {
  it("emits the Product + Offer shape Google expects", () => {
    const ld = productJsonLd({ product: PRODUCT, locale: "en", siteUrl: SITE });

    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "DOTTY DARLING",
      description: "A tiny pearl with a big mood.",
      sku: "OFFY-CPL-01",
      brand: { "@type": "Brand", name: "is.offy" },
      offers: {
        "@type": "Offer",
        url: "https://isoffy.com/products/black-pearl",
        price: "45.90",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    });
  });

  it("lists every image as an absolute URL, leaving CDN URLs untouched", () => {
    const ld = productJsonLd({ product: PRODUCT, locale: "en", siteUrl: SITE });

    expect(ld.image).toEqual([
      "https://isoffy.com/assets/products/wcoffy-cpl01.jpg",
      "https://cdn.shopify.com/s/files/1/0999/4174/4929/files/02.jpg?v=1",
    ]);
  });

  it("takes price and currency from the product — never hardcodes USD", () => {
    // Shopify returns the visitor's market currency. A UK visitor seeing £37.90
    // must get GBP in the Offer too, otherwise Google flags a price mismatch.
    const ld = productJsonLd({
      product: { ...PRODUCT, priceCents: 3790, currency: "GBP" },
      locale: "en",
      siteUrl: SITE,
    });

    expect(offersOf(ld)).toMatchObject({ price: "37.90", priceCurrency: "GBP" });
  });

  it("always writes the price with two decimals", () => {
    const ld = productJsonLd({
      product: { ...PRODUCT, priceCents: 5000 },
      locale: "en",
      siteUrl: SITE,
    });

    expect(offersOf(ld).price).toBe("50.00");
  });

  it("marks sold-out products OutOfStock", () => {
    const ld = productJsonLd({
      product: { ...PRODUCT, isAvailable: false },
      locale: "en",
      siteUrl: SITE,
    });

    expect(offersOf(ld).availability).toBe("https://schema.org/OutOfStock");
  });

  it("omits sku when the merchant has not set one", () => {
    const ld = productJsonLd({
      product: { ...PRODUCT, skuCode: undefined },
      locale: "en",
      siteUrl: SITE,
    });

    expect(ld).not.toHaveProperty("sku");
  });

  it("uses the localized name/description, and falls back to description blocks when description is empty", () => {
    const zh = productJsonLd({ product: PRODUCT, locale: "zh", siteUrl: SITE });
    expect(zh.name).toBe("黑珍珠");
    expect(zh.description).toBe("一颗很有态度的小珍珠。");

    const fromBlocks = productJsonLd({
      product: {
        ...PRODUCT,
        description: { en: "", zh: "" },
        descriptionBlocks: {
          en: [
            { text: "Lead line", bold: true },
            { text: "Body copy", bold: false },
          ],
          zh: [],
        },
      },
      locale: "en",
      siteUrl: SITE,
    });
    expect(fromBlocks.description).toBe("Lead line\nBody copy");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers items from 1 and makes every item URL absolute", () => {
    const ld = breadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "Shop", path: "/products" },
        { name: "Princess Lady", path: "/collections/princess-lady" },
        { name: "DOTTY DARLING", path: "/products/black-pearl" },
      ],
      SITE,
    );

    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://isoffy.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Shop",
          item: "https://isoffy.com/products",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Princess Lady",
          item: "https://isoffy.com/collections/princess-lady",
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "DOTTY DARLING",
          item: "https://isoffy.com/products/black-pearl",
        },
      ],
    });
  });
});

describe("organizationJsonLd / websiteJsonLd", () => {
  it("Organization carries the brand, real logo path and Instagram profile", () => {
    expect(organizationJsonLd(SITE)).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "is.offy",
      url: "https://isoffy.com",
      logo: "https://isoffy.com/assets/brand/is-offy-logo.png",
      sameAs: ["https://www.instagram.com/is.offy"],
    });
    expect(ORGANIZATION_SAME_AS).toEqual(["https://www.instagram.com/is.offy"]);
  });

  it("logo path points at a file that actually exists in public/", () => {
    const file = join(process.cwd(), "public", ORGANIZATION_LOGO_PATH.replace(/^\/+/, ""));
    expect(existsSync(file)).toBe(true);
  });

  it("WebSite is the site itself, not a search action we do not have", () => {
    expect(websiteJsonLd(SITE)).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "is.offy",
      url: "https://isoffy.com",
    });
  });
});

describe("faqJsonLd", () => {
  const items = faqParts.flatMap((part) => part.items);

  it("flattens all three parts into 10 Questions with their source wording", () => {
    const ld = faqJsonLd(faqParts);
    const questions = ld.mainEntity as Array<Record<string, unknown>>;

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("FAQPage");
    expect(questions).toHaveLength(10);
    expect(questions.map((q) => q.name)).toEqual(items.map((item) => item.q));
    expect(questions.every((q) => q["@type"] === "Question")).toBe(true);
  });

  it("flattens FaqBlock[] to plain text — no <strong>, no HTML tags", () => {
    const questions = faqJsonLd(faqParts).mainEntity as Array<Record<string, unknown>>;

    questions.forEach((question, index) => {
      const answer = question.acceptedAnswer as Record<string, unknown>;
      const expected = items[index].a
        .map((block) => block.map((segment) => segment.text).join(""))
        .join("\n");

      expect(answer["@type"]).toBe("Answer");
      expect(answer.text).toBe(expected);
      expect(answer.text).not.toContain("<");
      expect(answer.text).not.toContain(">");
    });

    // Spot-check that the bold lead is present as plain text, not markup.
    const first = questions[0].acceptedAnswer as Record<string, unknown>;
    expect(first.text).toMatch(/^In-Stock Items: Our processing time is up to 72 hours/);
  });
});
