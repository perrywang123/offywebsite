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

/**
 * 已配置的 Shopify 市场。**这份清单就是「目标国」的定义** —— 见
 * `getRegionalProducts` 的门槛:不在这份清单里的访客国家,一律不展示区域限定。
 *
 * 为什么要与店铺的市场配置对齐:区域限定的判定是「某商品不是在所有探测国都可见」,
 * 而**探测范围**由这份清单决定。清单缺了某个真实市场,该国访客就看不到自己的限定款
 * (例如 CN/MO 不在旧清单里时,`boots`(HK/CN/MO 限定)对大陆和澳门访客就不显示)。
 *
 * 反向的问题更严重:曾经对**任何**访客国家都临时补进探测范围,于是伊朗访客会看到
 * "AVAILABLE IN IRAN ONLY" —— 后台根本没配过伊朗,那个徽章是凭空造出来的。
 * 现在非清单内的国家直接返回空,不再凭空判定。
 *
 * 可用 SHOPIFY_REGIONS 覆盖(逗号分隔)。
 */
export const DEFAULT_REGIONS = [
  // 公告栏主推
  "US", "CA", "GB", "AU", "NZ", "SG", "MY", "TH", "HK", "CN",
  // 其它已配置市场
  "TW", "JP", "KR", "MO", "ID", "PH", "VN", "IN", "AE",
  "DE", "FR", "ES", "IT", "NL", "SE", "CH", "BR", "MX", "ZA", "SA",
] as const;

/** 区域划分变化很慢,探测结果缓存 1 小时。 */
const REGION_PROBE_REVALIDATE_SECONDS = 3600;

/** 允许展示区域限定的访客国家。可用 SHOPIFY_TARGET_MARKETS 覆盖。 */
export const DEFAULT_TARGET_MARKETS = ["US", "GB", "SG", "HK"] as const;

export function targetMarkets(): string[] {
  return parseRegionList(env.SHOPIFY_TARGET_MARKETS, DEFAULT_TARGET_MARKETS);
}

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

  // 门槛:访客国家必须在**目标市场白名单**里,否则一律不展示区域限定。
  //
  // 这份白名单与探测范围(codes)是两件事:
  //   · codes  —— 探测"某商品是不是在所有国家都可见",决定它算不算限定款
  //   · 白名单 —— 决定"哪些国家的访客能看到这块内容"
  //
  // 为什么白名单是必需的:商品发布到的是 **Market**,而一个 Market 常含多国。
  // 发布到"新加坡市场"的商品,德国/伊朗/巴西访客同样看得到 —— 于是曾经出现
  // 伊朗访客看到 "AVAILABLE IN IRAN ONLY"(后台从未配置伊朗)。限定是相对
  // 目标市场而言的;对一个我们没有市场的国家,任何判定都是凭空造出来的。
  //
  // 曾经的做法是把访客国家临时补进探测范围,于是任何一个非目标国(例如伊朗)只要
  // 某商品恰好在那里可见、而在别处不可见,就会被判成"该区域限定"并打出
  // "AVAILABLE IN IRAN ONLY" —— 后台从未配置过那个国家,徽章是凭空造出来的。
  // 对没有配置市场的国家,我们根本无从谈"限定",返回空才是诚实的。
  if (!targetMarkets().includes(cc)) return [];

  const scope = codes;

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
