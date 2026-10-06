import { env } from "../../lib/env";
import { parseRegionList } from "../../lib/geo";
import { listShopifyProducts, type ShopifyListItem } from "../shopify/catalog";

/**
 * 区域限定(regional exclusives)—— 路线 A:按**访客所在国家**展示。
 *
 * Shopify 侧的区域限定不是 tag 也不是 metafield(实测该店 tags 全空、Admin
 * token 也读不到 metafield),而是**只把商品发布到某些 Market**。所以判定办法是
 * 拿同一份 Storefront 查询换不同 `@inContext(country:)` 跑一遍,谁在哪些国家
 * 出现就是它的可见范围 —— 这正是本模块做的事。
 *
 * 实测该店:37 个商品里 6 个是区域限定,例如 COLD KITTEN 仅 US、NOIR 仅 GB、
 * BOOTS 仅 HK、POLKA CHIC 恰好排除 US/GB/AU/HK。
 *
 * 成本:regionCodes() 里每个国家一次查询。探测窗口给 1h(区域划分极少变),
 * 每个国家的缓存键互不相同,不会和主目录的 60s 缓存串味。
 */

/** 公告栏主推的 6 个市场 + 常见海外市场;可用 SHOPIFY_REGIONS 覆盖。 */
export const DEFAULT_REGIONS = [
  "US",
  "CA",
  "GB",
  "SG",
  "HK",
  "MY",
  "AU",
  "JP",
  "KR",
  "DE",
  "FR",
  "TW",
] as const;

/** 区域划分变化很慢,探测结果缓存 1 小时。 */
const REGION_PROBE_REVALIDATE_SECONDS = 3600;

export function regionCodes(): string[] {
  return parseRegionList(env.SHOPIFY_REGIONS, DEFAULT_REGIONS);
}

export interface RegionalItem extends ShopifyListItem {
  /** 该商品能被看到的全部已探测国家(升序)。 */
  countries: string[];
}

/** handle → 可见国家集合,以及本次真正探测成功、可用于判定的国家集合。 */
export interface VisibilityIndex {
  byHandle: Map<string, Set<string>>;
  /** 只有查询成功的国家才参与判定,避免某国超时被误判成"该国买不到"。 */
  probed: string[];
}

/**
 * 并发按国家拉一次全量商品清单,汇总成「商品 → 可见国家」索引。
 * 某个国家失败不影响其它国家,只是不参与判定。
 */
export async function getVisibilityIndex(countries: string[]): Promise<VisibilityIndex> {
  const results = await Promise.all(
    countries.map(async (c) => {
      try {
        return [c, await listShopifyProducts(fetch, c, REGION_PROBE_REVALIDATE_SECONDS)] as const;
      } catch {
        return [c, null] as const;
      }
    }),
  );

  const byHandle = new Map<string, Set<string>>();
  const probed: string[] = [];
  for (const [country, items] of results) {
    if (!items) continue;
    probed.push(country);
    for (const item of items) {
      const set = byHandle.get(item.handle) ?? new Set<string>();
      set.add(country);
      byHandle.set(item.handle, set);
    }
  }
  return { byHandle, probed };
}

/**
 * 访客所在国家能看到的**区域限定款**:
 * 该国可见,且并非在所有已探测国家都可见。
 *
 * 注意这里直接按访客国家查一次 Storefront(而不是复用默认市场的结果)——
 * 否则像 NOIR 这种"仅 GB"的商品在美国上下文里根本不会返回。
 */
export async function getRegionalProducts(country: string): Promise<RegionalItem[]> {
  const codes = regionCodes();
  const cc = country.trim().toUpperCase();
  // 访客国家不在探测列表里时临时补进去,否则无从判断它是不是"限定"。
  const scope = codes.includes(cc) ? codes : [...codes, cc];

  const [{ byHandle, probed }, mine] = await Promise.all([
    getVisibilityIndex(scope),
    listShopifyProducts(fetch, cc).catch(() => [] as ShopifyListItem[]),
  ]);

  // 至少要有两个国家探测成功,"限定"才有意义。
  if (probed.length < 2) return [];

  return mine
    .map((item) => {
      const seen = byHandle.get(item.handle);
      if (!seen || seen.size === 0) return null;
      // 所有已探测国家都能买到 → 不是限定款。
      if (seen.size >= probed.length) return null;
      return { ...item, countries: [...seen].sort() };
    })
    .filter((x): x is RegionalItem => x !== null);
}
