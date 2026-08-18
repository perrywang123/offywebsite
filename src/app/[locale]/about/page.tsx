import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { upcomingIps } from "@/lib/catalog";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("about");

  return (
    <div>
      <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-8">
        <h1 className="mx-auto max-w-4xl font-display text-5xl font-black leading-tight md:text-7xl">
          {t("title")}
        </h1>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2 lg:px-8">
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
          <Image src="/assets/ins/i03.jpg" alt="Offy" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
        </div>
        <div>
          <h2 className="mb-6 font-display text-3xl font-black md:text-4xl">{t("storyHeading")}</h2>
          <p className="mb-4 text-lg text-ink-700">{t("storyP1")}</p>
          <p className="mb-4 text-lg text-ink-700">{t("storyP2")}</p>
          <p className="text-lg font-medium text-cocoa-600">{t("storyP3")}</p>
        </div>
      </section>

      <section className="bg-ink-900 py-16 text-cream-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="mb-8 font-display text-3xl font-black">{t("teamHeading")}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-cream-50/10 p-8">
              <p className="font-display text-2xl font-black text-pop-yellow">JIE</p>
              <p className="mt-2 text-cream-50/80">{t("teamJie")}</p>
            </div>
            <div className="rounded-2xl bg-cream-50/10 p-8">
              <p className="font-display text-2xl font-black text-pop-yellow">桃子</p>
              <p className="mt-2 text-cream-50/80">{t("teamTaozi")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <h2 className="mb-8 font-display text-3xl font-black">{t("retailHeading")}</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {[t("retail1"), t("retail2"), t("retail3")].map((item) => (
            <li key={item} className="rounded-2xl bg-paper p-8 text-center font-medium text-ink-700">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <h2 className="mb-2 font-display text-3xl font-black">{t("futureHeading")}</h2>
        <p className="mb-8 text-ink-500">{t("futureSub")}</p>
        <div className="grid gap-6 md:grid-cols-2">
          {upcomingIps.map((ip) => (
            <div key={ip.code} className="rounded-2xl bg-cream-100 p-8">
              <p className="font-display text-2xl font-black">{locale === "zh" ? ip.name.zh : ip.name.en}</p>
              <p className="mt-2 text-sm text-ink-500">{locale === "zh" ? ip.tagline.zh : ip.tagline.en}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8">
        <h2 className="mb-4 font-display text-3xl font-black">{t("customHeading")}</h2>
        <p className="text-lg text-ink-700">{t("customBody")}</p>
      </section>
    </div>
  );
}
