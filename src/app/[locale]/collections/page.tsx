import Image from "next/image";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/env";
import { pickCountry } from "@/lib/geo";
import { getLiveProductsBySeries, getLiveSeriesList } from "@/server/catalog/live";
import { Reveal } from "@/components/Reveal";

export const revalidate = 60;

/**
 * 系列封面 = 首页头图里该系列那一屏。
 *
 * 为什么不用商品图:系列卡片要表达的是"这一整个系列的世界观",头图那一屏正是
 * 为它拍的整组画面;而商品图是单个玩偶的棚拍,放在系列卡上会被读成"这个系列
 * 就这一款"。映射与 `lib/content.ts` 的 heroSlides 跳转一一对应。
 */
const SERIES_HERO_IMAGE: Record<string, string> = {
  "princess-lady": "/assets/hero/hero-princess.jpg",
  "outdoor-sporty": "/assets/hero/hero-streetwear.jpg",
  "playful-life": "/assets/hero/hero-playful.jpg",
};

function seriesHeroImage(slug: string): string {
  // 未知系列(商家在 Shopify 新建 collection)时退回品牌图,而不是崩掉
  return SERIES_HERO_IMAGE[slug] ?? "/assets/hero/hero-brand.jpg";
}

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("catalog");
  // 封面图取的是"该系列当前第一款商品",按访客市场查询才能与系列页 / 首页一致。
  const country = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);

  // 实时拉取:系列名称跟随 Shopify Collection 标题,张数来自该系列当前真实的商品清单。
  const seriesList = await getLiveSeriesList();
  const series = await Promise.all(
    seriesList.map(async (s) => {
      const products = await getLiveProductsBySeries(s.slug, country);
      return { ...s, count: products.length, image: seriesHeroImage(s.slug) };
    }),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <header className="mb-10">
        <p className="kicker mb-3">{t("seriesKicker")}</p>
        {/* 用系列页专属 key,不与 /products 共用 —— 两个页面的标题/副标题文案不同。 */}
        <h1 className="font-display text-4xl font-semibold uppercase tracking-tight md:text-5xl">
          {t("seriesTitle")}
        </h1>
        <p className="mt-3 max-w-[52ch] text-sm uppercase leading-relaxed tracking-[var(--tracking-10)] text-ink-soft">
          {t("seriesSubtitle")}
        </p>
      </header>

      {/* 单列整宽横卡:封面从头图(3250×2041 ≈ 1.59 横构图)取,原来的
          三列 3:4 竖卡装不下横构图,硬用 object-cover 会把画面裁掉两侧。 */}
      <div className="flex flex-col gap-6">
        {series.map((s, i) => (
          <Reveal key={s.slug} delay={Math.min(i, 5) * 60}>
            <Link href={`/collections/${s.slug}`} className="group relative block aspect-[3250/2041] overflow-hidden rounded-card bg-paper">
              <Image
                src={s.image}
                alt={locale === "zh" ? s.name.zh : s.name.en}
                fill
                sizes="(max-width:768px) 100vw, 1200px"
                className="object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
              <div className="absolute inset-x-6 bottom-6 flex items-end justify-between md:inset-x-10 md:bottom-9">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[var(--tracking-18)] text-cream/80 md:text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-cream md:text-4xl">
                    {locale === "zh" ? s.name.zh : s.name.en}
                  </p>
                </div>
                <p className="text-xs text-cream/70 md:text-sm">{t("looksCount", { count: s.count })}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
