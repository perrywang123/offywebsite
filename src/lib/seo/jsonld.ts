import type { Product } from "@/lib/catalog/types";
import type { FaqBlock, FaqPart } from "@/lib/faq";
import { faqParts } from "@/lib/faq";
import { publicPath } from "@/i18n/routing";

/**
 * Schema.org JSON-LD 构造器(纯函数,无 DOM、无请求)。
 *
 * 页面只负责把数据传进来,自己不长 JSON 字面量:
 *  · 这里集中处理**绝对 URL**(canonical 用 publicPath,SITE_URL 来自 env);
 *  · `offers.price` / `priceCurrency` 一律取渲染该页时的 `product.currency` ——
 *    全站按访客市场定价(US→USD、GB→GBP、HK→HKD…),Google 要求结构化数据里的
 *    价格与用户实际看到的一致,写死 USD 会在非美国市场造成价格不符。
 *  · 输出由 [`JsonLd`](../../components/seo/JsonLd.tsx) 转义后放进 `<script>`。
 */

export const BRAND_NAME = "is.offy";

/** 站点真实存在的品牌 logo(`Header` 也在用同一张图)。 */
export const ORGANIZATION_LOGO_PATH = "/assets/brand/is-offy-logo.png";

/** 品牌官方社交账号(与政策页 `/policies/contact` 里的 Instagram 链接同一地址)。 */
export const ORGANIZATION_SAME_AS = ["https://www.instagram.com/is.offy"] as const;

/** JSON-LD 顶层对象:必须有 @context / @type,其余字段按类型而定。 */
export interface JsonLdObject {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

export interface BreadcrumbEntry {
  name: string;
  /** 站点内部路径(以 `/` 开头)或已经是绝对 URL。 */
  path: string;
}

export interface ProductJsonLdOptions {
  product: Product;
  locale: string;
  siteUrl: string;
}

/** 去掉末尾斜杠,避免 `https://isoffy.com//products` 这类双斜杠。 */
function siteOrigin(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, "");
}

/**
 * 把站内路径变成绝对 URL;已经是 `https://` 的 CDN 图片原样保留。
 *
 * 基线以站点根结尾,这样相对路径不会把最后一段当成目录吃掉。
 */
export function absoluteUrl(siteUrl: string, pathOrUrl: string): string {
  return new URL(pathOrUrl, `${siteOrigin(siteUrl)}/`).toString();
}

function localizedProductName(product: Product, locale: string): string {
  const name = locale === "zh" ? product.name.zh || product.name.en : product.name.en;
  return name || product.code;
}

/**
 * 商品的纯文本描述。展示页优先渲染 `descriptionBlocks`(Shopify
 * descriptionHtml 的段落化结果),所以当 Shopify 只返回结构化段落、没给
 * 纯文本 `description` 时,用块文本拼接而不是留下空字段。
 */
function localizedProductDescription(product: Product, locale: string, fallback: string): string {
  const description =
    locale === "zh" ? product.description.zh || product.description.en : product.description.en;
  if (description.trim()) return description;

  const blocks =
    locale === "zh"
      ? product.descriptionBlocks?.zh?.length
        ? product.descriptionBlocks.zh
        : product.descriptionBlocks?.en
      : product.descriptionBlocks?.en;
  const fromBlocks = blocks
    ?.map((block) => block.text)
    .join("\n")
    .trim();
  return fromBlocks || fallback;
}

/**
 * 商品详情页的 Product + Offer。
 *
 * - `image`:该商品**全部**图片,绝对 URL(本地 `/assets/...` 补站点域名,
 *   Shopify CDN 原样)。
 * - `sku`:商家在 Shopify 后台维护的 variant SKU(`product.skuCode`),没有则
 *   整个字段省略 —— 不拿路由用的 handle 冒充 SKU。
 * - `availability`:实时上下架;`itemCondition` 固定 NewCondition。
 */
export function productJsonLd({ product, locale, siteUrl }: ProductJsonLdOptions): JsonLdObject {
  const url = absoluteUrl(siteUrl, publicPath(locale, `/products/${product.code}`));
  const name = localizedProductName(product, locale);
  const sku = product.skuCode?.trim();

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: product.images
      .filter((image) => image.trim() !== "")
      .map((image) => absoluteUrl(siteUrl, image)),
    description: localizedProductDescription(product, locale, name),
    ...(sku ? { sku } : {}),
    brand: { "@type": "Brand", name: BRAND_NAME },
    offers: {
      "@type": "Offer",
      url,
      // 两位小数是 Schema.org price 的通用写法;金额来自当前市场币种。
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: product.currency,
      availability: product.isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

/** 面包屑(商品页 / 系列页共用)。position 从 1 开始,item 一律绝对 URL。 */
export function breadcrumbJsonLd(
  entries: readonly BreadcrumbEntry[],
  siteUrl: string,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(siteUrl, entry.path),
    })),
  };
}

/** 品牌实体:全站一份(根布局渲染)。 */
export function organizationJsonLd(siteUrl: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: siteOrigin(siteUrl),
    logo: absoluteUrl(siteUrl, ORGANIZATION_LOGO_PATH),
    sameAs: [...ORGANIZATION_SAME_AS],
  };
}

/** 站点实体:全站一份(根布局渲染)。 */
export function websiteJsonLd(siteUrl: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: siteOrigin(siteUrl),
  };
}

/**
 * FAQ 答案的纯文本形式。
 *
 * 数据是 `FaqBlock[]`(段落 → 行内片段,含 `bold`),但 Schema.org 的
 * `acceptedAnswer.text` 是纯文本:只按顺序拼接片段文本(加粗与否不影响文字),
 * 段落之间用换行保留原来的分段。**不要**生成 `<strong>` —— 那会被当成字面量
 * 展示给搜索引擎,而不是强调。
 */
function faqAnswerText(blocks: readonly FaqBlock[]): string {
  return blocks.map((block) => block.map((segment) => segment.text).join("")).join("\n");
}

/** `/faq` 的 FAQPage:三个部分拉平成 10 条 Question(保持文档顺序)。 */
export function faqJsonLd(parts: readonly FaqPart[] = faqParts): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: parts.flatMap((part) =>
      part.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faqAnswerText(item.a),
        },
      })),
    ),
  };
}
