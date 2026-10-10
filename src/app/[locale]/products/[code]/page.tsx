import Image from "next/image";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLiveProductByCode, getLiveProductsBySeries, getLiveSeriesList } from "@/server/catalog/live";
import { getProductHandleAlias } from "@/lib/catalog";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { formatPrice } from "@/lib/pricing";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Reveal } from "@/components/Reveal";

// 近实时：每 60s 重新生成，从 Shopify 拉取最新图片/描述/价格/标题/库存。
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<import("next").Metadata> {
  const { locale, code } = await params;
  const country = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);
  const product = await getLiveProductByCode(code, country);
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
  // Shopify 改过 handle 的商品:旧 URL 发 308 到当前地址,而不是 404
  // (外链/收藏/搜索结果不该因为商家改了个 handle 就全断)。映射表见
  // lib/catalog/products.ts 的 productHandleAliases。
  const alias = getProductHandleAlias(code);
  if (alias) permanentRedirect(`/${locale}/products/${alias}`);
  // 实时拉取:标题/图片/价格/描述/库存/结算变体 ID 均为 Shopify 当前真实值,
  // 而非本地手写死的快照;Shopify 不可达时内部自动回退本地数据。
  // 价格按访客所在国家的市场币种返回(读 headers() → 本页按请求渲染)。
  const country = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);
  const product = await getLiveProductByCode(code, country);
  if (!product) notFound();

  const t = await getTranslations("product");
  const tHome = await getTranslations("home");
  const seriesList = await getLiveSeriesList();
  const series = seriesList.find((s) => s.slug === product.series);
  // Shopify 单语言:zh 描述暂缺时回退英文原文(后续 Translate & Adapt 接管)
  const description =
    locale === "zh"
      ? product.description.zh || product.description.en
      : product.description.en;
  // 结构化描述段落(descriptionHtml):加粗导语 + 正文,优先于整段 description 展示
  const descriptionBlocks =
    locale === "zh"
      ? (product.descriptionBlocks?.zh ?? product.descriptionBlocks?.en)
      : product.descriptionBlocks?.en;
  const siblings = (await getLiveProductsBySeries(product.series, country)).filter(
    (p) => p.code !== product.code,
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <nav className="mb-6 text-sm text-ink-muted">
        <Link href="/products" className="link-line">{t("shopBreadcrumb")}</Link>
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

        {/* 信息区:按"标题/价格" → "营销文案" → "规格信息(情绪标签/尺寸,
            用分隔线与上方文案区隔开)" → "行动按钮" 的节奏分组,
            整体用 space-y 统一纵向间距,不再逐个元素各自零散设置 mt-*。 */}
        <div className="space-y-8">
          <div>
            <p className="kicker mb-3">{series ? (locale === "zh" ? series.name.zh : series.name.en) : product.series}</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {locale === "zh" ? product.name.zh : product.name.en}
            </h1>
            {product.isUpcoming ? (
              <p className="mt-3 text-sm font-medium uppercase tracking-[var(--tracking-14)] text-brown-600">
                {tHome("revealing")}
              </p>
            ) : (
              <p className="mt-3 font-display text-2xl font-medium text-ink tabular-nums md:text-3xl">
                {formatPrice(product.priceCents, product.currency, locale)}
              </p>
            )}
          </div>

          {descriptionBlocks && descriptionBlocks.length > 0 ? (
            <div className="space-y-3">
              {descriptionBlocks.map((block, i) => (
                <p
                  key={i}
                  className={`text-sm leading-relaxed text-ink ${block.bold ? "font-bold" : ""}`}
                >
                  {block.text}
                </p>
              ))}
            </div>
          ) : (
            description && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink-soft">{t("description")}</p>
                <p className="text-sm leading-relaxed text-ink">{description}</p>
              </div>
            )
          )}

          {(product.emotionTags.zh.length > 0 || product.dimensions) && (
            <div className="space-y-6 border-t border-cream-line pt-8">
              {product.emotionTags.zh.length > 0 && (
                <div>
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
                <div>
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
            </div>
          )}

          <div>
            {product.isUpcoming ? (
              <p className="rounded-full bg-cream-deep px-6 py-3 text-center text-sm text-ink-muted">
                {t("upcomingNotice")}
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
            <p className="kicker mb-2">{t("moreKicker")}</p>
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
