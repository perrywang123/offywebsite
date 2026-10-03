import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLiveProductsBySeries, getLiveSeriesList } from "@/server/catalog/live";
import { Reveal } from "@/components/Reveal";

export const revalidate = 60;

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("catalog");

  // 实时拉取:系列名称跟随 Shopify Collection 标题,每个系列的张数/封面图
  // 来自该系列当前真实的商品清单,而不是本地快照。
  const seriesList = await getLiveSeriesList();
  const series = await Promise.all(
    seriesList.map(async (s) => {
      const products = await getLiveProductsBySeries(s.slug);
      return {
        ...s,
        count: products.length,
        image: products[0]?.images[0] ?? "/assets/hero/hero-01.jpg",
      };
    }),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <header className="mb-10">
        <p className="kicker mb-3">Series</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{t("title")}</h1>
        <p className="mt-2 text-ink-soft">{t("subtitle")}</p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s, i) => (
          <Reveal key={s.slug} delay={Math.min(i, 5) * 60}>
            <Link href={`/collections/${s.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-paper">
              <Image
                src={s.image}
                alt={locale === "zh" ? s.name.zh : s.name.en}
                fill
                sizes="(max-width:768px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/80">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold text-cream">
                    {locale === "zh" ? s.name.zh : s.name.en}
                  </p>
                </div>
                <p className="text-xs text-cream/70">{s.count} {locale === "zh" ? "个形象" : "looks"}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
