export const LANDING_COOKIE = "offy_landing_visitor";
export const LANDING_RETENTION_DAYS = 90;
export function isLandingPath(path: string) {
  try {
    const url = new URL(path, "https://offy.invalid");
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      url.origin !== "https://offy.invalid" ||
      url.search ||
      url.hash ||
      /[\\\r\n\x00]/.test(path)
    )
      return false;
    const decoded = decodeURIComponent(url.pathname).replace(/^\/(?:en|zh)(?=\/|$)/, "");
    return !/^\/(?:admin|api|r|discount|_next|cart|checkout|account|__shopify)(?:\/|$)/i.test(
      decoded,
    );
  } catch {
    return false;
  }
}
