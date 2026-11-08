import { headers } from "next/headers";
import { pickCountry } from "@/lib/geo";
import { ShopifyTrackingScripts, ShopifyPageTracking } from "@/components/collabs/ShopifyTracking";
import { CollabsLandingTracking } from "@/components/collabs/LandingTracking";
import { collabsMode } from "@/server/collabs/mode";
import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, publicPath } from "@/i18n/routing";
import { env, kolEnabled } from "@/lib/env";
import { getLiveSeriesList } from "@/server/catalog/live";
import { ReferralBridge } from "@/components/kol/ReferralBridge";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { MetaTracking } from "@/components/marketing/MetaTracking";
import { metaConfig } from "@/server/meta/config";
import { metaTestOrigin } from "@/server/meta/runtime";
import "../globals.css";

export const dynamic = "force-dynamic";

/** 视口:`viewportFit: "cover"` 是 `.safe-b` / `.safe-t` 里 env(safe-area-inset-*)
 *  能取到非零值的前提(否则刘海与 home indicator 区域一律按 0 处理,
 *  抽屉底部的 Checkout 会被 home indicator 压住)。 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** 全站根元数据:标题模板/描述/OG/hreflang。 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    metadataBase: new URL(env.SITE_URL),
    title: {
      default: `${t("brand")} — ${t("tagline")}`,
      template: `%s | ${t("brand")}`,
    },
    description: t("tagline"),
    alternates: {
      // 英文站无前缀:canonical 是 `/` 而不是 `/en`(后者现在只做 308 跳转)。
      canonical: publicPath(locale),
      // hreflang 只列 `routing.locales` 里真实存在的语言。中文已从路由表移除,
      // 这里若还挂着 `zh: "/zh"` 会把爬虫指向一个已不存在的地址。
      languages: Object.fromEntries(routing.locales.map((l) => [l, publicPath(l)])),
    },
    openGraph: {
      siteName: "is.offy",
      title: `${t("brand")} — ${t("tagline")}`,
      description: t("tagline"),
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [{ url: "/assets/hero/hero-brand.jpg", width: 3250, height: 2041, alt: "is.offy" }],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = (await import(`../../../messages/${locale}.json`)).default;
  // 全站导航(Header/Footer/MobileNav)共用同一次实时系列拉取结果,
  // 避免每个组件各自发起请求;Shopify 不可达时 getLiveSeriesList 内部

  const series = await getLiveSeriesList().catch(() => []);
  const meta = metaConfig();
  const tracking =
    (collabsMode() || meta.enabled) && env.SHOPIFY_ANALYTICS_SHOP_ID && env.SHOPIFY_STORE_DOMAIN;
  const country = tracking ? pickCountry(await headers(), env.SHOPIFY_MARKET_COUNTRY) : "US";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {tracking && (
          <ShopifyTrackingScripts
            shopId={env.SHOPIFY_ANALYTICS_SHOP_ID!}
            storefrontId={env.SHOPIFY_STOREFRONT_ID ?? ""}
            domain={env.SHOPIFY_STORE_DOMAIN!}
            country={country}
          />
        )}
      </head>
      <body className="bg-cream text-ink min-h-screen font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        {/* 第 2 批 SEO:Organization + WebSite 全站各一份(由根布局统一输出)。 */}
        {kolEnabled() && !collabsMode() && <ReferralBridge />}
        {tracking && <ShopifyPageTracking />}
        {meta.enabled && (
          <MetaTracking
            config={{
              enabled: true,
              pixelId: meta.pixelId,
              catalogIds: meta.catalogIds,
              ...(metaTestOrigin() ? { pixelScript: `${metaTestOrigin()}/pixel.js` } : {}),
            }}
          />
        )}
        {kolEnabled() && collabsMode() && <CollabsLandingTracking />}
        <SiteJsonLd siteUrl={env.SITE_URL} />
        <NextIntlClientProvider messages={messages}>
          <CartProvider>
            <Header series={series} />
            <main>{children}</main>
            <Footer series={series} locale={locale} />
            <CartDrawer />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
