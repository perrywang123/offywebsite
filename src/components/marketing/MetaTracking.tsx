"use client";
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  configureMeta,
  observeMeta,
  checkMetaConsent,
  metaAllowed,
  registerMetaProducts,
  metaCartData,
  type MetaPublicConfig,
} from "./runtime";
import type { MetaProduct } from "@/lib/meta/events";
function Tracking({ config }: { config: MetaPublicConfig }) {
  const pathname = usePathname(),
    search = useSearchParams(),
    last = useRef("");
  useEffect(() => {
    if (!config.enabled) return;
    const page = pathname + "?" + search.toString();
    const view = () => {
      if (metaAllowed() && last.current !== page && observeMeta("PageView", {}))
        last.current = page;
    };
    const check = () => {
      checkMetaConsent();
      view();
    };
    document.addEventListener("offy:meta-ready", view);
    document.addEventListener("visitorConsentCollected", check);
    document.addEventListener("shopifyCustomerPrivacyApiLoaded", check);
    configureMeta(config);
    view();
    let tries = 0;
    const timer = setInterval(() => {
      check();
      if (window.Shopify?.customerPrivacy || ++tries >= 60) clearInterval(timer);
    }, 1000);
    return () => {
      clearInterval(timer);
      document.removeEventListener("offy:meta-ready", view);
      document.removeEventListener("visitorConsentCollected", check);
      document.removeEventListener("shopifyCustomerPrivacyApiLoaded", check);
    };
  }, [config, pathname, search]);
  return null;
}
export function MetaTracking({ config }: { config: MetaPublicConfig }) {
  return (
    <Suspense fallback={null}>
      <Tracking config={config} />
    </Suspense>
  );
}
export function MetaProductView({ product }: { product: MetaProduct }) {
  const sent = useRef(false);
  useEffect(() => {
    registerMetaProducts([product]);
    const publish = () => {
      if (!sent.current && observeMeta("ViewContent", metaCartData([product]))) sent.current = true;
    };
    publish();
    document.addEventListener("offy:meta-ready", publish);
    return () => document.removeEventListener("offy:meta-ready", publish);
  }, [product]);
  return null;
}
