import type { Product } from "@/lib/catalog/types";
export function testProduct(code = "royal-grey", overrides: Partial<Product> = {}): Product {
  return {
    code,
    slug: code,
    series: "princess-lady",
    name: { en: "Test look", zh: "Test look" },
    description: { en: "", zh: "" },
    priceCents: 4990,
    currency: "USD",
    dimensions: null,
    images: [],
    emotionTags: { en: [], zh: [] },
    featured: false,
    isAvailable: true,
    isUpcoming: false,
    isQuoteOnly: false,
    sortOrder: 0,
    shopifyVariantId: "gid://shopify/ProductVariant/53491815579937",
    ...overrides,
  };
}
export async function testProductLookup(code: string): Promise<Product | undefined> {
  if (["royal-grey", "swan-princess", "offy_redrush"].includes(code)) return testProduct(code);
  return undefined;
}
