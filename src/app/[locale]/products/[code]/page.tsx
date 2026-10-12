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
import { getProductHandleAlias } from "@/lib/catalog";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { formatPrice } from "@/lib/pricing";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
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
    alternates: { canonical: publicPath(locale, `/products/${product.code}`) },
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
  // 用 publicPath 而不是拼 `/${locale}`:英文站无前缀,直跳 `/products/x`,
  // 少一跳 next-intl 的前缀收敛。
  const alias = getProductHandleAlias(code);
  if (alias) permanentRedirect(publicPath(locale, `/products/${alias}`));
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
    locale === "zh" ? product.description.zh || product.description.en : product.description.en;
  // 结构化描述段落(descriptionHtml):加粗导语 + 正文,优先于整段 description 展示
  const descriptionBlocks =
    locale === "zh"
      ? (product.descriptionBlocks?.zh ?? product.descriptionBlocks?.en)
      : product.descriptionBlocks?.en;
  const siblings = (await getLiveProductsBySeries(product.series, country)).filter(
    (p) => p.code !== product.code,
  );

  return (
    <>
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
          <Link href={`/collections/${product.series}`} className="link-line tap-target--quiet">
            {series ? (locale === "zh" ? series.name.zh : series.name.en) : product.series}
          </Link>
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

          {/* 信息区:按"标题/价格" → "营销文案" → "规格信息(情绪标签/尺寸,
            用分隔线与上方文案区隔开)" → "行动按钮" 的节奏分组,
            整体用 space-y 统一纵向间距,不再逐个元素各自零散设置 mt-*。 */}
          <div className="min-w-0 space-y-8">
            <div>
              <p className="kicker mb-3">
                {series ? (locale === "zh" ? series.name.zh : series.name.en) : product.series}
              </p>
              <h1 className="font-display text-4xl font-semibold tracking-tight">
                {locale === "zh" ? product.name.zh : product.name.en}
              </h1>
              {product.isUpcoming ? (
                <p className="text-brown-600 mt-3 text-sm font-medium tracking-[var(--tracking-14)] uppercase">
                  {tHome("revealing")}
                </p>
              ) : (
                <p className="font-display text-ink mt-3 text-2xl font-medium tabular-nums md:text-3xl">
                  {formatPrice(product.priceCents, product.currency, locale)}
                </p>
              )}
            </div>

            {descriptionBlocks && descriptionBlocks.length > 0 ? (
              <div className="space-y-3">
                {descriptionBlocks.map((block, i) => (
                  <p
                    key={i}
                    className={`text-ink text-sm leading-relaxed ${block.bold ? "font-bold" : ""}`}
                  >
                    {block.text}
                  </p>
                ))}
              </div>
            ) : (
              description && (
                <div>
                  <p className="text-ink-soft mb-2 text-sm font-medium">{t("description")}</p>
                  <p className="text-ink text-sm leading-relaxed">{description}</p>
                </div>
              )
            )}

            {/* Mood tags 已下线:它取自本地表的 `SERIES_TAGS` 硬编码(按系列统一给
              "公主/优雅" 这类词),**从来没有从 Shopify 拉过** —— 实时路径里
              `emotionTags: local?.emotionTags ?? tags` 恒成立,Shopify 侧也没有
              对应字段。展示一个不是商家真实维护的标签会误导顾客,故整块移除。
              数据层保留 emotionTags 字段(其它地方仍可能引用),只是详情页不再渲染。 */}
            {product.dimensions && (
              <div className="border-cream-line space-y-6 border-t pt-8">
                {product.dimensions && (
                  <div>
                    <p className="text-ink-soft mb-2 text-sm font-medium">{t("dimensions")}</p>
                    <dl className="divide-cream-line border-cream-line divide-y border-y text-sm">
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
                          <dd className="text-ink font-medium tabular-nums">
                            {value}
                            {t("dimension.cm")}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}

            <div>
              {product.isUpcoming ? (
                <p className="bg-cream-deep text-ink-muted rounded-full px-6 py-3 text-center text-sm">
                  {t("upcomingNotice")}
                </p>
              ) : (
                // 窄屏由吸底购买条接手(`max-md:hidden`),避免同屏两个"加入购物袋"
                <AddToCartButton code={product.code} className="w-full max-md:hidden" />
              )}
            </div>
          </div>
        </div>

        {/* 相关 */}
        {siblings.length > 0 && (
          <section className="mt-10 md:mt-20">
            <Reveal className="mb-6">
              <p className="kicker mb-2">{t("moreKicker")}</p>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{t("related")}</h2>
            </Reveal>
            {/* 窄屏 3 列 → 2 列:3 列时每格只有 98.3px,商品名被砍到 14 个字符以内
              (方案 #16);sizes 也要跟着改,否则按 33vw 过采。 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-6">
              {siblings.slice(0, 6).map((sibling) => (
                <Link key={sibling.code} href={`/products/${sibling.code}`} className="group">
                  <div className="rounded-soft bg-paper relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={sibling.images[0]}
                      alt={sibling.name.en}
                      fill
                      sizes="(max-width:768px) 50vw, 16vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
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
        isAvailable={product.isAvailable}
        isUpcoming={product.isUpcoming}
      />
    </>
  );
}
