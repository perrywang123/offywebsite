import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductByCode, getProductsBySeries, getSeries } from "@/lib/catalog";
import { enrichProduct, enrichProducts } from "@/server/catalog/enrich";
import { formatUsdCents } from "@/lib/pricing";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Reveal } from "@/components/Reveal";

// 近实时：每 60s 重新生成，从 Shopify 拉取最新图片/描述/价格/标题。
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<import("next").Metadata> {
  const { locale, code } = await params;
  const product = getProductByCode(code);
  if (!product) return {};
  const name = locale === "zh" ? product.name.zh : product.name.en;
  return {
    title: name,
    description: product.description.en || name,
    alternates: { canonical: `/${locale}/products/${product.code}` },
    openGraph: {
      title: name,
      description: product.description.en || name,
      images: [{ url: product.images[0], alt: name }],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const rawProduct = getProductByCode(code);
  if (!rawProduct) notFound();

  const t = await getTranslations("product");
  const series = getSeries(rawProduct.series);
  const product = await enrichProduct(rawProduct);
  // Shopify 单语言:zh 描述暂缺时回退英文原文(后续 Translate & Adapt 接管)
  const description =
    locale === "zh"
      ? product.description.zh || product.description.en
      : product.description.en;
  const siblings = await enrichProducts(
    getProductsBySeries(rawProduct.series).filter((p) => p.code !== rawProduct.code),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <nav className="mb-6 text-sm text-ink-muted">
        <Link href="/products" className="link-line">{locale === "zh" ? "商店" : "Shop"}</Link>
        {" / "}
        <Link href={`/collections/${product.series}`} className="link-line">
          {series ? (locale === "zh" ? series.name.zh : series.name.en) : product.series}
        </Link>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[6fr_5fr]">
        {/* 图区 */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-card bg-paper p-2 shadow-soft">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[calc(var(--radius-card)-8px)] bg-cream-deep">
              <Image
                src={product.images[0]}
                alt={locale === "zh" ? product.name.zh : product.name.en}
                fill
                priority
                sizes="(max-width:1024px) 100vw, 55vw"
                className="object-contain"
              />
            </div>
          </div>

          {/* 形象选择器（3:4 小卡） */}
          {siblings.length > 0 && (
            <div className="mt-4 flex gap-2.5 overflow-x-auto pb-2">
              {siblings.slice(0, 6).map((sibling) => (
                <Link
                  key={sibling.code}
                  href={`/products/${sibling.code}`}
                  title={locale === "zh" ? sibling.name.zh : sibling.name.en}
                  className="relative h-20 w-14 shrink-0 overflow-hidden rounded-soft border border-sand transition-colors hover:border-brown-500"
                >
                  <Image src={sibling.images[0]} alt={sibling.name.en} fill sizes="56px" className="object-cover" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 信息区 */}
        <div>
          <p className="kicker mb-3">{series ? (locale === "zh" ? series.name.zh : series.name.en) : product.series}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {locale === "zh" ? product.name.zh : product.name.en}
          </h1>
          {product.isUpcoming ? (
            <p className="mt-3 text-sm font-medium uppercase tracking-[0.14em] text-brown-600">
              {locale === "zh" ? "待揭晓" : "Revealing soon"}
            </p>
          ) : (
            <p className="mt-3 font-display text-2xl font-medium text-ink tabular-nums md:text-3xl">
              {formatUsdCents(product.priceCents, locale)}
            </p>
          )}

          <p className="mt-3 text-xs text-ink-muted">{t("sku")}: {product.code}</p>

          {description && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-ink-soft">{t("description")}</p>
              <p className="text-sm leading-relaxed text-ink">{description}</p>
            </div>
          )}

          {product.emotionTags.zh.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-ink-soft">{t("emotion")}</p>
              <div className="flex flex-wrap gap-2">
                {(locale === "zh" ? product.emotionTags.zh : product.emotionTags.en).map((tag) => (
                  <span key={tag} className="rounded-full border border-sand px-3 py-1 text-xs text-ink-soft">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.dimensions && (
            <div className="mt-8">
              <p className="mb-2 text-sm font-medium text-ink-soft">{t("dimensions")}</p>
              <dl className="divide-y divide-cream-line border-y border-cream-line text-sm">
                {(
                  [
                    ["dimension.height", product.dimensions.heightCm],
                    ["dimension.length", product.dimensions.lengthCm],
                    ["dimension.head", product.dimensions.headCm],
                    ["dimension.arm", product.dimensions.armCm],
                    ["dimension.leg", product.dimensions.legCm],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-3">
                    <dt className="text-ink-muted">{t(key)}</dt>
                    <dd className="font-medium text-ink tabular-nums">{value}{t("dimension.cm")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-8">
            {product.isUpcoming ? (
              <p className="rounded-full bg-cream-deep px-6 py-3 text-center text-sm text-ink-muted">
                {locale === "zh" ? "即将揭晓，敬请期待" : "Revealing soon"}
              </p>
            ) : (
              <AddToCartButton code={product.code} className="w-full" />
            )}
          </div>
        </div>
      </div>

      {/* 相关 */}
      {siblings.length > 0 && (
        <section className="mt-20">
          <Reveal className="mb-6">
            <p className="kicker mb-2">More</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{t("related")}</h2>
          </Reveal>
          <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
            {siblings.slice(0, 6).map((sibling) => (
              <Link key={sibling.code} href={`/products/${sibling.code}`} className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-soft bg-paper">
                  <Image src={sibling.images[0]} alt={sibling.name.en} fill sizes="(max-width:768px) 33vw, 16vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <p className="mt-2 truncate text-xs text-ink-soft">{locale === "zh" ? sibling.name.zh : sibling.name.en}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
