import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { upcomingIps, collabLooks } from "@/lib/catalog";
import { Reveal } from "@/components/Reveal";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("about");

  return (
    <div>
      {/* 页首：公司名 + slogan */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-8">
        <Reveal>
          <p className="kicker mb-5">{t("storyKicker")}</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            {t("title")}
          </h1>
        </Reveal>
      </section>

      {/* 起源 */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 lg:px-8">
        <Reveal variant="left">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm" data-slot="story-image">
            <div className="absolute inset-0 overflow-hidden rounded-card bg-paper shadow-card">
              <Image src="/assets/news/news-01.jpg" alt="is.offy" fill sizes="(max-width:768px) 90vw, 40vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-2/5 overflow-hidden rounded-soft bg-paper shadow-card">
              <div className="relative aspect-[3/4]">
                <Image src="/assets/news/news-05.jpg" alt="is.offy" fill sizes="20vw" className="object-cover" />
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal variant="right">
          <h2 className="mb-6 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("storyHeading")}</h2>
          <p className="lede mb-4">{t("storyP1")}</p>
          <p className="lede mb-4">{t("storyP2")}</p>
          <p className="text-lg font-medium text-brown-600">{t("storyP3")}</p>
        </Reveal>
      </section>

      {/* 团队 */}
      <section className="bg-ink py-20 text-cream">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal>
            <p className="kicker kicker--on-dark mb-8">{t("teamKicker")}</p>
          </Reveal>
          <div className="grid gap-8 md:grid-cols-2">
            {[
              { name: "JIE", role: t("teamJie") },
              { name: "桃子", role: t("teamTaozi") },
            ].map((m) => (
              <Reveal key={m.name}>
                <div className="border-t border-cream/20 pt-6">
                  <p className="font-display text-3xl font-semibold text-butter">{m.name}</p>
                  <p className="mt-2 text-sm text-cream/70">{m.role}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 零售网络 */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Reveal className="mb-8">
          <p className="kicker mb-3">{t("retailKicker")}</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("retailHeading")}</h2>
        </Reveal>
        <ul className="divide-y divide-cream-line border-y border-cream-line">
          {[
            ["Shanghai", t("retail1")],
            ["Hangzhou", t("retail2")],
            ["Bangkok", t("retail3")],
          ].map(([city, addr]) => (
            <Reveal key={addr}>
              <li className="flex items-baseline justify-between gap-6 py-5">
                <span className="text-xs font-semibold uppercase tracking-[var(--tracking-18)] text-brown-600">{city}</span>
                <span className="text-ink-soft">{addr}</span>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* 未来 IP */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <Reveal className="mb-8">
          <p className="kicker mb-3">{t("futureKicker")}</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("futureHeading")}</h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {upcomingIps.map((ip) => (
            <Reveal key={ip.code}>
              <div className="media-placeholder aspect-[4/3] rounded-block" data-label={t("comingSoonLabel")}>
                <div className="relative z-10 p-8 text-center">
                  <p className="font-display text-2xl font-semibold text-ink">{locale === "zh" ? ip.name.zh : ip.name.en}</p>
                  <p className="mt-2 text-sm text-ink-soft">{locale === "zh" ? ip.tagline.zh : ip.tagline.en}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 定制 CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center lg:px-8">
        <Reveal>
          <p className="kicker mb-3">{t("customKicker")}</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{t("customHeading")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-soft">{t("customBody")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {collabLooks.map((code) => (
              <span key={code} className="rounded-full border border-sand px-3 py-1 text-xs uppercase tracking-[var(--tracking-12)] text-ink-soft">
                {code}
              </span>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
