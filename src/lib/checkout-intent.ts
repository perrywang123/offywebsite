export type CheckoutIntent = "cart" | "buy-now";
const STORAGE_KEY = "offy.checkout.intent.v1";

/** This is only a bag-preservation hint, never evidence of payment or attribution. */
export function rememberCheckoutIntent(intent: CheckoutIntent): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, intent);
  } catch {
    // Private browsing/storage denial must not block Shopify checkout.
  }
}

export function preserveBagOnShopifyReturn(source?: string): boolean {
  if (source === "buy-now") return true;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "buy-now";
  } catch {
    return false;
  }
}

export function shopifyCheckoutReturnUrl(site: string, path: string, intent?: CheckoutIntent) {
  return `${site}${path}${intent === "buy-now" ? "?source=buy-now" : ""}`;
}
