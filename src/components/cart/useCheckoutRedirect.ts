"use client";
import { useCallback, useRef, useState } from "react";
import { referralTicket } from "@/components/kol/ReferralBridge";
import { checkoutRedirectUrl } from "@/lib/checkout-redirect";
import { useLocale } from "next-intl";
export interface CheckoutItemInput {
  code: string;
  quantity: number;
}
export interface CheckoutBlockedItem {
  code: string;
  reason?: "unknown_items" | "unavailable_items";
}
export interface CheckoutRedirectState {
  pending: boolean;
  failed: boolean;
  blocked: CheckoutBlockedItem[] | null;
  startCheckout: (items: CheckoutItemInput[]) => Promise<void>;
}
/** Fresh client verification + server-authoritative checkout. Failure stays on the current page. */
export function useCheckoutRedirect(verify?: () => Promise<boolean>): CheckoutRedirectState {
  const locale = useLocale(),
    inFlight = useRef(false);
  const [pending, setPending] = useState(false),
    [failed, setFailed] = useState(false),
    [blocked, setBlocked] = useState<CheckoutBlockedItem[] | null>(null);
  const startCheckout = useCallback(
    async (items: CheckoutItemInput[]) => {
      if (inFlight.current || !items.length) return;
      inFlight.current = true;
      setPending(true);
      setFailed(false);
      setBlocked(null);
      try {
        if (verify && !(await verify())) throw new Error("catalog_unavailable");
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            provider: "shopify",
            items,
            locale,
            referralTicket: referralTicket(),
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          const target = checkoutRedirectUrl(data?.redirect);
          if (target) {
            window.location.assign(target);
            return;
          }
        } else if (res.status >= 400 && res.status < 500) {
          setBlocked(
            Array.isArray(data?.items)
              ? data.items.filter((i: CheckoutBlockedItem) => typeof i?.code === "string")
              : [],
          );
          inFlight.current = false;
          setPending(false);
          return;
        }
        throw new Error("checkout_unavailable");
      } catch {
        setFailed(true);
        inFlight.current = false;
        setPending(false);
      }
    },
    [locale, verify],
  );
  return { pending, failed, blocked, startCheckout };
}
