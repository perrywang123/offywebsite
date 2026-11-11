import type { Metadata } from "next";
import { publicPath } from "@/i18n/routing";
import { OffyStory } from "@/components/about/AboutStory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const path = publicPath(locale, "/our-story");
  const title = "The Story of OFFY";
  const description =
    "Meet Gia, the creator of OFFY, and discover Briar Island, the original character sketches and the many different versions of the same sleepy-eyed girl.";
  return {
    title,
    description,
    alternates: { canonical: path, languages: { en: "/our-story" } },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      images: [
        {
          url: "/assets/about/story-banner.webp",
          width: 2400,
          height: 771,
          alt: "OFFY in an original black-and-white illustration",
        },
      ],
    },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <OffyStory aboutHref={publicPath(locale, "/about")} />;
}
