"use client";
import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ShopifyScripts } from "@shopify/hydrogen/react";
import { AnalyticsEvent, type I18nConfig } from "@shopify/hydrogen";

type Props = { shopId: string; storefrontId: string; domain: string; country: string };
/** Official consent-gated analytics. A tracking failure never blocks shopping. */
export function ShopifyTrackingScripts({ shopId, storefrontId, domain, country }: Props) {
  const router = useRouter();
  return (
    <ShopifyScripts
      shop={{ shopId, storefrontId, myshopifyDomain: domain }}
      analytics={{ channel: "headless" }}
      consent={{ mode: "default-banner" }}
      i18n={{ country: country as I18nConfig["country"], language: "EN" }}
      webMcp={false}
      navigate={(url) => router.push(url)}
      routes={{
        product: "/products/:productHandle",
        collection: "/collections/:collectionHandle",
        collectionList: "/products",
        cart: "/cart",
        policy: "/policies/:policyHandle",
      }}
    />
  );
}
function Tracker() {
  const pathname = usePathname(),
    search = useSearchParams(),
    last = useRef("");
  useEffect(() => {
    const key = pathname + "?" + search.toString();
    let attempts = 0;
    const publish = () => {
      try {
        const bus = window.Shopify?.analytics;
        if (!bus) return false;
        if (last.current !== key) {
          bus.publish(AnalyticsEvent.PAGE_VIEWED);
          last.current = key;
        }
        return true;
      } catch {
        return false;
      }
    };
    if (publish()) return;
    const timer = setInterval(() => {
      if (publish() || ++attempts > 40) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [pathname, search]);
  return null;
}
export function ShopifyPageTracking() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
