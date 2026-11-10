import { CommerceUnavailable } from "@/components/CommerceUnavailable";
import { catalogResult } from "@/server/catalog/result";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { teaserSeries, upcomingIps } from "@/lib/catalog";
import { heroSlides, newsFeature, newsItems } from "@/lib/content";
import { headers } from "next/headers";
import { getLiveProducts, getLiveSeriesList } from "@/server/catalog/live";
import { getHomeLooks } from "@/server/catalog/home";
import { pickCountry } from "@/lib/geo";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { NewsGrid } from "@/components/home/NewsGrid";
import { UpcomingCard } from "@/components/home/UpcomingCard";
import { HomeLooks } from "@/components/home/HomeLooks";
import { NewsletterForm } from "@/components/newsletter-form";

export async function generateMetadata(): Promise<import("next").Metadata> {
  const country = pickCountry(await headers());
  const result = await catalogResult(
    Promise.all([getHomeLooks(country), getLiveProducts(country)]),
  );
  return result.status === "unavailable" ? { robots: { index: false, follow: true } } : {};
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");
  // 首页语义 H1 用全站品牌主张(common.tagline),不新造文案。
  const tCommon = await getTranslations("common");

  // 先确定访客国家,再按它查询:所有价格(含区域限定)都用同一个市场上下文,

  // 注意:读 headers() 会让本页转为按请求渲染(dynamic)——这是 route A 的必要代价。
  const visitorCountry = pickCountry(await headers());

  const [looksResult, allResult, seriesResult] = await Promise.all([
    catalogResult(getHomeLooks(visitorCountry)),
    catalogResult(getLiveProducts(visitorCountry)),
    catalogResult(getLiveSeriesList()),
  ]);
  const unavailable = looksResult.status === "unavailable" || allResult.status === "unavailable";
  const allProducts = allResult.status === "ready" ? allResult.data : [];
  // Shopify verifies market availability; NEWS photography stays editorial brand content.
  const featureProduct = allProducts.find(
    (p) => p.code === newsFeature.productCode && p.isAvailable,
  );
  const verifiedNews = newsItems.filter((item) =>
    allProducts.some((p) => p.code === item.productCode && p.isAvailable),
  );

  return (
    <>
      {/* 语义 H1(**sr-only**,视觉零变化)。
          首页头图的文字是烧进图片里的,语义层此前一个 h1 都没有(实测 h1=0),
          搜索引擎只能看到一个没有标题的页面。这里补品牌主张作 h1,但**必须**
          视觉隐藏:头图里已经有同一句话,可见 h1 会重复/破坏设计稿。
          文案复用 common.tagline,不在组件里硬编码。 */}
      <h1 className="sr-only">{tCommon("tagline")}</h1>

      {/* ============ 头图轮播(图片驱动:宽撑满,高=宽/1.789 等比,文字随图) ============
          `border-b border-cream-line`(#e3e3e3)是给头图 ↔ NEWS 这条硬接缝补的分隔线:
          5 张头图素材的底边色差很大(hero-promo 底边 #f7f2ef 与 NEWS 的 #efefef 只差
          Δ8,hero-dressup 的 #4f4d50 差 Δ162),而每 5 秒切一次屏 —— 没有这条线,
          接缝会跟着轮播来回跳。此处**不要**在 NEWS 顶部加渐变(见下方注释)。 */}
      <section className="border-cream-line relative overflow-hidden border-b">
        <HeroCarousel slides={heroSlides} locale={locale} />
      </section>

      {unavailable && (
        <div className="container-site section-y">
          <CommerceUnavailable scene="home" />
        </div>
      )}
      <>
        {/* ============ 最新资讯 · 揭晓(网站素材0926/2、最新咨询)============
          老板 2026-10 诉求 2:原头图下方的**滚动促销条(Marquee)已删除** ——
          同一份 promoMessages 在 Header 的 sticky 促销条上全站每页常驻,首页这条
          是重复曝光(且 `— is.offy —` 分隔符只存在于被删的那段 join 串里)。
          诉求 5:原来的满幅底图 news-bg.jpg 已删除,改成**显式**写出的取色纯色底
          `bg-[#efefef]`(实测:该图 96.31% 的像素就是 #efefef,四角一致、
          行/列中位数极差 = 0,全图唯一内容只有 y5.0–13.6% 处的幽灵字
          `BROWSE CATEGORIES / THAT INTEREST YOU`,与底色对比度仅 1.216:1,不是可读元素)。
          必须显式声明而不是"靠 body 透色":body 上同时挂着 Tailwind 的 bg-cream
          与 globals.css 里**无层级**的 body{background:var(--background)},
          今天靠"无层级压过 @layer utilities"才显示为 #efefef —— 谁把那条规则挪进
          @layer base,首页底色就整体变白。也不要写 `bg-background`:
          --background 定义在 :root 而非 @theme,Tailwind v4 不生成该工具类。 */}
        {featureProduct && verifiedNews.length > 0 && (
          <section className="relative overflow-hidden bg-[#efefef]">
            <div className="container-site section-y relative">
              {/* 标题区(最新资讯.psd 组「最新咨询·标题」):PSD 里是一行居中
              'NEWS·The Latest from OFFY'(80.8px=2.49vw,黑字,just=2 居中),
              其下居中 'Browse All Series'(36px=1.11vw)+ 一条与文字等宽的
              下划线(矩形「直线 1」)。原来「逛全部系列」在网格底部,现上移。
              字号下限抬到 30/12px(方案 §1.1 规则 1:所有 clamp 下限 = 档位值)。
              `lg:` 保留改动前的原值 —— 下限只影响窄屏,桌面端算式一字不变。 */}
              <Reveal className="mb-12 text-center">
                <h2 className="font-display text-[clamp(30px,2.49vw,54px)] leading-tight font-semibold tracking-tight uppercase lg:text-[clamp(20px,2.49vw,54px)]">
                  {/* 老板 2026-10 要求:去掉 "News·" 前缀,标题只留 "The Latest from OFFY"。
                newsKicker 这个 i18n key 保留(两本字典 key 必须一致),只是不再渲染。 */}
                  {t("newsTitle")}
                </h2>
                <Link
                  href="/products"
                  className="link-line tap-target mt-5 text-[clamp(12px,1.11vw,24px)] tracking-[var(--tracking-10)] uppercase lg:min-h-0 lg:text-[clamp(11px,1.11vw,24px)]"
                >
                  {t("browseAll")}
                </Link>
              </Reveal>
              <NewsGrid
                feature={newsFeature}
                items={verifiedNews}
                texts={{
                  featureTitle: t("newsFeatureTitle"),
                  cta: t("teaserCta"),
                  browseAll: t("browseAll"),
                }}
                locale={locale}
              />
            </div>
          </section>
        )}

        {looksResult.status === "ready" && (
          <section id="looks" className="home-looks-section">
            <HomeLooks
              data={looksResult.data}
              series={seriesResult.status === "ready" ? seriesResult.data : []}
              locale={locale}
              labels={{
                eyebrow: t("editEyebrow"),
                featured: t("featuredTitle"),
                newest: t("discoverTitle"),
                description: t("editDescription"),
                viewAll: t("editViewAll"),
                regional: t("regionalTitle"),
                regionalDescription: t("regionalDescription"),
                empty: t("editEmpty"),
                series: t("editSeries"),
                soldOut: t("editSoldOut"),
              }}
            />
          </section>
        )}
      </>

      {/* ============ OFFY 新品抢先看(PSD:Stay tuned 标题区 + 玩偶图左上文字块;
          网站素材0926/4、更多新品，敬请期待)。
          诉求 5:满幅底图 upcoming-bg.jpg 已删除 —— 实测 98.29% 的像素就是
          `#f7f7f9`,唯一内容是顶部 y4.5–15.8% 处的 `STAY / TUNED.` 幽灵字
          (与底色对比度 1.103:1)。原注释说那层超大淡化字是"底图里烤好的水印,
          不重复渲染" —— 底图既然删了,这句话不再成立,标题区自身仍是实时文字。 */}
      <section className="section-y relative overflow-hidden bg-[#f7f7f9]">
        <div className="relative">
          {/* 标题区(更多新品，敬请期待.psd 组「更多新品，敬请期待标题」):
              PSD 里小字 'Stay tuned.' 在上(36px=1.11vw)、大字 'Upcoming Releases'
              在下(102.2px=3.14vw),两者都 just=2 居中 —— 与旧版大小颠倒,
              这里按 PSD 调正。PSD 里再上面那层超大淡化 'Stay / tuned.'
              (203.2px,x36.42% y4.43%)原本由底图承载,随底图一并移除。 */}
          <Reveal className="container-site mx-auto mb-14 text-center">
            <p className="text-[clamp(12px,1.11vw,24px)] leading-none font-normal tracking-[var(--tracking-10)] uppercase lg:text-[clamp(11px,1.11vw,24px)]">
              {t("stayTuned")}
            </p>
            <h2 className="font-display mt-4 text-[clamp(30px,3.14vw,68px)] leading-none font-semibold tracking-tight uppercase">
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
                  <h3 className="font-display text-[clamp(30px,3.91vw,84px)] leading-[1.1] font-semibold tracking-tight uppercase">
                    {locale === "zh" ? teaserSeries.name.zh : teaserSeries.name.en}
                  </h3>
                  {/* PSD 'Follow @is.offy on Instagram  / for drop dates.' 64.8px = 1.99vw
                      (下限按 §1.1 规则 1 收到辅助文案档 14px) */}
                  <p className="text-ink mt-[3.5%] text-[clamp(14px,1.99vw,42px)] leading-snug">
                    {locale === "zh" ? teaserSeries.note.zh : teaserSeries.note.en}
                  </p>
                  {/* PSD 矩形3拷贝8:x6.83% w18.39% h6.31%;文字 'View details' 61.6px=1.89vw 白字。
                      高度下限 38 → 44px:窄屏下这是首页唯一通向 /bag-charm 的入口(方案 #2)。 */}
                  <Link
                    href="/bag-charm"
                    className="bg-ink text-cream hover:bg-accent mt-[6%] inline-flex h-[clamp(44px,6.31vw,124px)] items-center justify-center rounded-full px-[clamp(18px,4.5vw,90px)] text-[clamp(11px,1.89vw,40px)] leading-none font-normal tracking-[var(--tracking-10)] uppercase transition-colors duration-300"
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
      <section className="container-site section-y lg:py-20">
        {/* 主标题(头像图上方居中,不叠加压图) */}
        <Reveal className="pb-10 text-center">
          <h2 className="font-display text-[clamp(30px,2.4vw,48px)] font-semibold tracking-tight uppercase lg:text-[clamp(26px,2.4vw,48px)]">
            {t("collabTitle")}
          </h2>
          <p className="text-ink-soft mt-3">{t("collabSub")}</p>
          {/* 联名洽谈邮箱:原为 hello@playcoretoys.com —— 那是旧实体域名,与政策正文里的
            Whimcore Cultural Creative Co., Limited 不是同一家,站上留着会出现两套联系信息。 */}
          {/* 按 Excel 第 18 行:文案改 Explore Collaboration,跳转从 mailto 改成 CONTACT US
              (站内的联系信息页 /policies/contact)。 */}
          <Link
            href="/policies/contact"
            className="focus-ring link-line tap-target mt-4 text-sm lg:min-h-0"
          >
            {t("collabCta")}
          </Link>
        </Reveal>
        {/* 14 OF 造型头像图(PSD 矢量智能对象,透明底) */}
        <Reveal className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/home/collab-ips.png" alt={t("collabTitle")} className="w-full" />
        </Reveal>
      </section>

      {/* ============ 订阅(NEVER MISS OFFY)——移至联名下方 ============ */}
      <section className="section-y bg-cream-deep lg:py-20">
        <div className="container-site grid items-center gap-10 md:grid-cols-2">
          <Reveal variant="up">
            <p className="kicker mb-3">{t("subscribeKicker")}</p>
            <h2 className="font-display text-[clamp(30px,2vw,40px)] font-semibold tracking-tight uppercase lg:text-[clamp(24px,2vw,40px)]">
              {t("subscribeTitle")}
            </h2>
            <p className="text-ink-soft mt-3">{t("subscribeSub")}</p>
          </Reveal>
          <Reveal variant="up">
            <NewsletterForm />
          </Reveal>
        </div>
      </section>

      {/* ============ 后续计划(后续计划.psd:标题 + 双卡;移动端上下排布,桌面左右并排)。
          PSD 里没有 kicker,标题只有 NEW IPS AHEAD + 一行说明,故去掉了原来的
          「THE NEXT CHAPTER」小标;卡片内部结构见 UpcomingCard。 ============ */}
      <section className="container-site section-y lg:py-20">
        <Reveal className="mb-10">
          <h2 className="font-display text-[clamp(30px,2.53vw,81px)] font-semibold tracking-tight uppercase lg:text-[clamp(26px,2.53vw,81px)]">
            {t("comingTitle")}
          </h2>
          <p className="text-ink-soft mt-[1.4%] text-[clamp(12px,1.13vw,36px)] tracking-[var(--tracking-10)] uppercase">
            {t("comingSub")}
          </p>
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
