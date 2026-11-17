import type { Metadata } from "next";
import { pageMetadata, searchCopy } from "@/lib/seo/metadata";
import { publicPath } from "@/i18n/routing";
import { OffyStory } from "@/components/about/AboutStory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const metadata = pageMetadata(locale, "/our-story", searchCopy["/our-story"]);
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
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
