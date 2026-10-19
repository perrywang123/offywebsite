import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { publicPath } from "@/i18n/routing";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { getLiveProductsBySeries, getLiveSeriesList } from "@/server/catalog/live";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CategoryTabs } from "@/components/layout/CategoryTabs";
import { Reveal } from "@/components/Reveal";

export const revalidate = 60;

/**
 * 本页自己的 metadata。
 *
 * 系列名取 `getLiveSeriesList()` 的**实时值**(商家改 Shopify Collection 标题,
 * 下次请求就生效),不写死;查不到该 slug 时退回 "Series" —— 此时页面主体
 * 会 notFound(),metadata 只是不留下一个继承自首页的 canonical。
 * description 用该系列的 tagline(数据源 `lib/catalog/series.ts`)。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; series: string }>;
}): Promise<Metadata> {
  const { locale, series: slug } = await params;
  const series = (await getLiveSeriesList()).find((s) => s.slug === slug);
  const isZh = locale === "zh";

  return {
    title: series ? (isZh ? series.name.zh : series.name.en) : "Series",
    description: series
      ? isZh
        ? series.tagline.zh
        : series.tagline.en
      : "Three OFFY series: princess, streetwear and dress-up.",
    alternates: { canonical: publicPath(locale, `/collections/${slug}`) },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ locale: string; series: string }>;
}) {
  const { locale, series: slug } = await params;
  const t = await getTranslations("catalog");
  // 价格按访客所在国家的市场币种(读 headers() → 本页按请求渲染)。
  const country = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);

  // 实时拉取:系列名称/该系列下的商品清单均来自 Shopify 当前真实状态,
  // 不再依赖本地手写死的快照;Shopify 不可达时内部自动回退本地数据。
  const seriesList = await getLiveSeriesList();
  const series = seriesList.find((s) => s.slug === slug);
  if (!series) notFound();

  const products = await getLiveProductsBySeries(series.slug, country);
  const idx = seriesList.findIndex((s) => s.slug === slug);
  const name = locale === "zh" ? series.name.zh : series.name.en;
  const tagline = locale === "zh" ? series.tagline.zh : series.tagline.en;

  return (
    <>
      <CategoryTabs series={seriesList} active={slug} locale={locale} />

      {/* 分类大图 hero(系列专属头图,与首页轮播图一致) */}
      <section className="bg-ink relative flex min-h-[62vh] items-end overflow-hidden">
        <div className="animate-ken-burns absolute inset-0">
          <Image
            src={series.heroImage}
            alt={name}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="from-ink/85 via-ink/25 absolute inset-0 bg-gradient-to-t to-transparent" />
        <div className="grain absolute inset-0 opacity-[0.05]" />
        <div className="container-site relative z-10 pb-14">
          <p className="kicker kicker--on-dark mb-3">
            {t("seriesHeroKicker", { n: String(idx + 1).padStart(2, "0"), count: products.length })}
          </p>
          <h1 className="font-display text-cream max-w-3xl text-5xl leading-[0.95] font-semibold tracking-tight uppercase md:text-7xl">
            {name}
          </h1>
          <p className="text-cream/80 mt-4 max-w-md text-lg">{tagline}</p>
        </div>
      </section>

      {/* 产品网格 */}
      <section className="container-site section-y lg:py-20">
        <Reveal className="mb-8 flex items-end justify-between">
          <p className="kicker">{t("looksCount", { count: products.length })}</p>
        </Reveal>
        <ProductGrid products={products} locale={locale} density="series" />
      </section>
    </>
  );
}
