import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getFeaturedProducts,
  products,
  teaserSeries,
  upcomingIps,
  collabLooks,
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

      {/* ============ OFFY 新品抢先看(设计稿:整幅背景图 + 左文字叠加 + 黑色 pill) ============ */}
      <section className="py-20 md:py-28">
        <Reveal className="container-site mx-auto mb-14 text-center">
          <p className="kicker mb-3">{t("teaserTitle")}</p>
          <h2 className="font-display text-[clamp(30px,2.6vw,60px)] font-semibold tracking-tight">
            {t("teaserSub")}
          </h2>
        </Reveal>
        <Reveal className="relative overflow-hidden">
          <div className="relative aspect-[4/3] md:aspect-[16/8.5]">
            <Image
              src={teaserSeries.heroImage}
              alt={locale === "zh" ? teaserSeries.name.zh : teaserSeries.name.en}
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-cream/80 via-cream/30 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="container-site">
              <div className="max-w-lg">
                <p className="kicker mb-3">{t("teaserKicker")}</p>
                <p className="text-lg text-ink-soft">{t("comingSub")}</p>
                <h3 className="mt-6 font-display text-[clamp(30px,2.6vw,60px)] font-extrabold tracking-tight">
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

      {/* ============ 联名定制(让 OFFY 成为你的) ============ */}
      <section className="container-site py-20">
        <Reveal className="relative aspect-[2/1] overflow-hidden rounded-block">
          <Image
            src="/assets/collab/collab-ip.jpg"
            alt={t("collabTitle")}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-center md:p-10">
            <p className="kicker kicker--on-dark mb-3">Make Offy Yours</p>
            <h2 className="font-display text-3xl font-semibold uppercase tracking-tight text-cream md:text-4xl">{t("collabTitle")}</h2>
          </div>
        </Reveal>
        <Reveal className="mx-auto mt-10 max-w-4xl text-center">
          <p className="text-ink-soft">{t("collabSub")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {collabLooks.map((code) => (
              <span key={code} className="rounded-full border border-sand px-3 py-1 text-xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-accent hover:text-accent">{code}</span>
            ))}
          </div>
          <a href="mailto:hello@playcoretoys.com" className="link-line mt-8 inline-block text-sm">{t("collabCta")}</a>
        </Reveal>
      </section>

      {/* ============ 后续新的 IP ============ */}
      <section className="container-site py-20">
        <Reveal className="mb-10">
          <p className="kicker mb-3">Coming Next</p>
          <h2 className="font-display text-[clamp(26px,2.2vw,48px)] font-semibold uppercase tracking-tight">{t("comingTitle")}</h2>
          <p className="mt-3 text-ink-soft">{t("comingSub")}</p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {upcomingIps.map((ip, i) => (
            <Reveal key={ip.code} variant={i % 2 === 0 ? "left" : "right"}>
              <div className="media-placeholder aspect-[16/9] rounded-block" data-label="COMING SOON — TBD">
                <div className="relative z-10 p-8 text-center">
                  <p className="rounded-full bg-ink/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream">{locale === "zh" ? "即将登场" : "Coming Soon"}</p>
                  <p className="mt-4 font-display text-2xl font-semibold text-ink">{locale === "zh" ? ip.name.zh : ip.name.en}</p>
                  <p className="mt-2 text-sm text-ink-soft">{locale === "zh" ? ip.tagline.zh : ip.tagline.en}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ 订阅(永远不会错过她) ============ */}
      <section className="bg-cream-deep py-20">
        <div className="container-site grid items-center gap-10 md:grid-cols-2">
          <Reveal variant="left">
            <p className="kicker mb-3">Never Miss Her</p>
            <h2 className="font-display text-[clamp(24px,2vw,40px)] font-semibold uppercase tracking-tight">{t("subscribeTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("subscribeSub")}</p>
          </Reveal>
          <Reveal variant="right"><NewsletterForm /></Reveal>
        </div>
      </section>
    </>
  );
}
