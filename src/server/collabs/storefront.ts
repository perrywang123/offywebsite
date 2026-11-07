import {
  createShopifyRequestContext,
  createStorefrontClient,
  handleShopifyRoutes,
  type I18nConfig,
} from "@shopify/hydrogen";
import { NextResponse } from "next/server";
import { env, isShopifyConfigured } from "@/lib/env";
import { safeStorefrontTarget } from "@/lib/collabs/links";
import { pickCountry } from "@/lib/geo";
import { collabsMode } from "./mode";
export const DISCOUNT_COOKIE = "offy_collabs_discount";
export function getDiscount(headers: Headers) {
  const value = headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${DISCOUNT_COOKIE}=`))
    ?.slice(DISCOUNT_COOKIE.length + 1);
  if (!value) return undefined;
  try {
    const code = decodeURIComponent(value);
    return /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : undefined;
  } catch {
    return undefined;
  }
}
export function trackingContext(request: Request, country: string, locale: string) {
  const headers = new Headers(request.headers);
  headers.set(
    "cookie",
    (headers.get("cookie") ?? "")
      .split(";")
      .filter((c) => /^\s*(?:_shopify_|_tracking_consent|localization|cart)/.test(c))
      .join(";"),
  );
  const safe = { url: request.url, method: request.method, signal: request.signal, headers };
  return createShopifyRequestContext({
    request: safe,
    i18n: { country: country as I18nConfig["country"], language: locale === "zh" ? "ZH_CN" : "EN" },
  });
}
export function storefrontClient(request: Request) {
  const context = trackingContext(
    request,
    pickCountry(request.headers, env.SHOPIFY_MARKET_COUNTRY),
    "en",
  );
  const client = createStorefrontClient({
    type: "public",
    requestContext: context,
    config: {
      storeDomain: env.SHOPIFY_STORE_DOMAIN ?? "",
      publicStorefrontToken: env.SHOPIFY_STOREFRONT_TOKEN,
      apiVersion: env.SHOPIFY_API_VERSION,
      storefrontId: env.SHOPIFY_STOREFRONT_ID,
      defaultTimeoutInMs: 10000,
    },
  });
  return { client, context };
}
/** Exposes only first-party analytics/consent endpoints, never arbitrary Shopify administration. */
export function isTrackingPath(path: string) {
  return (
    /^\/api\/(?:unstable|2\d{3}-\d{2})\/graphql\.json$/.test(path) ||
    /^\/__shopify\/(?:collect|api\/(?:collect|(?:unstable|2\d{3}-\d{2})\/graphql\.json)|services\/privacy_consent)(?:\/|$)/.test(
      path,
    )
  );
}
export async function trackingProxy(request: Request) {
  if (!collabsMode() || !isShopifyConfigured() || !isTrackingPath(new URL(request.url).pathname))
    return new Response("Not found", { status: 404 });
  if (!["GET", "POST", "HEAD", "OPTIONS"].includes(request.method))
    return new Response(null, { status: 405 });
  // Authentication cookies and Offy application headers never leave our origin.
  const headers = new Headers(request.headers);
  const cookies = (headers.get("cookie") ?? "")
    .split(";")
    .filter((c) => /^\s*(?:_shopify_|_tracking_consent|localization|cart)/.test(c))
    .join(";");
  headers.set("cookie", cookies);
  for (const name of [...headers.keys()])
    if (
      name.startsWith("x-offy-") ||
      name === "authorization" ||
      name.startsWith("x-shopify-access-token")
    )
      headers.delete(name);
  const safe = new Request(request, { headers }),
    { client, context } = storefrontClient(safe);
  return (
    (await handleShopifyRoutes({
      request: safe,
      requestContext: context,
      storefrontClient: client,
    })) ?? new Response("Not found", { status: 404 })
  );
}
export function discountRedirect(request: Request, code: string) {
  if (!collabsMode()) return new Response("Not found", { status: 404 });
  try {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) throw new Error();
    const source = new URL(request.url),
      target = new URL(
        safeStorefrontTarget(source.searchParams.get("redirect") || "/"),
        source.origin,
      );
    for (const [key, value] of source.searchParams)
      if (key !== "redirect" && !target.searchParams.has(key)) target.searchParams.set(key, value);
    const response = NextResponse.redirect(target, {
      status: 303,
      headers: { "Cache-Control": "no-store, private" },
    });
    response.cookies.set(DISCOUNT_COOKIE, code, {
      httpOnly: true,
      secure: source.protocol === "https:",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return new Response("Invalid discount link", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function resolveCollabsRedirect(path: string): Promise<string | null> {
  const { handleShopifyRedirects } = await import("@shopify/hydrogen");
  const request = new Request(new URL(safeStorefrontTarget(path), env.SITE_URL));
  const { client } = storefrontClient(request);
  const response = await handleShopifyRedirects({
    request,
    storefrontClient: client,
    routeTemplates: {
      product: "/products/:productHandle",
      collection: "/collections/:collectionHandle",
      cart: "/cart",
    },
  });
  return response?.headers.get("location") ?? null;
}
