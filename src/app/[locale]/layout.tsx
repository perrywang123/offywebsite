import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "../globals.css";

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

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        <NextIntlClientProvider messages={messages}>
          <CartProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
