import { CommerceUnavailable } from "@/components/CommerceUnavailable";
import { pageMetadata, productSearchCopy } from "@/lib/seo/metadata";
import { catalogResult } from "@/server/catalog/result";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { publicPath } from "@/i18n/routing";
import {
  getLiveProductByCode,
  getLiveProductsBySeries,
  getLiveSeriesList,
} from "@/server/catalog/live";
import { getProductHandleAlias, merchSeriesName } from "@/lib/catalog";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { formatPrice } from "@/lib/pricing";
import { PurchaseActions } from "@/components/product/PurchaseActions";
import { MetaProductView } from "@/components/marketing/MetaTracking";
import { ProductGallery } from "@/components/product/ProductGallery";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { Suspense } from "react";
import { ProductBuyerPhotos } from "@/components/product/ProductBuyerPhotos";
import { ProductDetailPhotos } from "@/components/product/ProductDetailPhotos";
import { ProductGiftOffers } from "@/components/product/ProductGiftOffers";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<import("next").Metadata> {
  const { locale, code } = await params;
  const country = pickCountry(await headers());
  const result = await catalogResult(getLiveProductByCode(code, country));
  if (result.status === "unavailable")
    return {
      title: "A moment with OFFY",
      robots: { index: false, follow: true },
      alternates: { canonical: publicPath(locale, `/products/${code}`) },
      openGraph: { title: "A moment with OFFY", images: [] },
    };
  const product = result.data;
  if (!product) return {};
  const metadata = pageMetadata(
    locale,
    `/products/${product.code}`,
    productSearchCopy(product, locale),
  );
  const name = locale === "zh" ? product.name.zh : product.name.en;
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: product.images.map((url) => ({ url, alt: name })) },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  // Shopify 改过 handle 的商品:旧 URL 发 308 到当前地址,而不是 404
  // (外链/收藏/搜索结果不该因为商家改了个 handle 就全断)。映射表见
  // lib/catalog/products.ts 的 productHandleAliases。
  // 用 publicPath 而不是拼 `/${locale}`:英文站无前缀,直跳 `/products/x`,
  // 少一跳 next-intl 的前缀收敛。
  const alias = getProductHandleAlias(code);
  if (alias) permanentRedirect(publicPath(locale, `/products/${alias}`));
  // 实时拉取:标题/图片/价格/描述/库存/结算变体 ID 均为 Shopify 当前真实值,

  // 价格按访客所在国家的市场币种返回(读 headers() → 本页按请求渲染)。
  const country = pickCountry(await headers());
  const result = await catalogResult(getLiveProductByCode(code, country));
  if (result.status === "unavailable")
    return (
      <div className="container-site section-y">
        <CommerceUnavailable scene="product" heading="h1" />
      </div>
    );
  const product = result.data;
  if (!product) notFound();

  const t = await getTranslations("product");
  const tHome = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const [seriesList, relatedProducts] = await Promise.all([
    getLiveSeriesList().catch(() => []),
    getLiveProductsBySeries(product.series, country).catch(() => []),
  ]);
  const liveSeries = seriesList.find((s) => s.slug === product.series);
  // 系列展示名:真实系列用实时名(商家改 Shopify 标题即时生效);merch(贴纸/帆布包
  // 这类不属于任何系列的周边)**没有系列页**,名字取 lib/catalog/series.ts 里的
  // 哨兵展示名 —— 否则页面上会显示裸的 "merch"。
  const seriesName = liveSeries?.name ?? (product.series === "merch" ? merchSeriesName : undefined);
  const seriesLabel = seriesName ? (locale === "zh" ? seriesName.zh : seriesName.en) : "";
  // Shopify 单语言:zh 描述暂缺时回退英文原文(后续 Translate & Adapt 接管)
  const description =
    locale === "zh" ? product.description.zh || product.description.en : product.description.en;
  // 结构化描述段落(descriptionHtml):加粗导语 + 正文,优先于整段 description 展示
  const descriptionBlocks =
    locale === "zh"
      ? (product.descriptionBlocks?.zh ?? product.descriptionBlocks?.en)
      : product.descriptionBlocks?.en;
  const blocks = descriptionBlocks?.length
    ? descriptionBlocks
    : description
      ? [{ text: description, bold: false }]
      : [];
  const stylingNote =
    /^\*?\s*Outfit is securely attached to OFFY\. Glasses come unattached for DIY styling\.$/i;
  const hasStylingFacts = blocks.some(({ text }) => stylingNote.test(text.trim()));
  const [intro, ...fullDescription] = blocks.filter(({ text }) => !stylingNote.test(text.trim()));
  const siblings = relatedProducts.filter((p) => p.code !== product.code);

  // 结构化数据(第 2 批 SEO):Product+Offer 用本页渲染的同一份 product
  // (含访客市场币种),面包屑的每一级都走 publicPath + SITE_URL.
  // merch 没有系列页,面包屑里就不放系列这一级(不能伪造 /collections/merch).
  const productName = locale === "zh" ? product.name.zh : product.name.en;
  const seriesHref = liveSeries ? publicPath(locale, `/collections/${liveSeries.slug}`) : null;
  const breadcrumbLd = breadcrumbJsonLd(
    [
      { name: tCommon("nav.home"), path: publicPath(locale, "/") },
      { name: t("shopBreadcrumb"), path: publicPath(locale, "/products") },
      ...(seriesHref ? [{ name: seriesLabel, path: seriesHref }] : []),
      { name: productName, path: publicPath(locale, `/products/${product.code}`) },
    ],
    env.SITE_URL,
  );

  return (
    <>
      <JsonLd data={productJsonLd({ product, locale, siteUrl: env.SITE_URL })} />
      <JsonLd data={breadcrumbLd} />
      <MetaProductView
        product={{
          code: product.code,
          quantity: 1,
          priceCents: product.priceCents,
          currency: product.currency,
        }}
      />
      {/* 版心改 `.container-site`(16px / 8%),不再自带 `px-6`:两套边距会让
          PDP 的 logo 与标题左边缘对不齐(方案 #22)。纵向 py-12 → 窄屏 24px,
          md 起恢复 48px(≥1024px 与改动前一致)。 */}
      <div className="container-site py-6 md:py-12">
        <nav className="text-ink-muted mb-6 flex items-center gap-2 text-sm">
          {/* 面包屑原来只有 32×20px 命中区(方案 #23);--quiet 保证视觉行高不动 */}
          <Link href="/products" className="link-line tap-target--quiet">
            {t("shopBreadcrumb")}
          </Link>
          <span aria-hidden>/</span>
          {liveSeries ? (
            <Link href={`/collections/${liveSeries.slug}`} className="link-line tap-target--quiet">
              {seriesLabel}
            </Link>
          ) : (
            // merch 商品没有系列页(/collections/merch 会 404),只显示名字不给链接
            <span>{seriesLabel}</span>
          )}
        </nav>

        {/* `min-w-0` 不能省:窄屏下两列都是单列栅格项,而图区里那条自图集横滑条
            (Shopify `images(first: 10)` 最多 10 × 56px + 9 × 10px gap = 650px)的
            min-content 会顺着栅格项的 `min-width:auto` 把整条轨道撑到 650px ——
            375px 的屏直接横向溢出(实测 scrollWidth 402)。栅格项显式 min-w-0 后
            轨道回到版心宽度,超出的部分交给 `.hscroll` 自己横滑。
            注:同系列那排小图已按老板诉求删除后,这里剩的**唯一**一条横滑条就是
            自图集,它比被删掉的那排(6 × 56 + 5 × 10 = 386px)**更宽**,
            所以 min-w-0 更不能省。 */}
        <div className="grid gap-6 md:gap-12 lg:grid-cols-[6fr_5fr]">
          {/* 图区 */}
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card bg-paper shadow-soft overflow-hidden p-2">
              {/* 主图是**可切换的自图集**:Shopify 侧 images(first: 10) 取回最多 10 张。
                  同系列其它商品的小图条已删除(与页尾 More 网格字面重复),
                  换款入口统一走页尾的「More from this series」。 */}
              <ProductGallery
                images={product.images}
                alt={locale === "zh" ? product.name.zh : product.name.en}
                sizes="(max-width:1024px) 100vw, 55vw"
              />
            </div>
          </div>

          <div className="min-w-0 space-y-5 md:space-y-6">
            <div>
              {seriesLabel && <p className="kicker mb-2.5">{seriesLabel}</p>}
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h1 className="font-display min-w-0 text-3xl font-semibold tracking-tight break-words md:text-4xl">
                  {productName}
                </h1>
                {product.isUpcoming ? (
                  <p className="text-brown-600 text-sm font-medium tracking-[var(--tracking-14)] uppercase">
                    {tHome("revealing")}
                  </p>
                ) : (
                  <p className="font-display text-ink text-xl font-medium tabular-nums md:text-2xl">
                    {formatPrice(product.priceCents, product.currency, locale)}
                  </p>
                )}
              </div>
            </div>

            {intro && <p className="text-ink text-base leading-relaxed">{intro.text}</p>}

            {product.isUpcoming ? (
              <p className="bg-cream-deep text-ink-muted rounded-full px-6 py-3 text-center text-sm">
                {t("upcomingNotice")}
              </p>
            ) : (
              <div className="max-md:hidden">
                <PurchaseActions
                  code={product.code}
                  isAvailable={product.isAvailable && Boolean(product.shopifyVariantId)}
                  isUpcoming={product.isUpcoming}
                />
              </div>
            )}

            {product.isAvailable && !product.isUpcoming && product.shopifyVariantId && (
              <Suspense key={product.code + country} fallback={null}>
                <ProductGiftOffers
                  handle={product.code}
                  country={country}
                  variantId={product.shopifyVariantId}
                />
              </Suspense>
            )}

            {hasStylingFacts && (
              <dl className="border-cream-line grid grid-cols-2 gap-3 border-t pt-4 text-sm">
                <div>
                  <dt className="font-medium">{t("styling.outfit")}</dt>
                  <dd className="text-ink-muted mt-1">{t("styling.attached")}</dd>
                </div>
                <div className="border-cream-line border-l pl-3">
                  <dt className="font-medium">{t("styling.glasses")}</dt>
                  <dd className="text-ink-muted mt-1">{t("styling.unattached")}</dd>
                </div>
              </dl>
            )}
            {fullDescription.length > 0 && (
              <details className="pdp-disclosure border-cream-line border-t">
                <summary>{t("fullDescription")}</summary>
                <div className="text-ink space-y-3 pb-4 text-sm leading-relaxed">
                  {fullDescription.map((block, index) => (
                    <p key={index} className={block.bold ? "font-bold" : undefined}>
                      {block.text}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        <Suspense key={product.code + country + "-media"} fallback={null}>
          <ProductDetailPhotos handle={product.code} country={country} />
        </Suspense>

        <Suspense key={product.code} fallback={null}>
          <ProductBuyerPhotos handle={product.code} country={country} productName={productName} />
        </Suspense>

        {/* 相关 */}
        {siblings.length > 0 && (
          <section className="mt-10 md:mt-20">
            <Reveal className="mb-6">
              <h2 className="font-display text-2xl font-semibold tracking-tight">{t("related")}</h2>
            </Reveal>
            {/* 窄屏 3 列 → 2 列:3 列时每格只有 98.3px,商品名被砍到 14 个字符以内
              (方案 #16);sizes 也要跟着改,否则按 33vw 过采。 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-6">
              {siblings.map((sibling) => (
                <Link key={sibling.code} href={`/products/${sibling.code}`} className="group">
                  <div className="rounded-soft bg-paper relative aspect-[3/4] overflow-hidden">
                    {sibling.images[0] && (
                      <Image
                        src={sibling.images[0]}
                        alt={sibling.name.en}
                        fill
                        sizes="(max-width:768px) 50vw, 16vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="text-ink-soft mt-2 truncate text-xs">
                    {locale === "zh" ? sibling.name.zh : sibling.name.en}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 吸底购买条:必须在 `.container-site` 之外、且是页面内容最后一个流内子元素
          —— sticky + bottom:0 靠"自然位置在视口下方时上提贴住视口底"工作,
          若塞进信息区的列里,它的 containing block 只有那一列高,滚过半屏就失效。
          祖先链上不得有 overflow-hidden(方案 R3);`md:hidden` 保证桌面端不存在。 */}
      <StickyBuyBar
        code={product.code}
        priceCents={product.priceCents}
        currency={product.currency}
        locale={locale}
        isAvailable={product.isAvailable && Boolean(product.shopifyVariantId)}
        isUpcoming={product.isUpcoming}
      />
    </>
  );
}
