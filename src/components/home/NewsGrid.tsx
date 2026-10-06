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
 * 最新资讯 · 揭晓(网站文字参考&图片替换/最新资讯.psd,3250×2786)。
 *
 * PSD 布局(左 1 张大主卡 1324×2062 + 右 2×2 四张副卡 827×1007,列宽比
 * 1324:1746 = 43:57,与现网格一致):
 *  - 主卡文字在图片**上方居中**:NEW ARRIVALS(img y6.6%) + ROMANTICIZING
 *    EVERYDAY LIFE(img y12.9%,两行);底部居中黑色胶囊按钮 VIEW DETAILS
 *    (矩形3拷贝6:宽 694/1324=52.4%,高 206/2062=10.0%)。
 *  - 副卡文字**全部移入图片底部居中的黑色胶囊按钮**(矩形3拷贝2..5:
 *    宽 525/827=63.5%,高 135/1007=13.4%),不再有图下方的文字说明。
 *
 * 字号 = PSD 图层 FontSize × transform 缩放,换算成相对所在卡片的 cqw
 * (卡片设 container-type: inline-size,随卡片宽度等比,移动端单列同样成立):
 *    主卡 徽章 63.2/1324=4.77cqw · 大标题 127/1324=9.59cqw · 按钮字 61.6/1324=4.65cqw
 *    副卡 按钮字 40/827=4.84cqw
 * 字色:主卡文字黑(PSD fill 黑)、副卡按钮字白(PSD fill 白)。
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
      {/* PSD 比例:主卡 43% / 副卡区 57%(1324:1746) */}
      <div className="grid gap-4 lg:grid-cols-[43fr_57fr] lg:gap-6">
        {/* ============ 左:大主卡(整张卡可点击,跳转到绑定的商品详情页) ============ */}
        <Reveal>
          <Link
            href={featureHref}
            className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-cream-deep lg:aspect-auto lg:h-full lg:min-h-[32rem]"
            style={{ containerType: "inline-size" }}
          >
            <Image
              src={feature.image}
              alt={texts.featureTitle}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
            />
            {/* PSD:文案压在图片上方、居中(不是左下角),图片本身不加暗渐变 */}
            <div className="absolute inset-x-0 top-0 flex flex-col items-center px-[14%] pt-[6.6%] text-center">
              <span className="text-[4.77cqw] font-normal uppercase leading-none tracking-[var(--tracking-10)] text-ink">
                {texts.badge}
              </span>
              <h3 className="mt-[3.5cqw] font-display text-[9.59cqw] font-semibold uppercase leading-[1.12] tracking-tight text-ink">
                {texts.featureTitle}
              </h3>
            </div>
            {/* PSD 矩形3拷贝6:底部居中黑色胶囊,白字,宽 52.4% 卡宽、高 15.56cqw */}
            <span className="absolute inset-x-0 bottom-[10%] mx-auto flex h-[15.56cqw] w-[52.4%] items-center justify-center rounded-full bg-ink text-[4.65cqw] font-normal uppercase leading-none tracking-[var(--tracking-10)] text-cream">
              {texts.cta}
            </span>
          </Link>
        </Reveal>

        {/* ============ 右:2×2 副卡(每张可点击,跳转到各自绑定的商品详情页) ============ */}
        <div className="grid grid-cols-2 gap-4 lg:gap-6">
          {items.map((item, i) => (
            <Reveal key={item.id} delay={Math.min(i, 3) * 70}>
              <Link
                href={`/products/${item.productCode}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-cream-deep"
                style={{ containerType: "inline-size" }}
              >
                <Image
                  src={item.image}
                  alt={locale === "zh" ? item.title.zh : item.title.en}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
                />
                {/* PSD 矩形3拷贝2..5:文案进底部居中黑色胶囊(原来在图下方/左下角)。
                    PSD 里各胶囊宽度不同(494..566 / 827),是跟着文字宽度走的,
                    所以这里用 w-auto + 左右 9cqw 内边距让胶囊包住文字,避免截断。 */}
                <span className="absolute inset-x-0 bottom-[8.4%] mx-auto flex h-[13.4%] w-auto max-w-[92%] items-center justify-center rounded-full bg-ink px-[9cqw] text-[4.84cqw] font-normal uppercase leading-none tracking-[var(--tracking-10)] text-cream">
                  <span className="whitespace-nowrap">{locale === "zh" ? item.title.zh : item.title.en}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
