import type { CheckoutItemInput, ClientCheckoutObservation } from "@/lib/checkout-diagnostics";

export async function beginCheckoutAttempt(
  items: CheckoutItemInput[],
  locale: string,
): Promise<string | undefined> {
  try {
    const response = await fetch("/api/checkout/attempts", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        items,
        locale,
        pagePath: new URL(window.location.href).pathname,
      }),
    });
    if (!response.ok) return;
    const data = await response.json();
    return typeof data.receipt === "string" ? data.receipt : undefined;
  } catch {
    return;
  }
}
export function reportCheckoutObservation(
  receipt: string | undefined,
  type: ClientCheckoutObservation,
) {
  if (!receipt) return;
  void fetch("/api/checkout/attempts", {
    method: "POST",
    cache: "no-store",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "observe", receipt, type }),
  }).catch(() => {});
}
