/** Regional inferences require complete fresh rosters for every configured probe country. */
import { env } from "../../lib/env";
import { parseRegionList } from "../../lib/geo";
import { listShopifyProducts, type ShopifyListItem } from "../shopify/catalog";

export const DEFAULT_REGIONS = [
  "US",
  "CA",
  "GB",
  "AU",
  "NZ",
  "SG",
  "MY",
  "TH",
  "HK",
  "CN",
  "TW",
  "JP",
  "KR",
  "MO",
  "ID",
  "PH",
  "VN",
  "IN",
  "AE",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "SE",
  "CH",
  "BR",
  "MX",
  "ZA",
  "SA",
] as const;

export const DEFAULT_TARGET_MARKETS = ["US", "GB", "SG", "HK"] as const;

export function targetMarkets(): string[] {
  return parseRegionList(env.SHOPIFY_TARGET_MARKETS, DEFAULT_TARGET_MARKETS);
}

export function regionCodes(): string[] {
  return parseRegionList(env.SHOPIFY_REGIONS, DEFAULT_REGIONS);
}

export interface RegionalItem extends ShopifyListItem {
  countries: string[];
}

export interface VisibilityIndex {
  byHandle: Map<string, Set<string>>;
  probed: string[];
}

export async function getVisibilityIndex(countries: string[]): Promise<VisibilityIndex> {
  const results = await Promise.all(
    countries.map(async (c) => {
      try {
        return [c, await listShopifyProducts(fetch, c)] as const;
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

export async function getRegionalProducts(country: string): Promise<RegionalItem[]> {
  const codes = regionCodes();
  const cc = country.trim().toUpperCase();
  if (!targetMarkets().includes(cc)) return [];

  const scope = codes;

  const [{ byHandle, probed }, mine] = await Promise.all([
    getVisibilityIndex(scope),
    listShopifyProducts(fetch, cc).catch(() => [] as ShopifyListItem[]),
  ]);
  if (probed.length < 2 || probed.length !== scope.length || !scope.includes(cc)) return [];

  return mine
    .map((item) => {
      const seen = byHandle.get(item.handle);
      if (!seen || seen.size === 0) return null;
      if (seen.size >= probed.length) return null;
      return { ...item, countries: [...seen].sort() };
    })
    .filter((x): x is RegionalItem => x !== null);
}
