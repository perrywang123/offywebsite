import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { publicPath, routing } from "@/i18n/routing";
import { getLiveProducts, getLiveSeriesList } from "@/server/catalog/live";
import { POLICY_HANDLES } from "@/server/catalog/policies";

/**
 * 全站 sitemap:静态路由 + 当前 Shopify 实时在售商品详情 + 系列页。
 *
 * URL 一律由 `publicPath` 生成 —— 英文是默认语言且 `localePrefix: "as-needed"`,
 * 所以输出的是无前缀地址(`https://isoffy.com/products`),不会再出现 `/en/...`
 * 或 `/zh/...`(后者已从 routing 的 locales 移除,不该出现在 sitemap 里)。
 * 语言列表也来自 `routing.locales`,恢复中文时这里自动跟着变。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SITE_URL;

  // sitemap 只枚举"站上有哪些商品 URL",与价格/币种无关:用默认市场
  // (SHOPIFY_MARKET_COUNTRY)查一次即可,不读访客国家(sitemap 也不该按国家分叉)。
  const [products, seriesList] = await Promise.all([
    getLiveProducts(env.SHOPIFY_MARKET_COUNTRY),
    getLiveSeriesList(),
  ]);

  // 政策页必须进 sitemap:支付渠道/广告平台审核会检查政策可达性
  const staticPaths = [
    "",
    "/products",
    "/collections",
    "/about",
    "/bag-charm",
    "/faq",
    "/policies",   // 政策二级目录页(那 4 条政策从页脚下沉到这里)
    ...POLICY_HANDLES.map((h) => `/policies/${h}`),
  ];
  const productPaths = products.map((p) => `/products/${p.code}`);
  const seriesPaths = seriesList.map((s) => `/collections/${s.slug}`);

  return routing.locales.flatMap((locale) =>
    [...staticPaths, ...seriesPaths, ...productPaths].map((path) => ({
      url: `${base}${publicPath(locale, path)}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}${publicPath(l, path)}`]),
        ),
      },
    })),
  );
}
