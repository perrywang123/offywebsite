import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, publicPath } from "@/i18n/routing";
import { env } from "@/lib/env";
import { getLiveSeriesList } from "@/server/catalog/live";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "../globals.css";

// 近实时:每 60s 重新生成,导航栏/页脚的系列名随 Shopify Collection 标题变化。
export const revalidate = 60;

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
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, publicPath(l)]),
      ),
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
            <Footer series={series} locale={locale} />
            <CartDrawer />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
