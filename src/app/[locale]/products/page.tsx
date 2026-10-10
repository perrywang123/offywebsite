import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { getLiveProducts, getLiveSeriesList } from "@/server/catalog/live";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CategoryTabs } from "@/components/layout/CategoryTabs";

export const revalidate = 60;

/**
 * 全量商品列表:每次请求实时拉取 Shopify 当前已发布的全部商品(跨 3 个系列),
 * 而不是本地手写死的快照——商家在 Shopify 上新增/下架商品,下一次请求即生效。
 * Shopify 不可达时 `getLiveProducts` 内部自动回退本地静态目录。
 *
 * 价格按访客所在国家的市场币种返回(读 headers() → 本页按请求渲染)。
 */
async function resolveProducts(country: string) {
  return getLiveProducts(country);
}

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("catalog");

  const country = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);
  const [products, series] = await Promise.all([resolveProducts(country), getLiveSeriesList()]);

  return (
    <>
      <CategoryTabs series={series} active={undefined} locale={locale} />
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <header className="mb-10">
          <p className="kicker mb-3">{t("kicker", { count: products.length })}</p>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-tight md:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-ink-soft">{t("subtitle")}</p>
        </header>

        <ProductGrid products={products} locale={locale} />
      </div>
    </>
  );
}
