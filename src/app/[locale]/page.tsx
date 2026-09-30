import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getFeaturedProducts,
  products,
  teaserSeries,
} from "@/lib/catalog";
import { heroSlides, newsFeature, newsItems } from "@/lib/content";
import { enrichProducts } from "@/server/catalog/enrich";
import { Reveal } from "@/components/Reveal";

export const revalidate = 60;
import { Marquee } from "@/components/Marquee";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { NewsGrid } from "@/components/home/NewsGrid";
import { ProductCard } from "@/components/product/ProductCard";
import { NewsletterForm } from "@/components/newsletter-form";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  const looks = await enrichProducts(getFeaturedProducts(6));
  const roster = await enrichProducts(products);
  const regionals = roster.filter((p) => p.badge);

  return (
    <>
      {/* ============ 头图轮播(图片驱动:宽撑满,高=宽/1.789 等比,文字随图) ============ */}
      <section className="relative overflow-hidden">
        <HeroCarousel slides={heroSlides} locale={locale} />
      </section>

      {/* ============ 促销条:任意购买三个公仔以上,送 offy 包包 ============ */}
      <Marquee>
        <span className="mr-8 text-xs uppercase tracking-[0.18em]">
          {tCommon("promo")} — is.offy —
        </span>
      </Marquee>

      {/* ============ 最新资讯 · 揭晓 ============ */}
      <section className="container-site py-20 md:py-28">
        <Reveal className="mb-10">
          <p className="kicker mb-3">News</p>
          <h2 className="font-display text-[clamp(30px,2.6vw,60px)] font-semibold uppercase tracking-tight">
            {t("newsTitle")}
          </h2>
          <p className="mt-3 text-ink-soft">{t("newsSub")}</p>
        </Reveal>
        <NewsGrid
          feature={newsFeature}
          items={newsItems}
          texts={{
            badge: t("newsBadge"),
            featureTitle: t("newsFeatureTitle"),
            cta: t("teaserCta"),
            browseAll: t("browseAll"),
          }}
          locale={locale}
        />
      </section>

      {/* ============ 按类别选购 + 最新曝光造型(设计稿:同一模块) ============ */}
      <section className="container-site py-20 md:py-28">
        <Reveal className="mb-12 text-center">
          <p className="kicker mb-3">{t("categorySub")}</p>
          <h2 className="font-display text-[clamp(30px,2.6vw,60px)] font-semibold uppercase tracking-tight">
            {t("categoryTitle")}
          </h2>
          <p className="mt-3 text-ink-soft">{t("castSub")}</p>
        </Reveal>
        <Reveal className="mb-8 flex items-end justify-between">
          <h3 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {t("discoverTitle")}
          </h3>
          <Link href="/products" className="link-line text-sm">
            {t("castViewAll")}
          </Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
          {looks.map((p, i) => (
            <Reveal key={p.code} delay={Math.min(i, 5) * 60}>
              <ProductCard product={p} locale={locale} caption="code" sizes="(max-width: 768px) 50vw, 33vw" />
            </Reveal>
          ))}
        </div>

        {/* ============ 区域限定(设计稿:3 卡,红底 US/UK ONLY 徽章) ============ */}
        <p className="mt-16 text-sm text-ink-soft">{t("regionalTitle")}</p>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
          {regionals.map((p) => (
            <Reveal key={p.code}>
              <ProductCard product={p} locale={locale} caption="code" sizes="(max-width: 768px) 50vw, 33vw" />
            </Reveal>
          ))}
        </div>

        {/* ============ 产品汇总-选购同款造型(圆形名册,紧接本模块) ============ */}
        <p className="mt-16 text-sm text-ink-soft">{t("rosterTitle")}</p>
        <Reveal className="mt-6">
          <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 lg:grid-cols-12">
            {roster.map((p) => (
              <Link
                key={p.code}
                href={`/products/${p.code}`}
                title={locale === "zh" ? p.name.zh : p.name.en}
                className="group relative h-16 w-16 overflow-hidden rounded-full border border-sand bg-cream-deep transition-colors hover:border-brown-600"
              >
                {p.isUpcoming ? (
                  <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-ink-muted">?</span>
                ) : (
                  <Image src={p.images[0]} alt={p.name.en} fill sizes="64px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ OFFY 新品抢先看(PSD:Stay tuned 标题区 + 玩偶图左上文字块) ============ */}
      <section className="py-20 md:py-28">
        {/* 标题区(PSD:Stay tuned. 大字 + offy新品抢先看 + 更多新品，敬请期待) */}
        <Reveal className="container-site mx-auto mb-14 text-center">
          <p className="font-display text-[clamp(40px,5vw,96px)] font-extrabold uppercase tracking-tight">
            Stay tuned.
          </p>
          <p className="kicker mt-4">{t("teaserTitle")}</p>
          <h2 className="mt-2 font-display text-[clamp(24px,2.2vw,44px)] font-semibold tracking-tight">
            {t("teaserSub")}
          </h2>
        </Reveal>
        {/* 玩偶图 + 左上文字块(PSD:文字在图左上 8-42%,不是垂直居中) */}
        <Reveal className="relative overflow-hidden">
          <div className="relative aspect-[4/3] md:aspect-[3/2]">
            <Image
              src="/assets/home/teaser-doll.png"
              alt={locale === "zh" ? teaserSeries.name.zh : teaserSeries.name.en}
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/35 to-transparent" />
          <div className="absolute inset-0 flex items-start">
            <div className="container-site">
              <div className="max-w-lg pt-[8%]">
                <p className="kicker mb-3">{t("teaserKicker")}</p>
                <p className="text-lg text-ink-soft">{t("comingSub")}</p>
                <h3 className="mt-6 font-display text-[clamp(28px,2.6vw,60px)] font-extrabold tracking-tight">
                  /{locale === "zh" ? teaserSeries.name.zh : teaserSeries.name.en}
                </h3>
                <p className="mt-4 text-sm text-ink-muted">
                  {locale === "zh" ? teaserSeries.note.zh : teaserSeries.note.en}
                </p>
                <Link
                  href="/bag-charm"
                  className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-ink px-8 text-sm font-medium text-cream transition-colors duration-300 hover:bg-accent"
                >
                  {t("teaserCta")}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ 联名定制(PSD:主标题 + 14 OF 头像图 + CTA) ============ */}
      <section className="container-site py-20">
        {/* 主标题(头像图上方居中,不叠加压图) */}
        <Reveal className="pb-10 text-center">
          <h2 className="font-display text-[clamp(26px,2.4vw,48px)] font-semibold uppercase tracking-tight">{t("collabTitle")}</h2>
          <a href="mailto:hello@playcoretoys.com" className="link-line mt-4 inline-block text-sm">{t("collabCta")}</a>
        </Reveal>
        {/* 14 OF 造型头像图(PSD 矢量智能对象,透明底) */}
        <Reveal className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/home/collab-ips.png" alt={t("collabTitle")} className="w-full" />
        </Reveal>
      </section>

      {/* ============ 订阅(永远不会错过她)——移至联名下方 ============ */}
      <section className="bg-cream-deep py-20">
        <div className="container-site grid items-center gap-10 md:grid-cols-2">
          <Reveal variant="up">
            <p className="kicker mb-3">Never Miss Her</p>
            <h2 className="font-display text-[clamp(24px,2vw,40px)] font-semibold uppercase tracking-tight">{t("subscribeTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("subscribeSub")}</p>
          </Reveal>
          <Reveal variant="up"><NewsletterForm /></Reveal>
        </div>
      </section>

      {/* ============ 后续新的 IP(PSD:标题 + 图层11 双卡;移动端上下排布,桌面左右并排) ============ */}
      <section className="container-site py-20">
        <Reveal className="mb-10">
          <p className="kicker mb-3">Coming Next</p>
          <h2 className="font-display text-[clamp(26px,2.2vw,48px)] font-semibold uppercase tracking-tight">{t("comingTitle")}</h2>
          <p className="mt-3 text-ink-soft">{t("comingSub")}</p>
        </Reveal>
        {/* PSD 图层11 裁双卡:凯蒂小姐 + 普赛克(图内自带即将推出/COMING SOON-TBD);
            移动端 grid-cols-1 上下排布,桌面 md:grid-cols-2 左右并排 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Reveal className="relative overflow-hidden rounded-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/home/upcoming-kitty.png"
              alt={locale === "zh" ? "凯蒂小姐 即将推出" : "Miss Kitty, coming soon"}
              className="w-full"
            />
          </Reveal>
          <Reveal className="relative overflow-hidden rounded-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/home/upcoming-psyche.png"
              alt={locale === "zh" ? "普赛克 即将推出" : "Psyche, coming soon"}
              className="w-full"
            />
          </Reveal>
        </div>
      </section>
    </>
  );
}
