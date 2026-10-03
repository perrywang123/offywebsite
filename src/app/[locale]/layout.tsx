import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { getLiveSeriesList } from "@/server/catalog/live";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "../globals.css";

// 近实时:每 60s 重新生成,导航栏/页脚的系列名随 Shopify Collection 标题变化。
export const revalidate = 60;

/** 全站根元数据:标题模板/描述/OG/hreflang(zh↔en 互为替代语言)。 */
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
      canonical: `/${locale}`,
      languages: { zh: "/zh", en: "/en" },
    },
    openGraph: {
      siteName: "is.offy",
      title: `${t("brand")} — ${t("tagline")}`,
      description: t("tagline"),
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [{ url: "/assets/hero/hero-01.jpg", width: 1920, height: 1071, alt: "is.offy" }],
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
  // 已回退本地静态 seriesList,这里不需要再处理失败场景。
  const series = await getLiveSeriesList();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        <NextIntlClientProvider messages={messages}>
          <CartProvider>
            <Header series={series} />
            <main>{children}</main>
            <Footer series={series} />
            <CartDrawer />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
