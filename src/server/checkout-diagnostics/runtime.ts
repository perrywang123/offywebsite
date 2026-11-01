import { countryDecision } from "@/lib/geo";
import { env } from "@/lib/env";
import { getDb } from "../db/client";
import { claimAttempt, cleanupAttempts, finishAttempt, observeAttempt } from "./store";
import type { CreateCheckoutResult, CheckoutItemInput } from "../payments/types";
import type { CheckoutObserver } from "@/lib/checkout-diagnostics";

let lastCleanup = 0;
export function maintainDiagnostics() {
  if (Date.now() - lastCleanup < 3600_000) return;
  try {
    cleanupAttempts(getDb());
    lastCleanup = Date.now();
  } catch {
    console.warn("checkout_diagnostic_cleanup_failed");
  }
}
export function startCheckoutRecording(
  headers: Headers,
  items: CheckoutItemInput[],
  locale: string,
  receipt?: string,
) {
  try {
    maintainDiagnostics();
    const db = getDb(),
      attempt = claimAttempt(db, receipt, {
        items,
        locale,
        pagePath: "/api/payments/checkout",
        country: countryDecision(headers, env.SHOPIFY_MARKET_COUNTRY),
      });
    const observe: CheckoutObserver = (observation) => {
      try {
        observeAttempt(db, attempt.id, observation);
      } catch {
        console.warn("checkout_diagnostic_write_failed");
      }
    };
    return {
      id: attempt.id,
      observe,
      finish: (result: CreateCheckoutResult) => {
        try {
          finishAttempt(db, attempt.id, result);
        } catch {
          console.warn("checkout_diagnostic_write_failed");
        }
      },
    };
  } catch {
    console.warn("checkout_diagnostic_write_failed");
    return undefined;
  }
}
