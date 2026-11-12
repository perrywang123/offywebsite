/** Paste into Meta's URL parameters field; Meta resolves these IDs at delivery. */
export const metaUrlParameters =
  "utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.id}}&utm_content={{ad.id}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}";
export function buildMetaLink(destination: string, siteOrigin: string) {
  const origin = new URL(siteOrigin),
    url = new URL(destination, origin);
  if (
    url.origin !== origin.origin ||
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    /^\/(?:admin|api|checkout|r)(?:\/|$)/i.test(decodeURIComponent(url.pathname))
  )
    throw new Error("invalid_ad_destination");
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "campaign_id",
    "adset_id",
    "ad_id",
  ])
    url.searchParams.delete(key);
  const prefix = url.origin + url.pathname + (url.search ? url.search + "&" : "?");
  return prefix + metaUrlParameters + url.hash;
}
