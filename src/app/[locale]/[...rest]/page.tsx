import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { handleShopifyRedirects } from "@shopify/hydrogen";
import { collabsMode } from "@/server/collabs/mode";
import { storefrontClient } from "@/server/collabs/storefront";
import { env, isShopifyConfigured } from "@/lib/env";
import { safeStorefrontTarget } from "@/lib/collabs/links";
/** Only unmatched public routes may consult Shopify's configured personalized redirects. */
export default async function ShopifyRedirectPage() {
  if (!collabsMode() || !isShopifyConfigured()) notFound();
  const incoming = new Headers(await headers()),
    path = incoming.get("x-offy-request-path");
  if (!path || !path.startsWith("/")) notFound();
  try {
    safeStorefrontTarget(path);
  } catch {
    notFound();
  }
  const request = new Request(new URL(path, env.SITE_URL), { headers: incoming }),
    { client } = storefrontClient(request);
  const result = await handleShopifyRedirects({
    request,
    storefrontClient: client,
    routeTemplates: {
      product: "/products/:productHandle",
      collection: "/collections/:collectionHandle",
      cart: "/cart",
    },
  });
  const location = result?.headers.get("location");
  if (!location) notFound();
  const target = new URL(location, env.SITE_URL);
  if (target.origin !== new URL(env.SITE_URL).origin) notFound();
  try {
    safeStorefrontTarget(target.pathname.replace(/^\/discount\/[^/]+$/, "/") + target.search);
  } catch {
    notFound();
  }
  if (target.pathname + target.search === path) notFound();
  permanentRedirect(target.toString());
}
