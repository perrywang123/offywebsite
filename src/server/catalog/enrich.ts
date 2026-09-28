import type { Product } from "../../lib/catalog";
import { fetchProductData, type ShopifyProductData } from "../shopify/products";

type ProductFetcher = (handle: string) => Promise<ShopifyProductData | null>;

/**
 * Field-level hybrid enrichment: when a product has a `shopifyVariantId`, its
 * displayed title/description/images/price are overridden by Shopify data.
 * Unmapped products, or any Shopify failure, fall back to local catalog values
 * so the storefront always renders.
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
      // 网站以 USD 展示：仅当 Shopify 价格确实是 USD 时才覆盖(含合法 $0 免费款),
      // 否则保留本地 USD 占位价,避免把 HKD 等非美元金额当作美元显示(币种串味)。
      priceCents:
        data.currency === "USD" && data.priceCents >= 0
          ? data.priceCents
          : product.priceCents,
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
