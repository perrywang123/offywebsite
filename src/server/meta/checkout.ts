import { env } from "@/lib/env";
import { checkoutContextSchema } from "@/lib/meta/events";
import { getMetaDb } from "./runtime";
import { acceptEvent } from "./store";
import { metaConfig } from "./config";
import { diagnosticKey } from "../checkout-diagnostics/crypto";
/** Only local evidence after a successful Shopify response. Must never throw into checkout. */
export function recordCheckoutReady(attemptId: string | undefined, raw: unknown, headers: Headers) {
  try {
    if (
      !attemptId ||
      !metaConfig().enabled ||
      headers.get("sec-gpc") === "1" ||
      headers.get("origin") !== new URL(env.SITE_URL).origin
    )
      return;
    const parsed = checkoutContextSchema.safeParse(raw);
    if (!parsed.success) return;
    acceptEvent(
      getMetaDb(),
      {
        ...parsed.data,
        eventId: attemptId,
        occurredAt: Date.now(),
        name: "CheckoutReady",
        consent: true,
        pixelAttempted: false,
      },
      {
        key: diagnosticKey(),
        capi: false,
        origin: new URL(env.SITE_URL).origin,
        attemptId,
      },
    );
    return parsed.data.visitorId;
  } catch {
    /* evidence remains optional, not a condition of checkout */
  }
}
