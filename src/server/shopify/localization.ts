import { z } from "zod";
import { normalizeMarketCountry, type MarketCountry } from "@/lib/market";
import { storefrontRequest, validated } from "./storefront";

const country = z.object({
  isoCode: z.string().refine((v) => Boolean(normalizeMarketCountry(v))),
  name: z.string().min(1),
  currency: z.object({ isoCode: z.string().regex(/^[A-Z]{3}$/) }),
});
const schema = z.object({
  localization: z.object({ availableCountries: z.array(country).min(1).max(300) }),
});
/** Current Shopify market settings only; no hardcoded selectable destination/currency list. */
export async function getMarketCountries(
  fetchImpl: typeof fetch = fetch,
): Promise<MarketCountry[]> {
  const raw = await storefrontRequest(
    "market-countries",
    `query MarketCountries @inContext(language: EN) {
    localization { availableCountries { isoCode name currency { isoCode } } }
  }`,
    {},
    fetchImpl,
  );
  const result = validated(schema, raw).localization.availableCountries;
  const priority = ["US", "GB", "SG", "HK"];
  return result
    .map((c) => ({ code: c.isoCode, name: c.name, currency: c.currency.isoCode }))
    .sort((a, b) => {
      const ap = priority.indexOf(a.code),
        bp = priority.indexOf(b.code);
      if (ap >= 0 || bp >= 0) return (ap < 0 ? 4 : ap) - (bp < 0 ? 4 : bp);
      return a.name.localeCompare(b.name, "en");
    });
}
