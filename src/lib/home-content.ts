import { z } from "zod";
import { common } from "../../messages/en.json";
import { heroSlides, newsFeature, newsItems, type HeroSlideData } from "./content";
import { getProductHandleAlias } from "./catalog";

export const homeMediaPrefix = "/api/home-media/";
export const homeMediaId = /^[a-f0-9]{64}$/;
export const homeImageByteLimit = 900 * 1024;
export const homeImageMaxEdge = 2560;

function httpsUrl(value: string) {
  if (!value.startsWith("https://") || /[\\\s\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.hostname && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function isDestination(value: string) {
  if (!value.startsWith("/")) return Boolean(httpsUrl(value));
  return (
    !value.startsWith("//") &&
    !/[\\\s\u0000-\u001f\u007f]/.test(value) &&
    !new URL(value, "https://offy.invalid").pathname.startsWith("//")
  );
}

export function isHomeImageSource(value: string) {
  if (value.startsWith(homeMediaPrefix))
    return homeMediaId.test(value.slice(homeMediaPrefix.length));
  if (/^\/assets\/(?:[\w-]+\/)*[\w.-]+\.(?:avif|jpe?g|png|webp)$/i.test(value)) return true;
  const url = httpsUrl(value);
  return url?.hostname === "cdn.shopify.com" && !url.port;
}

const image = z
  .string()
  .trim()
  .max(2048)
  .refine(isHomeImageSource, "请上传图片或填写有效的 Shopify CDN 图片地址");
const requiredHref = z
  .string()
  .trim()
  .max(2048)
  .refine(isDestination, "请输入站内路径或 HTTPS 链接");
const optionalHref = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !value || isDestination(value), "请输入站内路径或 HTTPS 链接");
const launchHandle = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,199}$/);
const latestCardFields = {
  image,
  href: requiredHref,
  comingSoon: z.boolean().optional(),
};
const homeContentSchema = z
  .strictObject({
    hero: z
      .array(
        z.strictObject({
          image,
          href: optionalHref,
          alt: z.string().trim().max(160),
          enabled: z.boolean(),
        }),
      )
      .length(heroSlides.length),
    promotion: z.strictObject({
      kicker: z.string().trim().max(100),
      title: z.string().trim().max(160),
    }),
    announcements: z
      .array(
        z
          .strictObject({
            text: z.string().trim().max(180),
            href: optionalHref,
            enabled: z.boolean(),
          })
          .refine((item) => !item.enabled || item.text.length > 0, {
            path: ["text"],
            message: "开启时请填写活动文案",
          }),
      )
      .length(common.promoMessages.length),
    latest: z.strictObject({
      browseHref: requiredHref.default("/products"),
      feature: z.strictObject({ ...latestCardFields, alt: z.string().trim().max(160) }),
      items: z
        .array(
          z.strictObject({
            ...latestCardFields,
            label: z.string().trim().min(1, "请填写按钮文案").max(48),
          }),
        )
        .length(newsItems.length),
    }),
  })
  .superRefine((content, context) => {
    content.hero.forEach((slide, index) => {
      if (slide.enabled && slide.image !== heroSlides[index]?.image && !slide.alt) {
        context.addIssue({
          code: "custom",
          path: ["hero", index, "alt"],
          message: "请填写图片说明",
        });
      }
    });
    const promo = content.hero[1];
    if (promo?.enabled && promo.image === heroSlides[1].image && !content.promotion.title) {
      context.addIssue({ code: "custom", path: ["promotion", "title"], message: "请填写活动标题" });
    }
  });

export const homeContentVersionSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  content: homeContentSchema,
});

export type HomeContent = z.infer<typeof homeContentSchema>;
export type HomeContentVersion = z.infer<typeof homeContentVersionSchema>;

export function defaultHomeContent(): HomeContent {
  const promotion = heroSlides[1].promo!;
  return {
    hero: heroSlides.map((slide) => ({
      image: slide.image,
      href: slide.href ?? "",
      alt: slide.title?.en ?? slide.promo?.kicker.en ?? "is.offy designer plush art toys",
      enabled: true,
    })),
    promotion: { kicker: promotion.kicker.en, title: promotion.text.en },
    announcements: common.promoMessages.map((text) => ({ text, href: "", enabled: true })),
    latest: {
      browseHref: "/products",
      feature: {
        image: newsFeature.image,
        href: `/products/${newsFeature.productCode}`,
        alt: "",
      },
      items: newsItems.map((item) => ({
        image: item.image,
        href: `/products/${item.productCode}`,
        label: item.title.en,
      })),
    },
  };
}

export function configuredHero(content: HomeContent): HeroSlideData[] {
  return heroSlides.flatMap<HeroSlideData>((original, index) => {
    const slide = content.hero[index];
    if (!slide.enabled) return [];
    const href = slide.href || undefined;
    if (slide.image !== original.image) {
      return [{ image: slide.image, imageAlt: slide.alt, bg: "#efefef", href }];
    }
    const promo = original.promo && {
      kicker: { ...original.promo.kicker, en: content.promotion.kicker },
      text: { ...original.promo.text, en: content.promotion.title },
    };
    return [{ ...original, promo, href }];
  });
}

export function homeProductHandle(href: string, siteUrl: string) {
  const site = new URL(siteUrl);
  const target = new URL(href, site);
  if (target.hostname.replace(/^www\./, "") !== site.hostname.replace(/^www\./, "")) return null;
  const match = /^\/(?:en\/|zh\/)?products\/([^/]+)\/?$/.exec(target.pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function homeLaunchHandle(href: string, siteUrl: string) {
  const site = new URL(siteUrl);
  const target = new URL(href, site);
  if (target.protocol !== site.protocol || target.port !== site.port) return null;
  const handle = homeProductHandle(href, siteUrl);
  if (!handle) return null;
  const canonical = getProductHandleAlias(handle) ?? handle;
  return launchHandle.safeParse(canonical).success ? canonical : null;
}
