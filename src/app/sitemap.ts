import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getLiveProducts, getLiveSeriesList } from "@/server/catalog/live";
import { POLICY_HANDLES } from "@/server/catalog/policies";

/** 全站 sitemap:静态路由 + 当前 Shopify 实时在售商品详情 + 系列页,双语言。 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SITE_URL;
  const locales = ["zh", "en"] as const;

  const [products, seriesList] = await Promise.all([getLiveProducts(), getLiveSeriesList()]);

  // 政策页必须进 sitemap:支付渠道/广告平台审核会检查政策可达性
  const staticPaths = [
    "",
    "/products",
    "/collections",
    "/about",
    "/bag-charm",
    ...POLICY_HANDLES.map((h) => `/policies/${h}`),
  ];
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
