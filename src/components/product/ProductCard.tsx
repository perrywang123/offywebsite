import Image from "next/image";
import { flagEmoji, regionBadgeLabel } from "@/lib/geo";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/pricing";

export function ProductCard({
  product,
  locale,
  sizes = "(max-width: 768px) 50vw, 33vw",
  caption = "name",
}: {
  product: Product;
  locale: string;
  sizes?: string;
  /** name: 显示产品名(默认);code: 按设计稿显示款号(首页曝光造型卡)。 */
  caption?: "name" | "code";
}) {
  // 保持无 hook(可被 Server Component 直接渲染,如 page.tsx / ProductGrid.tsx):
  // 这两处是已登记在双语对象里的短文案,不经过 next-intl 的 t(),
  // 但值本身与 messages.json 的 home.revealing / home.newsBadge 保持一致维护。
  const localizedName = locale === "zh" ? product.name.zh : product.name.en;
  // caption="code" 场景(如首页"区域限定"/"产品汇总"圆形名册)展示的是给人看的
  // 商品编码:优先取 Shopify 实时 SKU(skuCode),未设置时回退 code(= handle)。
  const name = caption === "code" ? (product.skuCode ?? product.code) : localizedName;
  const secondImage = product.images[1];
  const revealLabel = locale === "zh" ? "待揭晓" : "Revealing soon";
  const badgeLabel = locale === "zh" ? "新品上市" : "New in";
  // 价格按**访客所在市场**的币种格式化:同一个商品在美国是 $49.90、英国是
  // £37.90、香港是 HK$369.00(金额与币种都来自 Shopify 的 @inContext 查询),
  // 所以必须把 product.currency 一起传给格式化函数,不能再写死 USD。
  // 两处价格展示(caption="code" 与默认)统一走同一套格式化逻辑。
  const price = formatPrice(product.priceCents, product.currency, locale);

  return (
    <div className="group">
      <Link
        href={`/products/${product.code}`}
        className="relative block aspect-[4/5] overflow-hidden bg-cream-deep"
      >
        {/* 主图（hover 时淡出，若有第二图） */}
        <Image
          src={product.images[0]}
          alt={name}
          fill
          sizes={sizes}
          className={`scale-[1.01] object-cover transition-all duration-500 ease-editorial group-hover:scale-105 ${
            secondImage ? "group-hover:opacity-0" : ""
          }`}
        />
        {/* 第二图（hover 交叉淡入） */}
        {secondImage && (
          <Image
            src={secondImage}
            alt={name}
            fill
            sizes={sizes}
            className="scale-105 object-cover opacity-0 transition-opacity duration-500 ease-editorial group-hover:opacity-100"
          />
        )}

        {product.featured && (
          <span className="absolute left-0 top-0 bg-cream px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[var(--tracking-14)] text-ink">
            {badgeLabel}
          </span>
        )}

        {/* 区域限定徽章(设计稿:红底,右上)。badge 现在是访客所在国家的
            ISO 码,不再只认 US/GB —— 国旗按字母推导,国名走 Intl.DisplayNames,
            美国/英国保留 PSD 里的 U.S. / UK 措辞。 */}
        {product.badge && (
          <span className="absolute right-2 top-2 flex items-center gap-1 bg-[#c8102e] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
            <span aria-hidden>{flagEmoji(product.badge)}</span>
            {regionBadgeLabel(product.badge, locale)}
          </span>
        )}

        {/* hover 上滑信息条 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-4 items-end justify-between gap-3 bg-gradient-to-t from-ink/70 to-transparent p-4 text-cream opacity-0 transition-all duration-500 ease-editorial group-hover:translate-y-0 group-hover:opacity-100">
          <h3 className="truncate text-xs font-medium uppercase tracking-[var(--tracking-06)]">{name}</h3>
          <span className="shrink-0 text-xs tabular-nums">
            {product.isUpcoming ? revealLabel : price}
          </span>
        </div>
      </Link>

      {/* 常显极简信息（无 hover 设备可读） */}
      <div className="flex items-baseline justify-between gap-3 pt-3">
        <Link href={`/products/${product.code}`} className="min-w-0">
          <h3 className="truncate text-sm font-medium text-ink md:text-base">{name}</h3>
        </Link>
        <span className="shrink-0 text-sm text-ink-soft tabular-nums">
          {product.isUpcoming ? revealLabel : price}
        </span>
      </div>
    </div>
  );
}
