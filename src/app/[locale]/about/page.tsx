import type { Metadata } from "next";
import { publicPath } from "@/i18n/routing";
import { AboutLanding } from "@/components/about/AboutStory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const path = publicPath(locale, "/about");
  const title = "About Us";
  const description =
    "Where OFFY came from. Disconnect, return to nature and meet the version of yourself you love — then explore the story of OFFY and her creator, Gia.";
  return {
    title,
    description,
    alternates: { canonical: path, languages: { en: "/about" } },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
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
