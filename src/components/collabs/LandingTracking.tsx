"use client";
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isLandingPath } from "@/lib/collabs/landing-path";
function Tracker() {
  const pathname = usePathname(),
    search = useSearchParams();
  const view = useRef<{ key: string; id: string; sent: boolean } | null>(null),
    previousConsent = useRef<boolean | undefined>(undefined),
    pending = useRef<AbortController | null>(null);
  useEffect(() => {
    const key = pathname + "?" + search.toString();
    let attempts = 0;
    const check = () => {
      let allowed: boolean | undefined;
      try {
        const privacy = window.Shopify?.customerPrivacy;
        if (!privacy?.analyticsProcessingAllowed || privacy.consentStatus === "loading") return;
        allowed =
          privacy.analyticsProcessingAllowed() === true &&
          !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
      } catch {
        return;
      }
      if (!allowed) {
        if (previousConsent.current !== false) {
          try {
            pending.current?.abort();
            void fetch("/api/collabs/landing", {
              method: "DELETE",
              credentials: "same-origin",
              keepalive: true,
            }).catch(() => {});
          } catch {
            /* Consent withdrawal cannot block the storefront. */
          }
        }
        previousConsent.current = false;
        return;
      }
      previousConsent.current = true;
      try {
        const ids = search.getAll("dt_id");
        if (ids.length !== 1 || !/^[A-Za-z0-9_-]{1,128}$/.test(ids[0]) || !isLandingPath(pathname))
          return;
        if (view.current?.key !== key) view.current = { key, id: crypto.randomUUID(), sent: false };
        if (view.current.sent) return;
        view.current.sent = true;
        const controller = new AbortController();
        pending.current = controller;
        void fetch("/api/collabs/landing", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          keepalive: true,
          signal: controller.signal,
          body: JSON.stringify({
            version: 1,
            dtId: ids[0],
            eventId: view.current.id,
            path: pathname,
            analyticsAllowed: true,
          }),
        }).catch(() => {});
      } catch {
        /* Observation APIs must never escape into the storefront UI. */
      }
    };
    check();
    const timer = setInterval(() => {
      check();
      if (++attempts >= 40) clearInterval(timer);
    }, 250);
    document.addEventListener("visitorConsentCollected", check);
    document.addEventListener("shopifyCustomerPrivacyApiLoaded", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visitorConsentCollected", check);
      document.removeEventListener("shopifyCustomerPrivacyApiLoaded", check);
    };
  }, [pathname, search]);
  return null;
}
/** Independent best-effort first-party observer; never modifies Shopify's own analytics bus. */
export function CollabsLandingTracking() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
