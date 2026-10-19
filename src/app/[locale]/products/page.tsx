import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { publicPath } from "@/i18n/routing";
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

/**
 * 本页自己的 metadata。
 *
 * 不写这个函数时,App Router 会让页面继承 `[locale]/layout.tsx` 的
 * `alternates.canonical` —— 那是**首页**地址。于是 Google 把 /products 当成
 * 首页的副本合并掉,列表页永远拿不到自己的收录位。
 *
 * canonical 一律用 `publicPath()` 算:站点 `localePrefix: "as-needed"`,
 * 英文站对外没有 `/en` 前缀,手写 `/${locale}/products` 会造出一个跳转地址。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("catalog");
  const country = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);
  const products = await resolveProducts(country);

  return {
    title: t("title"),
    // 数量用当前市场实时拉到的商品数(与页面 kicker 的 count 同源),不写死。
    description: `All ${products.length} OFFY looks across three series — princess, streetwear and dress-up.`,
    alternates: { canonical: publicPath(locale, "/products") },
  };
}

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("catalog");

  const country = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);
  const [products, series] = await Promise.all([resolveProducts(country), getLiveSeriesList()]);

  return (
    <>
      <CategoryTabs series={series} active={undefined} locale={locale} />
      {/* 版心/节奏统一(方案 §1.2:9 个页面根容器一句替换);`lg:py-12` 保留改动前
          的 48px,只有窄屏与 768–1023 变。 */}
      <div className="container-site section-y lg:py-12">
        <header className="mb-10">
          <p className="kicker mb-3">{t("kicker", { count: products.length })}</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight uppercase md:text-6xl">
            {t("title")}
          </h1>
          <p className="text-ink-soft mt-2">{t("subtitle")}</p>
        </header>

        <ProductGrid products={products} locale={locale} />
      </div>
    </>
  );
}
