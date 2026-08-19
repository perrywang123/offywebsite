import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProducts, getProductsBySeries, products, seriesList, upcomingIps, collabLooks } from "@/lib/catalog";
import { Reveal } from "@/components/Reveal";
import { Marquee } from "@/components/Marquee";
import { ProductGrid } from "@/components/product/ProductGrid";
import { NewsletterForm } from "@/components/newsletter-form";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");

  const latest = getProducts().filter((p) => p.isAvailable).slice(0, 8);
  const chapters = seriesList.map((s) => ({
    ...s,
    image: getProductsBySeries(s.slug)[0]?.images[0] ?? "/assets/products/p01.png",
  }));

  return (
    <>
      {/* 全屏大图 Hero：宣传图 + 公司名（对齐 dogguo 首屏） */}
      <section className="relative flex min-h-[88vh] items-end overflow-hidden bg-cream">
        <Image
          src="/assets/products/p01.png"
          alt="Offy"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <div className="absolute inset-0 bg-brown-600/10" />
        <div className="grain absolute inset-0 opacity-[0.06]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 md:pb-24 lg:px-8">
          <p className="kicker kicker--on-dark">{t("eyebrow")}</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-[1.02] tracking-tight text-cream md:text-8xl">
            {t("heroTitle1")}
          </h1>
          <p className="mt-5 max-w-xl text-xl font-medium text-cream/90 md:text-2xl">{t("heroTitle2")}</p>
          <p className="mt-2 text-sm text-cream/60">{t("heroTitle2Sub")}</p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link
              href="/products"
              className="inline-flex h-13 items-center justify-center rounded-full bg-cream px-7 text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              {t("shopCta")}
            </Link>
            <Link href="/about" className="link-line text-sm text-cream">
              {t("aboutCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* 标语跑马灯 */}
      <Marquee>
        <span className="mr-8 text-xs uppercase tracking-[0.18em]">
          {t("heroTitle2")} — {t("heroTitle2Sub")} — PLAYCORE — Offy —
        </span>
      </Marquee>

      {/* Discover the latest —— 商品流 */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Reveal className="mb-10 flex items-end justify-between">
          <div>
            <p className="kicker mb-3">Discover the latest</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{t("discoverTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("discoverSub")}</p>
          </div>
          <Link href="/products" className="link-line hidden text-sm sm:block">
            {t("castViewAll")}
          </Link>
        </Reveal>
        <ProductGrid products={latest} locale={locale} />
      </section>

      {/* Shop your category —— 分类 tile */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <Reveal className="mb-10">
          <p className="kicker mb-3">Shop your category</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{t("categoryTitle")}</h2>
          <p className="mt-3 text-ink-soft">{t("categorySub")}</p>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {chapters.map((s, i) => (
            <Reveal key={s.slug} delay={Math.min(i, 5) * 60}>
              <Link href={`/collections/${s.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-paper">
                <Image
                  src={s.image}
                  alt={locale === "zh" ? s.name.zh : s.name.en}
                  fill
                  sizes="(max-width:768px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
                <div className="absolute inset-x-4 bottom-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/80">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-cream">
                    {locale === "zh" ? s.name.zh : s.name.en}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 品牌宣言 */}
      <section className="bg-ink py-24 text-cream md:py-32">
        <Reveal className="mx-auto max-w-4xl px-6 text-center">
          <p className="kicker kicker--on-dark mb-8">Our Manifesto</p>
          <p className="text-xl leading-relaxed text-cream/80 md:text-2xl">{t("manifesto1")}</p>
          <p className="mt-6 text-xl leading-relaxed text-cream/80 md:text-2xl">{t("manifesto2")}</p>
          <p className="mt-8 font-display text-2xl font-semibold text-butter md:text-3xl">「{t("manifesto3")}」</p>
          <p className="mt-10 text-sm uppercase tracking-[0.2em] text-cream/50">{t("manifestoSign")}</p>
        </Reveal>
      </section>

      {/* Shop the look —— 全员名册 */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Reveal className="mb-10 flex items-end justify-between">
          <div>
            <p className="kicker mb-3">Shop the look</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{t("castTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("castSub")}</p>
          </div>
          <Link href="/products" className="link-line hidden text-sm sm:block">
            {t("castViewAll")}
          </Link>
        </Reveal>

        <Reveal>
          <p className="kicker mb-5">{t("castIndex")}</p>
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
                  <Image src={p.images[0]} alt={p.name.en} fill sizes="64px" className="object-cover" />
                )}
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 未来 IP */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Reveal className="mb-10">
          <p className="kicker mb-3">Coming Next</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{t("comingTitle")}</h2>
          <p className="mt-3 text-ink-soft">{t("comingSub")}</p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {upcomingIps.map((ip) => (
            <Reveal key={ip.code}>
              <div className="media-placeholder aspect-[4/3] rounded-block" data-label="COMING SOON — TBD">
                <div className="relative z-10 p-8 text-center">
                  <p className="rounded-full bg-ink/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream">
                    {locale === "zh" ? "即将登场" : "Coming Soon"}
                  </p>
                  <p className="mt-4 font-display text-2xl font-semibold text-ink">{locale === "zh" ? ip.name.zh : ip.name.en}</p>
                  <p className="mt-2 text-sm text-ink-soft">{locale === "zh" ? ip.tagline.zh : ip.tagline.en}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 联名定制 */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
        <Reveal>
          <p className="kicker mb-3">Make Offy Yours</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("collabTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-soft">{t("collabSub")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {collabLooks.map((code) => (
              <span key={code} className="rounded-full border border-sand px-3 py-1 text-xs uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-accent hover:text-accent">
                {code}
              </span>
            ))}
          </div>
          <a href="mailto:hello@playcoretoys.com" className="link-line mt-8 inline-block text-sm">
            {t("collabCta")}
          </a>
        </Reveal>
      </section>

      {/* 订阅 */}
      <section className="bg-cream-deep py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:grid-cols-2 lg:px-8">
          <Reveal>
            <p className="kicker mb-3">Never Miss Her</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("subscribeTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("subscribeSub")}</p>
          </Reveal>
          <Reveal>
            <NewsletterForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
