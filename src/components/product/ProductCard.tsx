import Image from "next/image";
import { flagEmoji, regionBadgeLabel, regionBadgeShortLabel } from "@/lib/geo";
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
  // 售罄(!available 且不是预告款):列表页此前完全看不出库存,顾客会一路点到
  // 结算才被 400 拦下(方案 P0-3 配套 / R11)。这里只改**呈现**:
  // 图上常显 Sold out、图片变淡、取消图片区跳转;列表层仍不过滤(商家要靠
  // 列表看到哪些下架了)。
  const soldOut = !product.isAvailable && !product.isUpcoming;
  const secondImage = soldOut ? undefined : product.images[1];
  const revealLabel = locale === "zh" ? "待揭晓" : "Revealing soon";
  const badgeLabel = locale === "zh" ? "新品上市" : "New in";
  const soldOutLabel = locale === "zh" ? "已售罄" : "Sold out";
  // 价格按**访客所在市场**的币种格式化:同一个商品在美国是 $49.90、英国是
  // £37.90、香港是 HK$369.00(金额与币种都来自 Shopify 的 @inContext 查询),
  // 所以必须把 product.currency 一起传给格式化函数,不能再写死 USD。
  // 两处价格展示(caption="code" 与默认)统一走同一套格式化逻辑。
  const price = formatPrice(product.priceCents, product.currency, locale);

  const media = (
    <>
      {/* 主图（hover 时淡出，若有第二图） */}
      <Image
        src={product.images[0]}
        alt={name}
        fill
        sizes={sizes}
        className={`ease-editorial scale-[1.01] object-cover transition-all duration-500 group-hover:scale-105 ${
          secondImage ? "group-hover:opacity-0" : ""
        } ${soldOut ? "opacity-60" : ""}`}
      />
      {/* 第二图（hover 交叉淡入）；售罄款不做交叉淡入,避免与"变淡"的透明度打架 */}
      {secondImage && (
        <Image
          src={secondImage}
          alt={name}
          fill
          sizes={sizes}
          className="ease-editorial scale-105 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}

      {/* 售罄胶囊占据左上角:可用性优先于营销标签,所以售罄时不显示 New in */}
      {soldOut && (
        <span className="bg-ink/80 text-cream absolute top-2 left-2 px-3 py-1 text-[11px] font-semibold tracking-[var(--tracking-14)] uppercase">
          {soldOutLabel}
        </span>
      )}

      {product.featured && !soldOut && (
        <span className="bg-cream text-ink absolute top-0 left-0 px-3 py-1.5 text-[11px] font-semibold tracking-[var(--tracking-14)] uppercase">
          {badgeLabel}
        </span>
      )}

      {/* 区域限定徽章(设计稿:红底,右上)。badge 现在是访客所在国家的
          ISO 码,不再只认 US/GB —— 国旗按字母推导,国名走 Intl.DisplayNames,
          美国/英国保留 PSD 里的 U.S. / UK 措辞。
          窄屏(<640px)改用短文案 "US ONLY":完整句在 155.5px 卡宽下每一种
          国家都折 2 行(方案 #4/#18/#27);两段文案里同时只有一段进可访问性树
          —— 短的那段 aria-hidden,完整句在窄屏走 sr-only(sm 起可见)。 */}
      {product.badge && (
        <span className="absolute top-2 right-2 flex max-w-[calc(100%-1rem)] items-center gap-1 overflow-hidden bg-[#c8102e] px-2 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap text-white uppercase">
          <span aria-hidden className="sm:hidden">
            {flagEmoji(product.badge)} {regionBadgeShortLabel(product.badge)}
          </span>
          <span className="sr-only sm:not-sr-only">
            {flagEmoji(product.badge)} {regionBadgeLabel(product.badge, locale)}
          </span>
        </span>
      )}

      {/* hover 上滑信息条 */}
      <div className="from-ink/70 text-cream ease-editorial pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-4 items-end justify-between gap-3 bg-gradient-to-t to-transparent p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
        <h3 className="truncate text-xs font-medium tracking-[var(--tracking-06)] uppercase">
          {name}
        </h3>
        <span className="shrink-0 text-xs tabular-nums">
          {product.isUpcoming ? revealLabel : price}
        </span>
      </div>
    </>
  );

  return (
    <div className="group">
      {soldOut ? (
        // 售罄不提供图片区跳转(方案:移除跳转);下方名称链接仍可进详情页看规格
        <div className="bg-cream-deep relative block aspect-[4/5] overflow-hidden">{media}</div>
      ) : (
        <Link
          href={`/products/${product.code}`}
          className="bg-cream-deep relative block aspect-[4/5] overflow-hidden"
        >
          {media}
        </Link>
      )}

      {/* 常显极简信息（无 hover 设备可读）。
          窄屏改上下两行:价格 HK$369.00 占 71.2px + gap 12px,名称只剩 80.3px,
          33 个英文名里 22 个显示不全(方案 #5/#19/#24/#31)。价格是决策信息,
          不为名称让路,所以让名称独占整行、价格落到第二行;sm 起恢复原样。 */}
      <div className="flex flex-col items-start gap-1 pt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <Link href={`/products/${product.code}`} className="tap-target--quiet min-w-0">
          {/* 窄屏两行完整显示(不再是 truncate 到 80px),sm 起恢复单行截断 */}
          <h3 className="text-ink text-sm leading-snug font-medium max-sm:line-clamp-2 sm:truncate md:text-base">
            {name}
          </h3>
        </Link>
        <span className="text-ink-soft shrink-0 text-sm tabular-nums">
          {product.isUpcoming ? revealLabel : price}
        </span>
      </div>
    </div>
  );
}
