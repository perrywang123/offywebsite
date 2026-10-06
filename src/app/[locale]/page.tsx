import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { teaserSeries, upcomingIps } from "@/lib/catalog";
import { heroSlides, newsFeature, newsItems } from "@/lib/content";
import { headers } from "next/headers";
import { getLiveNewLooksProducts, getLiveProducts, toLiveProduct } from "@/server/catalog/live";
import { getRegionalProducts } from "@/server/catalog/regional";
import { getProductByCode } from "@/lib/catalog";
import { pickCountry } from "@/lib/geo";
import { env } from "@/lib/env";
import { Reveal } from "@/components/Reveal";

export const revalidate = 60;
import { Marquee } from "@/components/Marquee";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { NewsGrid } from "@/components/home/NewsGrid";
import { UpcomingCard } from "@/components/home/UpcomingCard";
import { ProductCard } from "@/components/product/ProductCard";
import { NewsletterForm } from "@/components/newsletter-form";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const promoMessages = tCommon.raw("promoMessages") as string[];
  const promoLine = promoMessages.join("  —  is.offy  —  ");

  // 实时拉取 Shopify:每次请求都反映当前真实的系列成员/价格/图片,不再依赖
  // 本地手写死的商品快照;Shopify 不可达时内部自动回退本地数据。
  // New Looks:每个系列按 Shopify 创建时间取最新 2 款(3 系列共 6 款)。
  const looks = await getLiveNewLooksProducts(2);
  const roster = await getLiveProducts();

  // ——— 区域限定(路线 A:按访客所在国家展示)———
  // 国家来自前置层注入的请求头(Cloudflare cf-ipcountry / nginx GeoIP2 等),
  // 拿不到就按 SHOPIFY_MARKET_COUNTRY 展示。Shopify 侧的区域限定是「只发布到
  // 某些 Market」,判定要按国家各查一次再比对,详见 server/catalog/regional.ts。
  // 注意:读 headers() 会让本页转为按请求渲染(dynamic)——这是 route A 的必要代价。
  const visitorCountry = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);
  const regionals = (await getRegionalProducts(visitorCountry)).map((item, i) => ({
    ...toLiveProduct(item, getProductByCode(item.handle)?.series ?? "princess-lady", i * 10),
    badge: visitorCountry,
  }));

  return (
    <>
      {/* ============ 头图轮播(图片驱动:宽撑满,高=宽/1.789 等比,文字随图) ============ */}
      <section className="relative overflow-hidden">
        <HeroCarousel slides={heroSlides} locale={locale} />
      </section>

      {/* ============ 促销条:多条促销语滚动(2026 首页文案表第 2-3 行) ============ */}
      <Marquee>
        <span className="mr-8 text-xs uppercase tracking-[var(--tracking-18)]">
          {promoLine}
        </span>
      </Marquee>

      {/* ============ 最新资讯 · 揭晓(网站素材0926/2、最新咨询:整模块满幅底图,
          主体与页面底色一致,顶部有一条柔和的过渡渐变带,把本模块与上方
          头图/促销条在视觉上轻轻隔开) ============ */}
      <section className="relative overflow-hidden">
        <Image
          src="/assets/home/news-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-contain object-top"
        />
        <div className="container-site relative py-20 md:py-28">
          {/* 标题区(最新资讯.psd 组「最新咨询·标题」):PSD 里是一行居中
              'NEWS·The Latest from OFFY'(80.8px=2.49vw,黑字,just=2 居中),
              其下居中 'Browse All Series'(36px=1.11vw)+ 一条与文字等宽的
              下划线(矩形「直线 1」)。原来「逛全部系列」在网格底部,现上移。 */}
          <Reveal className="mb-12 text-center">
            <h2 className="font-display text-[clamp(20px,2.49vw,54px)] font-semibold uppercase leading-tight tracking-tight">
              {t("newsKicker")}·{t("newsTitle")}
            </h2>
            <Link
              href="/products"
              className="link-line mt-5 inline-block text-[clamp(11px,1.11vw,24px)] uppercase tracking-[var(--tracking-10)]"
            >
              {t("browseAll")}
            </Link>
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
        </div>
      </section>

      {/* ============ 按类别选购 + 最新曝光造型(设计稿:同一模块;
          网站素材0926/3、按类别选购:整模块满幅底图,底色与页面同为浅灰,
          顶部居中的 is.offy 淡化字标正好被标题区盖住。
          底图按宽度等比缩放(object-contain),窄屏不再裁掉字标;
          图下方的留白用底图底色补齐,视觉上与图连成一片) ============ */}
      <section className="relative overflow-hidden bg-[#f7f7f9]">
        <Image
          src="/assets/home/category-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-contain object-top"
        />
        <div className="container-site relative py-20 md:py-28">
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
                {/* 显示商品名而非 SKU:商家的真实 SKU 可能是任意字符串
                    (如 NEON RUSH 的 SKU 是 "20"),直接展示会像乱码。 */}
                <ProductCard product={p} locale={locale} sizes="(max-width: 768px) 50vw, 33vw" />
              </Reveal>
            ))}
          </div>

          {/* ============ 区域限定(设计稿:红底 US/UK ONLY 徽章)============
              按访客国家展示;该国没有限定款时整块隐藏,不留空标题。 */}
          {regionals.length > 0 && (
            <>
              <p className="mt-16 text-sm text-ink-soft">{t("regionalTitle")}</p>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
                {regionals.map((p) => (
                  <Reveal key={p.code}>
                    <ProductCard product={p} locale={locale} sizes="(max-width: 768px) 50vw, 33vw" />
                  </Reveal>
                ))}
              </div>
            </>
          )}

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
        </div>
      </section>

      {/* ============ OFFY 新品抢先看(PSD:Stay tuned 标题区 + 玩偶图左上文字块;
          网站素材0926/4、更多新品，敬请期待:整模块满幅底图,顶部居中的
          STAY TUNED. 淡化字标正好被标题区盖住) ============ */}
      <section className="relative overflow-hidden bg-[#f7f7f9] py-20 md:py-28">
        <Image
          src="/assets/home/upcoming-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-contain object-top"
        />
        <div className="relative">
          {/* 标题区(更多新品，敬请期待.psd 组「更多新品，敬请期待标题」):
              PSD 里小字 'Stay tuned.' 在上(36px=1.11vw)、大字 'Upcoming Releases'
              在下(102.2px=3.14vw),两者都 just=2 居中 —— 与旧版大小颠倒,
              这里按 PSD 调正。再上面那层超大淡化 'Stay / tuned.'(203.2px,
              x36.42% y4.43%)是底图 upcoming-bg.jpg 里烤好的水印,不重复渲染。 */}
          <Reveal className="container-site mx-auto mb-14 text-center">
            <p className="text-[clamp(11px,1.11vw,24px)] font-normal uppercase leading-none tracking-[var(--tracking-10)]">
              {t("stayTuned")}
            </p>
            <h2 className="mt-4 font-display text-[clamp(22px,3.14vw,68px)] font-semibold uppercase leading-none tracking-tight">
              {t("teaserSub")}
            </h2>
          </Reveal>
          {/* 玩偶图 + 左上文字块(PSD 组「/时尚包挂系列」:标题 x7.23% y27.52%、
              说明 x7.20% y41.02%、黑色胶囊按钮 x6.83% y60.64% w18.39%) */}
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
                <div className="pt-[8%]">
                  {/* PSD 'Fashionable Bag  / Charm Collection' 127.2px = 3.91vw */}
                  <h3 className="font-display text-[clamp(20px,3.91vw,84px)] font-semibold uppercase leading-[1.1] tracking-tight">
                    {locale === "zh" ? teaserSeries.name.zh : teaserSeries.name.en}
                  </h3>
                  {/* PSD 'Follow @is.offy on Instagram  / for drop dates.' 64.8px = 1.99vw */}
                  <p className="mt-[3.5%] text-[clamp(11px,1.99vw,42px)] leading-snug text-ink">
                    {locale === "zh" ? teaserSeries.note.zh : teaserSeries.note.en}
                  </p>
                  {/* PSD 矩形3拷贝8:x6.83% w18.39% h6.31%;文字 'View details' 61.6px=1.89vw 白字 */}
                  <Link
                    href="/bag-charm"
                    className="mt-[6%] inline-flex h-[clamp(38px,6.31vw,124px)] items-center justify-center rounded-full bg-ink px-[clamp(18px,4.5vw,90px)] text-[clamp(11px,1.89vw,40px)] font-normal uppercase leading-none tracking-[var(--tracking-10)] text-cream transition-colors duration-300 hover:bg-accent"
                  >
                    {t("teaserCta")}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 联名定制(PSD:主标题 + 14 OF 头像图 + CTA) ============ */}
      <section className="container-site py-20">
        {/* 主标题(头像图上方居中,不叠加压图) */}
        <Reveal className="pb-10 text-center">
          <h2 className="font-display text-[clamp(26px,2.4vw,48px)] font-semibold uppercase tracking-tight">{t("collabTitle")}</h2>
          <p className="mt-3 text-ink-soft">{t("collabSub")}</p>
          {/* 联名洽谈邮箱:原为 hello@playcoretoys.com —— 那是旧实体域名,与政策正文里的
            Whimcore Cultural Creative Co., Limited 不是同一家,站上留着会出现两套联系信息。 */}
          <a href="mailto:contact@whimcoreofficial.com" className="focus-ring link-line mt-4 inline-block text-sm">
            {t("collabCta")}
          </a>
        </Reveal>
        {/* 14 OF 造型头像图(PSD 矢量智能对象,透明底) */}
        <Reveal className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/home/collab-ips.png" alt={t("collabTitle")} className="w-full" />
        </Reveal>
      </section>

      {/* ============ 订阅(NEVER MISS OFFY)——移至联名下方 ============ */}
      <section className="bg-cream-deep py-20">
        <div className="container-site grid items-center gap-10 md:grid-cols-2">
          <Reveal variant="up">
            <p className="kicker mb-3">{t("subscribeKicker")}</p>
            <h2 className="font-display text-[clamp(24px,2vw,40px)] font-semibold uppercase tracking-tight">{t("subscribeTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("subscribeSub")}</p>
          </Reveal>
          <Reveal variant="up"><NewsletterForm /></Reveal>
        </div>
      </section>

      {/* ============ 后续计划(后续计划.psd:标题 + 双卡;移动端上下排布,桌面左右并排)。
          PSD 里没有 kicker,标题只有 NEW IPS AHEAD + 一行说明,故去掉了原来的
          「THE NEXT CHAPTER」小标;卡片内部结构见 UpcomingCard。 ============ */}
      <section className="container-site py-20">
        <Reveal className="mb-10">
          <h2 className="font-display text-[clamp(26px,2.53vw,81px)] font-semibold uppercase tracking-tight">{t("comingTitle")}</h2>
          <p className="mt-[1.4%] text-[clamp(12px,1.13vw,36px)] uppercase tracking-[var(--tracking-10)] text-ink-soft">{t("comingSub")}</p>
        </Reveal>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {upcomingIps.map((ip) => (
            <Reveal key={ip.code}>
              <UpcomingCard ip={ip} inDevelopmentLabel={t("inDevelopment")} locale={locale} />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
