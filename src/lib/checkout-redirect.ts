/** Both shopping entry points must reject missing/malformed redirects and remain retryable. */
export function checkoutRedirectUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const redirect = value as Record<string, unknown>;
  const target = redirect.kind === "approve" ? redirect.approveUrl : redirect.url;
  if (typeof target !== "string") return undefined;
  try {
    const url = new URL(target);
    const localTest =
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_OFFY_INTEGRATION_TEST === "true" &&
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.startsWith("/checkout/");
    return url.protocol === "https:" || (localTest && url.protocol === "http:")
      ? target
      : undefined;
  } catch {
    return undefined;
  }
}
