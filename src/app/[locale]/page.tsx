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
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { NewsGrid } from "@/components/home/NewsGrid";
import { UpcomingCard } from "@/components/home/UpcomingCard";
import { ProductCard } from "@/components/product/ProductCard";
import { NewsletterForm } from "@/components/newsletter-form";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");

  // 先确定访客国家,再按它查询:所有价格(含区域限定)都用同一个市场上下文,
  // 保证首页上的金额/币种与结账页一致(见 server/catalog/live.ts 的 resolvePrice)。
  // 注意:读 headers() 会让本页转为按请求渲染(dynamic)——这是 route A 的必要代价。
  const visitorCountry = pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY);

  // 实时拉取 Shopify:每次请求都反映当前真实的系列成员/价格/图片,不再依赖
  // 本地手写死的商品快照;Shopify 不可达时内部自动回退本地数据。
  // New Looks:每个系列按 Shopify 创建时间取最新 2 款(3 系列共 6 款)。
  const looks = await getLiveNewLooksProducts(visitorCountry, 2);
  const roster = await getLiveProducts(visitorCountry);

  // ——— 区域限定(路线 A:按访客所在国家展示)———
  // 国家来自前置层注入的请求头(Cloudflare cf-ipcountry / nginx GeoIP2 等),
  // 拿不到就按 SHOPIFY_MARKET_COUNTRY 展示。Shopify 侧的区域限定是「只发布到
  // 某些 Market」,判定要按国家各查一次再比对,详见 server/catalog/regional.ts。
  // 价格来源已随本次改造改为"如实采用该国市场的金额与币种":英国访客看到
  // NOIR £37.90、香港访客看到 BOOTS HK$369.00,而不再是 $0.00。
  const regionals = (await getRegionalProducts(visitorCountry)).map((item, i) => ({
    ...toLiveProduct(item, getProductByCode(item.handle)?.series ?? "princess-lady", i * 10),
    badge: visitorCountry,
  }));

  return (
    <>
      {/* ============ 头图轮播(图片驱动:宽撑满,高=宽/1.789 等比,文字随图) ============
          `border-b border-cream-line`(#e3e3e3)是给头图 ↔ NEWS 这条硬接缝补的分隔线:
          5 张头图素材的底边色差很大(hero-promo 底边 #f7f2ef 与 NEWS 的 #efefef 只差
          Δ8,hero-streetwear 的 #4f4d50 差 Δ162),而每 5 秒切一次屏 —— 没有这条线,
          接缝会跟着轮播来回跳。此处**不要**在 NEWS 顶部加渐变(见下方注释)。 */}
      <section className="border-cream-line relative overflow-hidden border-b">
        <HeroCarousel slides={heroSlides} locale={locale} />
      </section>

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
            items={newsItems}
            texts={{
              featureTitle: t("newsFeatureTitle"),
              cta: t("teaserCta"),
              browseAll: t("browseAll"),
            }}
            locale={locale}
          />
        </div>
      </section>

      {/* ============ 按类别选购 + 最新曝光造型(设计稿:同一模块;
          网站素材0926/3、按类别选购)。
          诉求 5:满幅底图 category-bg.jpg 已删除 —— 实测该图 98.90% 的像素就是
          `#f7f7f9`(四角一致、行/列中位数极差 = 0),唯一内容是顶部 y2.1–10.0%
          处的 `is.offy` 幽灵字标,与底色对比度 1.154:1。当年写死的 `bg-[#f7f7f9]`
          本来就是给 object-contain 的留白补的底色,与取色值**逐位相同**,故原样保留。 */}
      <section className="relative overflow-hidden bg-[#f7f7f9]">
        <div className="container-site section-y relative">
          <Reveal className="mb-12 text-center">
            <h2 className="font-display text-[clamp(30px,2.6vw,60px)] font-semibold tracking-tight uppercase">
              {t("categoryTitle")}
            </h2>
          </Reveal>
          <Reveal className="mb-8 flex items-end justify-between">
            <h3 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {t("discoverTitle")}
            </h3>
            <Link href="/products" className="link-line tap-target text-sm lg:min-h-0">
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
              <p className="text-ink-soft mt-10 text-sm sm:mt-16">{t("regionalTitle")}</p>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
                {regionals.map((p) => (
                  <Reveal key={p.code}>
                    <ProductCard
                      product={p}
                      locale={locale}
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </Reveal>
                ))}
              </div>
            </>
          )}

          {/* ============ 产品汇总-选购同款造型(圆形名册,紧接本模块) ============ */}
          <p className="text-ink-soft mt-10 text-sm sm:mt-16">{t("rosterTitle")}</p>
          <Reveal className="mt-6">
            {/* 圆圈原本是写死的 h-16 w-16(64px)。手机 375px 宽时 6 列 × 64px = 384px
                已经超出容器,grid 的 gap 根本挤不出来 —— 圆圈直接贴在一起。改成按单元格
                缩放 + max-w-16 封顶:窄屏自动缩小(间距才是真的),宽屏仍是原来的 64px。
                窄屏(375px)6 列 → 4 列:每格 (343 − 3×12) / 4 = 76.75px,并给每个圆
                补一个**常显**名称(原来只有 hover/`title`,触屏上等于没有名字)。 */}
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-3 lg:grid-cols-12">
              {roster.map((p) => (
                <Link
                  key={p.code}
                  href={`/products/${p.code}`}
                  title={locale === "zh" ? p.name.zh : p.name.en}
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span className="border-sand bg-cream-deep group-hover:border-brown-600 relative block aspect-square w-full max-w-16 overflow-hidden rounded-full border transition-colors">
                    {p.isUpcoming ? (
                      <span className="text-ink-muted flex h-full w-full items-center justify-center text-xs font-semibold">
                        ?
                      </span>
                    ) : (
                      <Image
                        src={p.images[0]}
                        alt={p.name.en}
                        fill
                        sizes="64px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                  </span>
                  <span className="text-ink-soft w-full truncate text-center text-[11px] leading-tight">
                    {locale === "zh" ? p.name.zh : p.name.en}
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

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
