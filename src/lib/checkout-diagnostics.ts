/** Shared serializable contracts. No database, geo-IP library or credentials in client bundles. */
export interface CheckoutItemInput {
  code: string;
  quantity: number;
}
export type CheckoutDiagnosticEvent = {
  type: "catalog_checked" | "shopify_request" | "shopify_response" | "shopify_transport_failed";
  data: unknown;
};
export type CheckoutObserver = (event: CheckoutDiagnosticEvent) => void;
export function observeCheckout(
  observer: CheckoutObserver | undefined,
  event: CheckoutDiagnosticEvent,
) {
  try {
    observer?.(event);
  } catch {
    console.warn("checkout_diagnostic_write_failed");
  }
}
export type ClientCheckoutObservation =
  "client_verification_failed" | "client_timeout" | "client_error" | "redirect_requested";
export type DiagnosticStatus =
  "started" | "client_failed" | "processing" | "failed" | "redirect_ready";
export interface DiagnosticSummary {
  itemNames?: Record<string, string>;
  warningCount?: number;
  id: string;
  createdAt: number;
  updatedAt: number;
  status: DiagnosticStatus;
  country: string;
  countryEvidence: {
    country: string;
    source: string;
    persisted?: boolean;
    timeZone?: string;
    header?: string | null;
    candidates: { header: string; value: string }[];
    ipSource: string | null;
    fallback: string;
  };
  items: { code: string; quantity: number }[];
  locale: string;
  pagePath: string;
  error: string | null;
  durationMs: number | null;
  redirectHost: string | null;
  sensitiveExpiresAt: number;
}
export interface DiagnosticDetail extends DiagnosticSummary {
  events: { id: number; at: number; type: string; data: unknown }[];
}
export interface DiagnosticList {
  rows: DiagnosticSummary[];
  total: number;
  page: number;
  pageSize: number;
}
