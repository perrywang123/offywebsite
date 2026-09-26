import type { MetadataRoute } from "next";
import { products, seriesList } from "@/lib/catalog";
import { env } from "@/lib/env";

/** 全站 sitemap:静态路由 + 19 个商品详情 + 3 个系列页,双语言。 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.SITE_URL;
  const locales = ["zh", "en"] as const;

  const staticPaths = ["", "/products", "/collections", "/about", "/bag-charm"];
  const productPaths = products.map((p) => `/products/${p.code}`);
  const seriesPaths = seriesList.map((s) => `/collections/${s.slug}`);

  return locales.flatMap((locale) =>
    [...staticPaths, ...seriesPaths, ...productPaths].map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])),
      },
    })),
  );
}
