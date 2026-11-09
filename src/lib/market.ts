/** Client-safe destination contracts. No IP lookup, credentials or commercial snapshots. */
import geography from "./data/market-geography.json";

export const MARKET_COOKIE = "offy.market.v1";
export const MARKET_REVIEW_BAG = "offy.market.review-bag.v1";
export type MarketSource = "manual" | "header" | "ip" | "timezone" | "language" | "default";
export interface MarketPreference {
  country: string;
  source: MarketSource;
  timeZone?: string;
  language?: string;
}
export interface BrowserMarketHints {
  timeZone?: string;
  languages?: string[];
}
export interface MarketCountry {
  code: string;
  name: string;
  currency: string;
}
export interface MarketState extends MarketPreference {
  persisted: boolean;
  countries: MarketCountry[] | null;
}
const countries = new Set(geography.countries);
const sources = new Set<MarketSource>([
  "manual",
  "header",
  "ip",
  "timezone",
  "language",
  "default",
]);

export function normalizeMarketCountry(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  const country = normalized === "UK" ? "GB" : normalized;
  return countries.has(country) ? country : undefined;
}
export function countryFromTimeZone(value?: string): string | undefined {
  if (!value || value.length > 100) return undefined;
  return Object.hasOwn(geography.timeZones, value)
    ? (geography.timeZones as Record<string, string>)[value]
    : undefined;
}
export function countryFromLanguage(value: string | readonly string[]): string | undefined {
  const entries = (typeof value === "string" ? value.split(",") : value).slice(0, 20);
  const choices = entries
    .map((entry, i) => {
      const [locale, ...parameters] = entry.trim().split(";");
      const weight = parameters.find((p) => p.trim().startsWith("q="));
      const q = weight ? Number(weight.trim().slice(2)) : 1;
      return { locale, q, i };
    })
    .filter(({ q }) => Number.isFinite(q) && q > 0 && q <= 1)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { locale } of choices) {
    if (locale.length > 100) continue;
    try {
      const country = normalizeMarketCountry(new Intl.Locale(locale).region);
      if (country) return country;
    } catch {
      /* Invalid or nonregional language is not a country. */
    }
  }
  return undefined;
}
export function parseMarketCookie(cookie: string | null | undefined): MarketPreference | undefined {
  const value = cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${MARKET_COOKIE}=`))
    ?.slice(MARKET_COOKIE.length + 1);
  if (!value || value.length > 1200) return undefined;
  try {
    const p = JSON.parse(decodeURIComponent(value)) as Partial<MarketPreference> | null;
    if (!p || typeof p !== "object") return undefined;
    const country = normalizeMarketCountry(p.country);
    if (!country || !p.source || !sources.has(p.source)) return undefined;
    return {
      country,
      source: p.source,
      ...(typeof p.timeZone === "string" && countryFromTimeZone(p.timeZone)
        ? { timeZone: p.timeZone }
        : {}),
      ...(typeof p.language === "string" && p.language.length <= 100
        ? { language: p.language }
        : {}),
    };
  } catch {
    return undefined;
  }
}
export function serializeMarketCookie(preference: MarketPreference): string {
  return encodeURIComponent(JSON.stringify(preference));
}
export function marketCountryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region", style: "short" }).of(code) ?? code;
  } catch {
    return code;
  }
}
