/**
 * 访客国家判定。
 *
 * 站点按访客国家决定两件事:展示哪些「区域限定」商品、以及用什么币种显示价格。
 * 国家来源分两层,顺序如下:
 *
 * 1) **前置层注入的国家头**(优先,想让 nginx/CDN 覆盖判定时用它):
 *      cf-ipcountry        Cloudflare(域名接入 CF 即自动带上)
 *      x-vercel-ip-country Vercel
 *      x-country-code      通用 CDN / nginx GeoIP2($geoip2_data_country_code)
 *      x-geo-country       Cloudflare Worker / 自建网关常用别名
 *      x-forwarded-country 兜底别名
 *
 * 2) **应用自己按客户端 IP 解析**(2026-10 新增):一个头都拿不到时,取
 *    `x-forwarded-for` 的第一个地址(否则 `x-real-ip`)交给 `geoip-lite`。
 *    数据打包在 npm 包里(约 115MB,随包发布),所以**不需要 MaxMind 账号、
 *    不需要给 nginx 装 GeoIP2 模块、也不需要 Cloudflare** —— 部署完就能用。
 *    私有/回环地址、畸形 IP、库异常一律静默跳过,继续往下走。
 *
 * 都拿不到时回落到 `SHOPIFY_MARKET_COUNTRY`(默认 US)—— 也就是"按美国市场展示",
 * 与本次改造前的行为一致,不会因为缺头而白屏。
 *
 * ⚠️ 这个模块现在依赖 `geoip-lite`(进程启动时同步读入 ~115MB 数据库,只应跑在
 * 服务端)。**不要从客户端组件(`"use client"`)里 import 它**,连 `flagEmoji` /
 * `regionBadgeLabel` 这种纯函数也不行 —— 那会把整个地理库拖进 client bundle。
 * 调用方全是服务端(页面 / route handler / server 目录)。
 * 打包侧还有两处必要配置(Turbopack 外部化 + standalone 带上数据文件),
 * 见 next.config.ts 里 `serverExternalPackages` / `outputFileTracingIncludes` 的注释。
 */

import geoip from "geoip-lite";

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

/**
 * 归一化成可用的两字母国家码,拿不到(空 / 非两位字母 / 洲际码 / XX、T1 之类的
 * 哨兵值)返回 undefined。**所有来源都必须过这一关**,否则 UK 会原样透传给
 * Shopify Markets 并让它落回默认市场。
 */
function asCountryCode(value: string | undefined): string | undefined {
  const v = value?.trim().toUpperCase();
  // 归一化(UK→GB 等):Shopify Markets 只认 ISO-3166 alpha-2,"UK" 这种
  // 常见但非标准的写法会让 @inContext 落回默认市场,区域限定区块会整个消失。
  if (v && /^[A-Z]{2}$/.test(v) && !NON_COUNTRY_CODES.has(v)) return normalizeCountryCode(v);
  return undefined;
}

/**
 * 访客的客户端 IP。`x-forwarded-for` 是代理链("客户端, 中间代理, ..."),
 * nginx 的 `$proxy_add_x_forwarded_for` 也是把自己**追加**在后面,所以第一个
 * 才是访客;整串丢给地理库会解析失败。没有 XFF 时退到 `x-real-ip`。
 */
function clientIp(headers: HeaderLookup): string | undefined {
  const first = readHeader(headers, "x-forwarded-for")?.split(",")[0]?.trim();
  if (first) return first;
  return readHeader(headers, "x-real-ip")?.trim() || undefined;
}

/**
 * 用本地地理库把 IP 解析成国家码。私有段/回环/畸形 IP 与库内无记录时
 * geoip-lite 返回 null → undefined;库本身抛错(例如数据文件没打进镜像)
 * 也吞掉 —— 判不出国家只该回落默认市场,不该让整个请求 500。
 */
function countryFromIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  try {
    return asCountryCode(geoip.lookup(ip)?.country);
  } catch {
    return undefined;
  }
}

/** 选出可用的两字母国家码;拿不到就返回 `fallback`(大写归一)。 */
export function pickCountry(headers: HeaderLookup, fallback = "US"): string {
  for (const name of COUNTRY_HEADERS) {
    const code = asCountryCode(readHeader(headers, name));
    if (code) return code;
  }
  // 没有国家头 → 自己按客户端 IP 解析(裸 nginx / 无 CDN 的部署靠这一步)。
  const fromIp = countryFromIp(clientIp(headers));
  if (fromIp) return fromIp;
  return asCountryCode(fallback) ?? "US";
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
