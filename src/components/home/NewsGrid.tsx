import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { NewsItem } from "@/lib/content";
import { Reveal } from "@/components/Reveal";

export interface NewsGridTexts {
  badge: string;
  featureTitle: string;
  cta: string;
  browseAll: string;
}

/**
 * 最新资讯 · 揭晓 —— 设计稿编辑感不对称布局:
 * 左侧大主卡(新品上市徽章 + 仪式感生活大标题 + 查看详情),
 * 右侧 2×2 四张副卡,底部居中「逛全部系列」。
 */
export function NewsGrid({
  feature,
  items,
  texts,
  locale,
}: {
  /** `productCode` = Shopify handle;跳转目标按 /products/${productCode} 拼接。 */
  feature: { image: string; productCode: string };
  items: NewsItem[];
  texts: NewsGridTexts;
  locale: string;
}) {
  const featureHref = `/products/${feature.productCode}`;
  return (
    <div>
      {/* PSD 比例:主卡 43% / 副卡区 57%(主:副≈1324:1746) */}
      <div className="grid gap-4 lg:grid-cols-[43fr_57fr] lg:gap-6">
        {/* ============ 左:大主卡(整张卡可点击,跳转到绑定的商品详情页) ============ */}
        <Reveal>
          <Link
            href={featureHref}
            className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-cream-deep lg:aspect-auto lg:h-full lg:min-h-[32rem]"
          >
            <Image
              src={feature.image}
              alt={texts.featureTitle}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <span className="inline-block rounded-full bg-cream px-3 py-1 text-[10px] font-semibold uppercase tracking-[var(--tracking-16)] text-ink">
                {texts.badge}
              </span>
              <h3 className="mt-4 font-display text-3xl font-semibold tracking-tight text-cream md:text-5xl">
                {texts.featureTitle}
              </h3>
              <span className="mt-5 inline-flex h-11 items-center justify-center border border-cream px-6 text-xs font-medium uppercase tracking-[var(--tracking-14)] text-cream transition-colors duration-300 group-hover:bg-cream group-hover:text-ink">
                {texts.cta}
              </span>
            </div>
          </Link>
        </Reveal>

        {/* ============ 右:2×2 副卡(每张可点击,跳转到各自绑定的商品详情页) ============ */}
        <div className="grid grid-cols-2 gap-4 lg:gap-6">
          {items.map((item, i) => (
            <Reveal key={item.id} delay={Math.min(i, 3) * 70}>
              <Link href={`/products/${item.productCode}`} className="group block">
                <figure>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-cream-deep">
                    <Image
                      src={item.image}
                      alt={locale === "zh" ? item.title.zh : item.title.en}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
                    />
                  </div>
                  <figcaption className="mt-3 text-sm font-medium text-ink">
                    {locale === "zh" ? item.title.zh : item.title.en}
                  </figcaption>
                </figure>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ============ 逛全部系列 ============ */}
      <Reveal className="mt-10 text-center">
        <Link href="/products" className="link-line text-sm">
          {texts.browseAll} →
        </Link>
      </Reveal>
    </div>
  );
}
