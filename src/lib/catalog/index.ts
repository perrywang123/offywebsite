import { productHandleAliases } from "./brand";
export { productHandleAliases, upcomingIps, collabLooks, teaserSeries } from "./brand";
export { seriesList, MERCH_SERIES_SLUG, merchSeriesName, seriesMap } from "./series";
export type {
  Product,
  ProductSeries,
  MerchSeriesSlug,
  Series,
  SeriesSlug,
  LocalizedString,
  Dimensions,
} from "./types";
export type { UpcomingIp } from "./brand";
/**
 * 商品改过 handle 时,把旧 handle 解析成当前 handle(详情页据此 308 跳转)。
 * 大小写不敏感,未命中返回 undefined。
 */
export function getProductHandleAlias(code: string): string | undefined {
  return productHandleAliases[code.toLowerCase()];
}
