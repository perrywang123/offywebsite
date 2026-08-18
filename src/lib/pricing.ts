/** Format integer USD cents as a localized currency string. */
export function formatUsdCents(cents: number, locale: string = "en"): string {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Clamp a requested quantity to the allowed checkout range (1–99). */
export function clampQuantity(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(99, Math.max(1, Math.trunc(qty)));
}
