/**
 * 访客国家判定(纯函数,无副作用,便于单测)。
 *
 * 站点自身不做 GeoIP:国家信息由**前置层**注入请求头,按优先级依次尝试:
 *   cf-ipcountry        Cloudflare(最省事:域名接入 CF 即自动带上)
 *   x-vercel-ip-country Vercel
 *   x-country-code      通用 CDN / nginx GeoIP2($geoip2_data_country_code)
 *   x-geo-country       Cloudflare Worker / 自建网关常用别名
 *   x-forwarded-country 兜底别名
 * 都拿不到时回落到 `SHOPIFY_MARKET_COUNTRY`(默认 US)—— 也就是"按美国市场展示",
 * 与本次改造前的行为一致,不会因为缺头而白屏。
 *
 * 见 deploy/nginx.conf 里注释掉的 GeoIP2 配置:裸 VPS 上想让 route A 生效,
 * 要么把域名挂到 Cloudflare,要么按那段注释给 nginx 加 GeoIP2 模块。
 */

/** 依次尝试的请求头(小写)。 */
export const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-geo-country",
  "x-forwarded-country",
] as const;

/**
 * 会被这些头拿来当"国家"用的非国家值,必须排除:
 * XX = Cloudflare 的未知占位,T1 = Tor 出口,A1/A2 = 匿名代理,O1 = 卫星,
 * EU/AP 等是洲际码而非国家码。
 */
const NON_COUNTRY_CODES = new Set(["XX", "T1", "T2", "A1", "A2", "O1", "EU", "AP", "ZZ"]);

export type HeaderLookup = Headers | Record<string, string | string[] | undefined>;

function readHeader(headers: HeaderLookup, name: string): string | undefined {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }
  const rec = headers as Record<string, string | string[] | undefined>;
  const raw = rec[name] ?? rec[name.toUpperCase()] ?? rec[name.replace(/-/g, "_").toUpperCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** 选出可用的两字母国家码;拿不到就返回 `fallback`(大写归一)。 */
export function pickCountry(headers: HeaderLookup, fallback = "US"): string {
  for (const name of COUNTRY_HEADERS) {
    const v = readHeader(headers, name)?.trim().toUpperCase();
    if (v && /^[A-Z]{2}$/.test(v) && !NON_COUNTRY_CODES.has(v)) return v;
  }
  const fb = fallback.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(fb) && !NON_COUNTRY_CODES.has(fb) ? fb : "US";
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
  return `AVAILABLE IN ${name} ONLY`;
}
