/** Node-only destination resolution. See docs/market-localization.md for trust and precedence. */
import { createCountryLookup } from "./geo-database";
import { isIP } from "node:net";
import { env } from "./env";
import {
  countryFromLanguage,
  countryFromTimeZone,
  normalizeMarketCountry,
  parseMarketCookie,
  type BrowserMarketHints,
  type MarketPreference,
} from "./market";

const lookupCountry = createCountryLookup(env.GEOIP_COUNTRY_DATABASE ?? "");
export const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-geo-country",
  "x-forwarded-country",
] as const;
const NON_COUNTRY_CODES = new Set(["XX", "T1", "T2", "A1", "A2", "O1", "EU", "AP", "ZZ"]);
export type HeaderLookup = Headers | Record<string, string | string[] | undefined>;
function readHeader(headers: HeaderLookup, name: string): string | undefined {
  if (typeof (headers as Headers).get === "function")
    return (headers as Headers).get(name) ?? undefined;
  const rec = headers as Record<string, string | string[] | undefined>;
  const raw = rec[name] ?? rec[name.toUpperCase()] ?? rec[name.replace(/-/g, "_").toUpperCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}
function publicIp(value?: string): string | undefined {
  const ip = value?.trim().replace(/^::ffff:/i, "");
  if (!ip || !isIP(ip)) return undefined;
  if (/^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(ip))
    return undefined;
  if (/^(?:::|fc|fd|fe[89ab])/i.test(ip) || ip === "::1") return undefined;
  return ip;
}
export interface CountryDecision extends MarketPreference {
  persisted: boolean;
  candidates: { header: string; value: string }[];
  fallback: string;
  ipSource: string | null;
  header: string | null;
}
export function pickCountry(headers: HeaderLookup): string {
  return countryDecision(headers).country;
}
export function countryDecision(
  headers: HeaderLookup,
  hints?: BrowserMarketHints,
): CountryDecision {
  const candidates = COUNTRY_HEADERS.flatMap((header) => {
    const raw = readHeader(headers, header);
    return raw === undefined
      ? []
      : [{ header, value: /^[a-z0-9\s]{0,8}$/i.test(raw) ? raw.trim().toUpperCase() : "invalid" }];
  });
  const base = { candidates, fallback: "US", ipSource: null, header: null, persisted: false };
  const saved = parseMarketCookie(readHeader(headers, "cookie"));
  if (saved) return { ...base, ...saved, persisted: true };
  const trusted = env.GEO_TRUSTED_COUNTRY_HEADER;
  if (trusted && (COUNTRY_HEADERS as readonly string[]).includes(trusted)) {
    const country = normalizeMarketCountry(readHeader(headers, trusted));
    if (country) return { ...base, country, source: "header", header: trusted };
  }
  // The public Nginx ingress overwrites X-Real-IP. XFF is a compatibility path
  // for trusted deployments that supply no X-Real-IP; never choose XFF over it.
  const real = readHeader(headers, "x-real-ip");
  const ipSource = real ? "x-real-ip" : "x-forwarded-for";
  const ip = publicIp(real || readHeader(headers, "x-forwarded-for")?.split(",")[0]);
  if (ip) {
    try {
      const country = lookupCountry(ip);
      if (country) return { ...base, country, source: "ip", ipSource };
    } catch {
      /* Continue with weaker hints instead of failing commerce. */
    }
  }
  const timeZone = hints?.timeZone;
  const fromZone = countryFromTimeZone(timeZone);
  if (fromZone) return { ...base, country: fromZone, source: "timezone", timeZone };
  const languages = hints?.languages?.length
    ? hints.languages
    : (readHeader(headers, "accept-language") ?? []);
  const fromLanguage = countryFromLanguage(languages);
  if (fromLanguage) return { ...base, country: fromLanguage, source: "language" };
  return { ...base, country: "US", source: "default" };
}

/** 探测区域限定用的国家列表:优先 SHOPIFY_REGIONS,否则用内置默认。 */
export function parseRegionList(raw: string | undefined, fallback: readonly string[]): string[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s) && !NON_COUNTRY_CODES.has(s));
  const list = [...new Set(parsed)];
  return list.length > 0 ? list : [...fallback];
}

/**
 * UK 不是 ISO-3166 码(GB 才是),但设计稿、文案和人工标注里都习惯写 UK。
 * 统一归一到 GB,这样 `badge: "UK"` 这种历史数据也能正确出旗和出文案。
 */
export function normalizeCountryCode(code: string): string {
  const cc = code.trim().toUpperCase();
  return cc === "UK" ? "GB" : cc;
}

/**
 * ISO-3166 alpha-2 → 国旗 emoji(用区域指示符号按字母推导,不需要查表)。
 * "US" → 🇺🇸。非字母会得到空串。
 */
export function flagEmoji(code: string): string {
  const cc = normalizeCountryCode(code);
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)));
}

/**
 * 区域限定徽章文案。设计稿只画了美国/英国两种,这里把两种的措辞保留为
 * 特例(U.S. / UK,和 PSD 完全一致),其余国家用 Intl.DisplayNames 取
 * 本地化国名 —— 这样新增区域不用改代码。
 */
export function regionBadgeLabel(code: string, locale = "en"): string {
  return `AVAILABLE IN ${regionName(code, locale)} ONLY`;
}

/**
 * 窄屏用的短徽章文案("🇺🇸 US ONLY")。
 *
 * 商品卡在 375px 下宽 163.5px、可用文字区更窄,完整句
 * "AVAILABLE IN THE U.S. ONLY" 在 11px 下约 190px —— 每一种国家都折 2 行
 * (方案 #4/#18/#27)。短文案改用 ISO 码:美国/英国沿用 PSD 的 US / UK 措辞
 * (GB 归一成 UK,与完整句的 "THE UK" 一致),不做本地化 —— 国家码是全球通用缩写。
 */
export function regionBadgeShortLabel(code: string): string {
  const cc = normalizeCountryCode(code);
  const short: Record<string, string> = { US: "US", GB: "UK" };
  return `${short[cc] ?? cc} ONLY`;
}

/** 徽章里的地区名:美/英沿用 PSD 措辞,其余走 Intl.DisplayNames 本地化国名。 */
function regionName(code: string, locale = "en"): string {
  const cc = normalizeCountryCode(code);
  const special: Record<string, string> = { US: "THE U.S.", GB: "THE UK" };
  let name = special[cc];
  if (!name) {
    try {
      // style:"short" —— 否则 HK 会输出 "Hong Kong SAR China",做成徽章太长。
      const dn = new Intl.DisplayNames([locale === "zh" ? "zh" : "en"], {
        type: "region",
        style: "short",
      });
      name = (dn.of(cc) ?? cc).toUpperCase();
    } catch {
      name = cc;
    }
  }
  return name;
}
