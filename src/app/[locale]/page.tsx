import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getFeaturedProducts,
  getProductByCode,
  getProductsBySeries,
  products,
  seriesList,
  upcomingIps,
  collabLooks,
} from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";
import { Reveal } from "@/components/Reveal";
import { Marquee } from "@/components/Marquee";
import { ProductCard } from "@/components/product/ProductCard";
import { NewsletterForm } from "@/components/newsletter-form";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");

  const chapters = seriesList.map((s) => ({
    ...s,
    image: getProductsBySeries(s.slug)[0]?.images[0] ?? "/assets/products/p01.png",
    count: getProductsBySeries(s.slug).length,
  }));
  const origin = getProductByCode("PCOF1-F1");
  const looks = getFeaturedProducts(6).filter((p) => p.code !== origin?.code);

  return (
    <>
      {/* ============ 全屏 Hero（Ken Burns 入场，header 透明覆盖） ============ */}
      <section className="relative -mt-[var(--header-h)] flex min-h-screen items-end overflow-hidden bg-cream">
        <div className="ken-burns absolute inset-0 animate-ken-burns">
          <Image
            src="/assets/products/p01.png"
            alt="Offy"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/10" />
        <div className="grain absolute inset-0 opacity-[0.06]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 md:pb-28 lg:px-8">
          <p className="kicker kicker--on-dark">{t("eyebrow")}</p>
          <h1 className="mt-4 max-w-4xl font-display text-6xl font-semibold uppercase leading-[0.95] tracking-tight text-cream md:text-8xl lg:text-9xl">
            {t("heroTitle1")}
          </h1>
          <p className="mt-6 max-w-xl text-xl font-medium text-cream/90 md:text-2xl">
            {t("heroTitle2")}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/products"
              className="inline-flex h-14 items-center justify-center border border-cream px-8 text-sm font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-ink"
            >
              {t("shopCta")}
            </Link>
            <Link href="/about" className="text-sm uppercase tracking-[0.14em] text-cream/80 underline-offset-4 hover:underline">
              {t("aboutCta")}
            </Link>
          </div>
        </div>
      </section>

      <Marquee>
        <span className="mr-8 text-xs uppercase tracking-[0.18em]">
          {t("heroTitle2")} — {t("heroTitle2Sub")} — PLAYCORE — Offy —
        </span>
      </Marquee>

      {/* ============ Shop your category（截图3：6 列紧凑网格） ============ */}
      <section className="py-16 md:py-24">
        <Reveal className="mx-auto mb-8 max-w-7xl px-6 lg:px-8 md:mb-12">
          <p className="kicker mb-3">Shop your category</p>
          <h2 className="font-display text-4xl font-semibold uppercase tracking-tight md:text-6xl">
            {t("categoryTitle")}
          </h2>
          <p className="mt-3 text-ink-soft">{t("categorySub")}</p>
        </Reveal>
        <div className="grid grid-cols-2 gap-0.5 md:grid-cols-3 lg:grid-cols-6 lg:gap-1">
          {chapters.map((s, i) => (
            <Reveal key={s.slug} delay={Math.min(i, 5) * 70}>
              <Link
                href={`/collections/${s.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden bg-cream-deep"
              >
                <Image
                  src={s.image}
                  alt={locale === "zh" ? s.name.zh : s.name.en}
                  fill
                  sizes="(max-width:768px) 50vw, 16vw"
                  className="scale-[1.01] object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-center p-5">
                  <h3 className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-cream">
                    {locale === "zh" ? s.name.zh : s.name.en}
                  </h3>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ 核心产品：全宽大屏图（截图4） ============ */}
      {origin && (
        <section className="relative flex min-h-screen items-end overflow-hidden bg-ink">
          <div className="ken-burns absolute inset-0">
            <Image
              src={origin.images[0]}
              alt={locale === "zh" ? origin.name.zh : origin.name.en}
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
          <div className="grain absolute inset-0 opacity-[0.05]" />
          <Reveal className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-20 md:pb-28 lg:px-8">
            <p className="kicker kicker--on-dark mb-4">The Origin</p>
            <h2 className="max-w-3xl font-display text-5xl font-semibold uppercase leading-[0.95] tracking-tight text-cream md:text-8xl">
              {t("originTitle")}
            </h2>
            <p className="mt-5 max-w-xl text-lg text-cream/80 md:text-xl">{t("originSub")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href={`/products/${origin.code}`}
                className="inline-flex h-14 items-center justify-center border border-cream px-8 text-sm font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-ink"
              >
                {locale === "zh" ? "查看这款" : "Shop this look"}
              </Link>
              <span className="text-sm uppercase tracking-[0.14em] text-cream/70 tabular-nums">
                {formatUsdCents(origin.priceCents, locale)}
              </span>
            </div>
          </Reveal>
        </section>
      )}

      {/* ============ 特色造型 ============ */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28 lg:px-8">
        <Reveal className="mb-10 flex items-end justify-between">
          <div>
            <p className="kicker mb-3">{t("looksTitle")}</p>
            <h2 className="font-display text-3xl font-semibold uppercase tracking-tight md:text-5xl">
              {t("discoverTitle")}
            </h2>
            <p className="mt-3 text-ink-soft">{t("discoverSub")}</p>
          </div>
          <Link href="/products" className="link-line hidden text-sm sm:block">
            {t("castViewAll")}
          </Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
          {looks.map((p, i) => (
            <Reveal key={p.code} delay={Math.min(i, 5) * 60}>
              <ProductCard product={p} locale={locale} sizes="(max-width: 768px) 50vw, 33vw" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ 品牌宣言（大屏） ============ */}
      <section className="flex min-h-[80vh] items-center bg-ink py-24 text-cream md:py-32">
        <Reveal variant="clip" className="mx-auto max-w-4xl px-6 text-center">
          <p className="kicker kicker--on-dark mb-8">Our Manifesto</p>
          <p className="text-2xl leading-relaxed text-cream/85 md:text-3xl">{t("manifesto1")}</p>
          <p className="mt-6 text-2xl leading-relaxed text-cream/85 md:text-3xl">{t("manifesto2")}</p>
          <p className="mt-10 font-display text-3xl font-semibold text-butter md:text-4xl">「{t("manifesto3")}」</p>
          <p className="mt-10 text-sm uppercase tracking-[0.2em] text-cream/50">{t("manifestoSign")}</p>
        </Reveal>
      </section>

      {/* ============ 全员名册 ============ */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Reveal className="mb-10">
          <p className="kicker mb-3">Shop the look</p>
          <h2 className="font-display text-3xl font-semibold uppercase tracking-tight md:text-5xl">{t("castTitle")}</h2>
          <p className="mt-3 text-ink-soft">{t("castSub")}</p>
        </Reveal>
        <Reveal>
          <div className="flex flex-wrap gap-3">
            {products.map((p) => (
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

      {/* ============ 未来 IP ============ */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Reveal className="mb-10">
          <p className="kicker mb-3">Coming Next</p>
          <h2 className="font-display text-3xl font-semibold uppercase tracking-tight md:text-5xl">{t("comingTitle")}</h2>
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

      {/* ============ 联名定制 ============ */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
        <Reveal>
          <p className="kicker mb-3">Make Offy Yours</p>
          <h2 className="font-display text-3xl font-semibold uppercase tracking-tight md:text-4xl">{t("collabTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-soft">{t("collabSub")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {collabLooks.map((code) => (
              <span key={code} className="rounded-full border border-sand px-3 py-1 text-xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-accent hover:text-accent">{code}</span>
            ))}
          </div>
          <a href="mailto:hello@playcoretoys.com" className="link-line mt-8 inline-block text-sm">{t("collabCta")}</a>
        </Reveal>
      </section>

      {/* ============ 订阅 ============ */}
      <section className="bg-cream-deep py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:grid-cols-2 lg:px-8">
          <Reveal variant="left">
            <p className="kicker mb-3">Never Miss Her</p>
            <h2 className="font-display text-3xl font-semibold uppercase tracking-tight md:text-4xl">{t("subscribeTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("subscribeSub")}</p>
          </Reveal>
          <Reveal variant="right"><NewsletterForm /></Reveal>
        </div>
      </section>
    </>
  );
}
