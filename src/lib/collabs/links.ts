function allowedProtocol(url: URL, site: URL) {
  return (
    url.protocol === "https:" ||
    (url.origin === site.origin &&
      site.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname))
  );
}
const privatePath = /^\/(?:admin|api|r|discount|_next)(?:\/|$)/i;
function decodedPath(path: string) {
  let decoded = path;
  for (let i = 0; i < 4; i++) {
    const next = decodeURIComponent(decoded);
    if (next === decoded) return decoded;
    decoded = next;
  }
  throw new Error("invalid_storefront_target");
}
export function safeStorefrontTarget(target: string): string {
  const decoded = decodedPath(target.split(/[?#]/)[0]);
  if (
    !target.startsWith("/") ||
    /[\\\r\n\x00]/.test(target + decoded) ||
    decoded.startsWith("//") ||
    privatePath.test(decoded)
  )
    throw new Error("invalid_storefront_target");
  const url = new URL(target, "https://offy.invalid");
  if (url.origin !== "https://offy.invalid") throw new Error("invalid_storefront_target");
  return target;
}
export function officialLink(value: string, siteUrl: string): string {
  const url = new URL(value),
    origin = new URL(siteUrl);
  if (
    !allowedProtocol(url, origin) ||
    url.origin !== origin.origin ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("invalid_official_link");
  const path = decodedPath(url.pathname);
  if (/^\/discount\/[^/]+$/.test(path)) {
    safeStorefrontTarget(url.searchParams.get("redirect") || "/");
  } else {
    safeStorefrontTarget(url.pathname + url.search);
    if (!url.searchParams.get("dt_id")) throw new Error("official_tracking_required");
  }
  return url.toString();
}

/** Resolve only this shop's official personalized redirect, keeping its tracking values intact. */
export async function resolveOfficialLink(
  value: string,
  siteUrl: string,
  shopDomain: string,
  lookup: (path: string) => Promise<string | null>,
) {
  const source = new URL(value),
    site = new URL(siteUrl);
  const allowed = new Set([site.host, shopDomain]);
  if (
    !allowedProtocol(source, site) ||
    !allowed.has(source.host) ||
    source.username ||
    source.password ||
    source.hash
  )
    throw new Error("invalid_official_link");
  let target = new URL(source.pathname + source.search, site);
  if (!source.pathname.startsWith("/discount/") && !source.searchParams.get("dt_id")) {
    safeStorefrontTarget(source.pathname);
    const redirect = await lookup(source.pathname + source.search);
    if (!redirect) throw new Error("official_redirect_missing");
    const resolved = new URL(redirect, site);
    if (
      !allowed.has(resolved.host) ||
      !allowedProtocol(resolved, site) ||
      resolved.username ||
      resolved.password
    )
      throw new Error("invalid_official_link");
    target = new URL(resolved.pathname + resolved.search, site);
    if (!target.searchParams.get("dt_id")) throw new Error("official_tracking_required");
  }
  return officialLink(target.toString(), siteUrl);
}
