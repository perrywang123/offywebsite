import { JsonLd } from "./JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

/**
 * 全站只输出一次的 Organization + WebSite 结构化数据。
 *
 * 由根布局 [`layout.tsx`](src/app/[locale]/layout.tsx) 渲染,所以每个页面
 * 都有且只有一份(不是只在首页)。放在 body 里是 Schema.org/Google 允许的;
 * 两个 script 都不产生可见 DOM。
 */
export function SiteJsonLd({ siteUrl }: { siteUrl: string }) {
  return (
    <>
      <JsonLd data={organizationJsonLd(siteUrl)} />
      <JsonLd data={websiteJsonLd(siteUrl)} />
    </>
  );
}
