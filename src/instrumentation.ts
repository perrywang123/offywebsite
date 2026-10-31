import { env, isShopifyConfigured } from "./lib/env";
/** Startup diagnostic; never print token values. The app keeps brand pages available. */
export function register() {
  if (!isShopifyConfigured())
    console.error(
      "Shopify configuration missing: commerce will show a retry state and checkout will be unavailable.",
    );
  if (env.SITE_URL.includes("localhost") && env.NODE_ENV === "production")
    console.error("SITE_URL points to localhost: configure the public origin before deployment.");
}
