import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductByCode, getProductsBySeries, getSeries } from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const product = getProductByCode(code);
  if (!product) notFound();

  const t = await getTranslations("product");
  const series = getSeries(product.series);
  const siblings = getProductsBySeries(product.series).filter((p) => p.code !== product.code);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <nav className="mb-6 text-sm text-ink-500">
        <Link href="/products" className="hover:text-ink-900">
          {locale === "zh" ? "商店" : "Shop"}
        </Link>
        {" / "}
        <Link href={`/collections/${product.series}`} className="hover:text-ink-900">
          {series ? (locale === "zh" ? series.name.zh : series.name.en) : product.series}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[7fr_5fr]">
        {/* Image */}
        <div className="overflow-hidden rounded-2xl bg-paper">
          <div className="relative aspect-[3/4]">
            <Image
              src={product.images[0]}
              alt={locale === "zh" ? product.name.zh : product.name.en}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* Info */}
        <div>
          <span className="rounded-full bg-pop-yellow px-3 py-1 text-xs font-semibold text-ink-900">
            {series ? (locale === "zh" ? series.name.zh : series.name.en) : product.series}
          </span>
          <h1 className="mt-4 font-display text-3xl font-black md:text-4xl">
            {locale === "zh" ? product.name.zh : product.name.en}
          </h1>
          <p className="mt-3 font-display text-2xl font-bold text-ink-900 tabular-nums">
            {formatUsdCents(product.priceCents, locale)}
          </p>

          <p className="mt-4 text-sm text-ink-500">
            {t("sku")}: {product.code}
          </p>

          {product.emotionTags.zh.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-ink-700">{t("emotion")}</p>
              <div className="flex flex-wrap gap-2">
                {(locale === "zh" ? product.emotionTags.zh : product.emotionTags.en).map((tag) => (
                  <span key={tag} className="rounded-full bg-cream-100 px-3 py-1 text-xs text-ink-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.dimensions && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-ink-700">{t("dimensions")}</p>
              <ul className="grid grid-cols-5 gap-2 text-center text-xs text-ink-700">
                {(
                  [
                    ["dimension.height", product.dimensions.heightCm],
                    ["dimension.length", product.dimensions.lengthCm],
                    ["dimension.head", product.dimensions.headCm],
                    ["dimension.arm", product.dimensions.armCm],
                    ["dimension.leg", product.dimensions.legCm],
                  ] as const
                ).map(([key, value]) => (
                  <li key={key} className="rounded-lg bg-cream-100 px-2 py-3">
                    <span className="block font-semibold">{t(key)}</span>
                    <span className="block">{value}{t("dimension.cm")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <AddToCartButton code={product.code} accent className="w-full" />
          </div>

          {/* 形象选择器（同系列其它形象） */}
          {siblings.length > 0 && (
            <div className="mt-10">
              <p className="mb-3 text-sm font-semibold text-ink-700">{t("related")}</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {siblings.slice(0, 8).map((sibling) => (
                  <Link
                    key={sibling.code}
                    href={`/products/${sibling.code}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-sand-200 hover:border-ink-900"
                    title={locale === "zh" ? sibling.name.zh : sibling.name.en}
                  >
                    <Image
                      src={sibling.images[0]}
                      alt={sibling.name.en}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
