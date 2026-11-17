import type { Metadata } from "next";
import type { Product, Series } from "@/lib/catalog/types";
import { publicPath, routing } from "@/i18n/routing";

export interface SearchCopy {
  title: string;
  description: string;
}

/** Approved editorial search copy; never a product/price snapshot. */
export const searchCopy: Record<string, SearchCopy> = {
  "/": {
    title: "is.offy | Designer Plush Bag Charms & Art Toys",
    description:
      "Discover OFFY plush bag charms with curly hair, statement glasses and a style all their own. Explore original designs and find your favorite look.",
  },
  "/products": {
    title: "Plush Bag Charms – Shop All OFFY Styles | is.offy",
    description:
      "Explore OFFY plush bag charms across Princess, Streetwear and Dress-up styles. Find the curly-haired companion that feels like you.",
  },
  "/collections": {
    title: "OFFY Plush Doll Collections & Series | is.offy",
    description:
      "Explore Princess, Streetwear and Dress-up: three sides of OFFY, with curly hair, statement glasses and a style to match your mood.",
  },
  "/collections/princess-lady": {
    title: "Princess Series Plush Bag Charms | is.offy",
    description:
      "Discover the softer side of OFFY. Explore the Princess Series of plush bag charms, from delicate dresses to quietly confident everyday looks.",
  },
  "/collections/outdoor-sporty": {
    title: "Streetwear Series Plush Bag Charms | is.offy",
    description:
      "Bring OFFY along for the everyday. Explore streetwear-inspired plush bag charms with expressive outfits, curly hair and statement glasses.",
  },
  "/collections/playful-life": {
    title: "Dress-up Series Plush Bag Charms | is.offy",
    description:
      "Meet OFFY in a new look. Explore Dress-up Series plush bag charms with characterful outfits, signature curls and statement glasses.",
  },
  "/about": {
    title: "About is.offy – Original Plush Art Toys",
    description:
      "Get to know OFFY, the original character by WHIMCORE. Discover the idea behind the curls, the many looks and a little world made for self-expression.",
  },
  "/our-story": {
    title: "The Story of OFFY & Creator Gia | is.offy",
    description:
      "Meet Gia, OFFY's creator, and explore Briar Island, the original sketches and the many versions of one sleepy-eyed girl.",
  },
  "/bag-charm": {
    title: "Upcoming OFFY Bag Charm Collection | is.offy",
    description:
      "A first look at OFFY's upcoming bag charm collection. Explore the character previews and follow is.offy for future release updates.",
  },
  "/faq": {
    title: "OFFY FAQs – Orders, Shipping & Returns | is.offy",
    description:
      "Find answers to common questions about OFFY orders, shipping, returns and product details. Read our FAQs before placing an order.",
  },
};

/** Keep explicit merchant branding intact; an absolute title prevents Next's template doubling it. */
function branded(title: string): string {
  return /\bis\.?offy\b/i.test(title) ? title : `${title} | is.offy`;
}

function summary(text: string): string {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= 160) return plain;
  const prefix = plain.slice(0, 157);
  return `${prefix.slice(0, prefix.lastIndexOf(" ") > 100 ? prefix.lastIndexOf(" ") : prefix.length)}…`;
}

export function pageMetadata(locale: string, path: string, copy: SearchCopy): Metadata {
  const url = publicPath(locale, path);
  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(routing.locales.map((l) => [l, publicPath(l, path)])),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url,
      siteName: "is.offy",
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [{ url: "/assets/hero/hero-brand.jpg", width: 3250, height: 2041, alt: "is.offy" }],
    },
  };
}

export function productSearchCopy(
  product: Pick<Product, "name" | "description" | "seo" | "descriptionBlocks">,
  locale: string,
): SearchCopy {
  const name = locale === "zh" ? product.name.zh || product.name.en : product.name.en;
  const description =
    locale === "zh" ? product.description.zh || product.description.en : product.description.en;
  const blocks = (locale === "zh" ? product.descriptionBlocks?.zh : undefined)?.length
    ? product.descriptionBlocks?.zh
    : product.descriptionBlocks?.en;
  return {
    title: branded(product.seo?.title?.trim() || name),
    description:
      product.seo?.description?.trim() ||
      summary(description || blocks?.map((b) => b.text).join(" ") || name),
  };
}

export function seriesSearchCopy(series: Pick<Series, "slug" | "seo">): SearchCopy {
  const fallback = searchCopy[`/collections/${series.slug}`];
  return {
    title: series.seo?.title?.trim() ? branded(series.seo.title.trim()) : fallback.title,
    description: series.seo?.description?.trim() || fallback.description,
  };
}
