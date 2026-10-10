import type { Product } from "../../lib/catalog";
import { fetchProductData, type ShopifyProductData } from "../shopify/products";

type ProductFetcher = (handle: string) => Promise<ShopifyProductData | null>;

/**
 * Field-level hybrid enrichment: when a product has a `shopifyVariantId`, its
 * displayed title/description/images/price are overridden by Shopify data.
 * Unmapped products, or any Shopify failure, fall back to local catalog values
 * so the storefront always renders.
 *
 * 价格语义与实时目录层(`live.ts` 的 `resolvePrice`)保持一致:Shopify 返回的
 * 「金额 + 币种」一并采用。旧实现写的是"只有确认是 USD 才覆盖,否则保留本地
 * 美元价",这会把访客市场的英镑/港币金额丢掉、退回美元显示(币种串味)。
 *
 * ⚠️ 本模块当前**没有生产调用方**(展示与结算统一走 `server/catalog/live.ts` 的
 * `getLive*`),保留它是为了那些已接入 `shopifyVariantId` 的老路径。若要重新启用,
 * 必须把 `country` 一路传下来(签名已支持),否则会退回默认市场(US)的币种。
 *
 * NOTE: Shopify products are single-language here: the Shopify title overrides
 * the EN name, while the ZH name stays as the local direct-translation
 * placeholder. True bilingual sync (@inContext language) is a future step once
 * Shopify translations (Translate & Adapt) are configured.
 */
export async function enrichProduct(
  product: Product,
  fetcher: ProductFetcher = (handle) => fetchProductData(handle),
): Promise<Product> {
  if (!product.shopifyHandle) return product;

  try {
    const data = await fetcher(product.shopifyHandle);
    if (!data) return product;

    // Shopify 给了币种就如实采用它的金额与币种(含合法的 0 元款);只有连币种都
    // 没给时才保留本地价,并把币种说明成 USD —— 本地静态表是美元快照。
    const cc = data.currency?.trim().toUpperCase();
    const useLivePrice = Boolean(cc) && /^[A-Z]{3}$/.test(cc) && data.priceCents >= 0;

    return {
      ...product,
      // 英文名以 Shopify 标题为准;中文名保留本地直译占位——后续用户在
      // Shopify(Translate & Adapt)配置中文后,可改走 @inContext(language) 拉取。
      name: {
        en: data.title || product.name.en,
        zh: product.name.zh,
      },
      description: data.description
        ? { en: data.description, zh: data.description }
        : product.description,
      // Shopify 单语言:结构化段落同样中英共用,待 Translate & Adapt 配置后分流。
      descriptionBlocks:
        (data.descriptionBlocks?.length ?? 0) > 0
          ? { en: data.descriptionBlocks!, zh: data.descriptionBlocks! }
          : product.descriptionBlocks,
      images: data.images.length > 0 ? data.images : product.images,
      priceCents: useLivePrice ? data.priceCents : product.priceCents,
      currency: useLivePrice ? cc! : "USD",
    };
  } catch {
    return product;
  }
}

/** Enrich a list; mapped products fetch in parallel, unmapped pass through. */
export async function enrichProducts(
  products: Product[],
  fetcher: ProductFetcher = (handle) => fetchProductData(handle),
): Promise<Product[]> {
  return Promise.all(products.map((p) => enrichProduct(p, fetcher)));
}
