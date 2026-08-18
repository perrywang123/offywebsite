import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getFeaturedProducts, seriesList } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductGrid";
import { NewsletterForm } from "@/components/newsletter-form";

const LOOKBOOK = ["/assets/ins/i02.jpg", "/assets/ins/i04.jpg", "/assets/ins/i06.jpg", "/assets/ins/i08.jpg", "/assets/ins/i10.jpg", "/assets/ins/i12.jpg", "/assets/ins/i14.jpg", "/assets/ins/i16.jpg"];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const featured = getFeaturedProducts(8);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24 lg:px-8">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cocoa-600">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
            {t("heroTitle1")}
            <br />
            <span className="text-pop-coral">{t("heroTitle2")}</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-700">{t("heroSub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex h-12 items-center justify-center rounded-full bg-ink-900 px-6 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
            >
              {t("shopCta")}
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center justify-center rounded-full border border-sand-200 bg-paper px-6 text-sm font-medium text-ink-900 hover:border-ink-900"
            >
              {t("aboutCta")}
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-cream-100">
          <Image src="/assets/ins/i01.jpg" alt="Offy" fill priority className="object-cover" />
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-black md:text-4xl">{t("featuredTitle")}</h2>
            <p className="mt-2 text-ink-500">{t("featuredSub")}</p>
          </div>
          <Link href="/products" className="hidden text-sm font-medium text-ink-900 underline sm:block">
            {t("shopCta")} →
          </Link>
        </div>
        <ProductGrid products={featured} locale={locale} />
      </section>

      {/* Series */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <h2 className="mb-8 font-display text-3xl font-black md:text-4xl">{t("seriesTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {seriesList.slice(0, 5).map((s, i) => {
            const tiles = [
              { bg: "bg-cream-100", text: "text-ink-900" },
              { bg: "bg-sand-200", text: "text-ink-900" },
              { bg: "bg-cocoa-600", text: "text-paper" },
              { bg: "bg-ink-900", text: "text-paper" },
              { bg: "bg-pop-yellow", text: "text-ink-900" },
            ][i % 5];
            return (
              <Link
                key={s.slug}
                href={`/collections/${s.slug}`}
                className={`flex aspect-[3/4] flex-col justify-between rounded-2xl p-5 transition-transform hover:-translate-y-1 ${tiles.bg}`}
              >
                <span className={`text-xs font-semibold uppercase tracking-wider ${tiles.text} opacity-60`}>
                  0{i + 1}
                </span>
                <span className={`font-display text-xl font-black ${tiles.text}`}>
                  {locale === "zh" ? s.name.zh : s.name.en}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Story */}
      <section className="bg-ink-900 py-20 text-cream-50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-3xl font-black leading-tight md:text-5xl">{t("storyTitle")}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-cream-50/80">{t("storyBody")}</p>
          <p className="mt-8 font-display text-xl text-pop-yellow">「{t("storyQuote")}」</p>
        </div>
      </section>

      {/* Lookbook */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <h2 className="mb-2 font-display text-3xl font-black md:text-4xl">{t("lookbookTitle")}</h2>
        <p className="mb-8 text-ink-500">{t("lookbookSub")}</p>
        <div className="columns-2 gap-4 md:columns-3">
          {LOOKBOOK.map((src) => (
            <div key={src} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl">
              <Image src={src} alt="Offy lookbook" width={850} height={1063} className="h-auto w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="rounded-3xl bg-cream-100 p-12 text-center">
          <h2 className="font-display text-2xl font-black md:text-3xl">{t("newsletterTitle")}</h2>
          <p className="mt-2 text-ink-500">{t("newsletterSub")}</p>
          <div className="mt-8 flex justify-center">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
