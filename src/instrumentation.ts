import { env, isShopifyConfigured } from "./lib/env";
/** Startup diagnostic; never print token values. The app keeps brand pages available. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { maintainDiagnostics } = await import("./server/checkout-diagnostics/runtime");
    const timer = setInterval(maintainDiagnostics, 3600_000);
    timer.unref();
  }
  if (!isShopifyConfigured())
    console.error(
      "Shopify configuration missing: commerce will show a retry state and checkout will be unavailable.",
    );
  if (env.SITE_URL.includes("localhost") && env.NODE_ENV === "production")
    console.error("SITE_URL points to localhost: configure the public origin before deployment.");
}
