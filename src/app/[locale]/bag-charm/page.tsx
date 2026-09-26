import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { teaserSeries } from "@/lib/catalog";
import { Reveal } from "@/components/Reveal";

/**
 * 时尚包挂系列预告详情页(设计稿):超大英文标题两行 + 左大图右竖图 hero
 * (同一张头图,object-left/object-right 各取半幅),下方 6 张预告产品卡。
 */
export default async function BagCharmTeaserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const [titleLine1, ...titleRest] = teaserSeries.titleEn.split(" ");
  const titleLine2 = titleRest.join(" ");
  const seriesName = locale === "zh" ? teaserSeries.name.zh : teaserSeries.name.en;

  return (
    <>
      {/* ============ Hero:超大标题 + 左大右竖双图 ============ */}
      <section className="mx-auto max-w-7xl px-6 pt-[calc(var(--header-h)+3rem)] lg:px-8">
        <Reveal>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            {titleLine1}
            <br />
            {titleLine2}
          </h1>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-[2fr_1fr] lg:gap-6">
          <Reveal variant="left" className="relative aspect-[4/3] overflow-hidden bg-cream-deep">
            <Image
              src={teaserSeries.heroImage}
              alt={`${seriesName} — 1`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover object-left"
            />
          </Reveal>
          <Reveal variant="right" className="relative aspect-[3/4] overflow-hidden bg-cream-deep md:aspect-auto">
            <Image
              src={teaserSeries.heroImage}
              alt={`${seriesName} — 2`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover object-right"
            />
          </Reveal>
        </div>
      </section>

      {/* ============ 标题区 ============ */}
      <section className="mx-auto max-w-7xl px-6 pt-16 lg:px-8">
        <Reveal>
          <h2 className="text-xl font-bold text-ink">{seriesName}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("comingSub")}</p>
        </Reveal>
      </section>

      {/* ============ 预告产品卡(6 张,点击查看 → 产品汇总页) ============ */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:gap-x-8">
          {teaserSeries.items.map((item, i) => (
            <Reveal key={item.code} delay={Math.min(i, 5) * 60}>
              <div className="group">
                <div className="relative aspect-[4/5] overflow-hidden bg-cream-deep">
                  <Image
                    src={item.image}
                    alt={item.code}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="scale-[1.01] object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-3">
                  <span className="text-sm font-medium text-ink">{item.code}</span>
                  <Link
                    href="/products"
                    className="shrink-0 text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    {t("viewDetail")} →
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
