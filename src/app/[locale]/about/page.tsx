import type { Metadata } from "next";
import { pageMetadata, searchCopy } from "@/lib/seo/metadata";
import { publicPath } from "@/i18n/routing";
import { AboutLanding } from "@/components/about/AboutStory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const metadata = pageMetadata(locale, "/about", searchCopy["/about"]);
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [
        {
          url: "/assets/about/offy-illustration.webp",
          width: 1254,
          height: 1254,
          alt: "OFFY illustrated with curly hair and little wings",
        },
      ],
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <AboutLanding storyHref={publicPath(locale, "/our-story")} />;
}
